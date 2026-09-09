import { getSupabase, isSupabaseConfigured } from '../supabase';
import type { ItemEmbeddingMap } from './types';

const FETCH_CHUNK = 100;

export function parseEmbedding(value: unknown): number[] | null {
  const isFiniteNumber = (entry: unknown): entry is number =>
    typeof entry === 'number' && Number.isFinite(entry);

  if (Array.isArray(value) && value.length > 0 && value.every(isFiniteNumber)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parseEmbedding(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Best-effort load of item vectors. Never throws; never logs the vectors.
 * Callers inject the map into RecommendationRequest — the engine stays sync.
 */
export async function fetchItemEmbeddings(itemIds: string[]): Promise<ItemEmbeddingMap> {
  const uniqueIds = [...new Set(itemIds.filter((id) => id.length > 0))];
  if (uniqueIds.length === 0 || !isSupabaseConfigured()) return {};

  const supabase = getSupabase();
  if (!supabase) return {};

  const result: ItemEmbeddingMap = {};

  try {
    for (let index = 0; index < uniqueIds.length; index += FETCH_CHUNK) {
      const chunk = uniqueIds.slice(index, index + FETCH_CHUNK);
      const { data, error } = await supabase
        .from('embeddings')
        .select('entity_id, embedding')
        .eq('entity_type', 'item')
        .in('entity_id', chunk);

      if (error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[embeddings] fetch', error.message);
        }
        return result;
      }

      for (const row of data ?? []) {
        const entityId =
          row && typeof row === 'object' && 'entity_id' in row && typeof row.entity_id === 'string'
            ? row.entity_id
            : null;
        const vector =
          row && typeof row === 'object' && 'embedding' in row ? parseEmbedding(row.embedding) : null;
        if (entityId && vector) {
          result[entityId] = vector;
        }
      }
    }
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] fetch unexpected', err);
    }
  }

  return result;
}
