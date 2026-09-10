import { getSupabase, isSupabaseConfigured } from '../../supabase';
import { EMBEDDING_FETCH_CHUNK } from './embeddingConfig';
import { parseEmbedding } from './embeddingParse';
import type { EmbeddingMetadata, ItemEmbeddingRecord } from './embeddingTypes';

export function chunkIds(ids: string[], chunkSize: number = EMBEDDING_FETCH_CHUNK): string[][] {
  if (chunkSize <= 0) return ids.length > 0 ? [ids] : [];
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }
  return chunks;
}

const inflightFetches = new Map<string, Promise<ItemEmbeddingRecord | null>>();

export function parseEmbeddingMetadata(value: unknown): Partial<EmbeddingMetadata> {
  if (!value || typeof value !== 'object') return {};
  const row = value as Record<string, unknown>;
  return {
    model: typeof row.model === 'string' ? row.model : undefined,
    dimensions: typeof row.dimensions === 'number' ? row.dimensions : undefined,
    version: typeof row.version === 'string' ? row.version : undefined,
    sourceHash: typeof row.sourceHash === 'string' ? row.sourceHash : undefined,
    source: typeof row.source === 'string' ? row.source : undefined,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
  };
}

export function rowToEmbeddingRecord(row: {
  entity_id?: unknown;
  embedding?: unknown;
  metadata?: unknown;
  created_at?: unknown;
}): ItemEmbeddingRecord | null {
  const entityId = typeof row.entity_id === 'string' ? row.entity_id : null;
  const vector = parseEmbedding(row.embedding);
  if (!entityId || !vector) return null;
  const meta = parseEmbeddingMetadata(row.metadata);
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString();
  return {
    entityId,
    entityType: 'item',
    embedding: vector,
    model: meta.model ?? '',
    dimensions: meta.dimensions ?? vector.length,
    version: meta.version ?? '',
    sourceHash: meta.sourceHash,
    createdAt,
    updatedAt: meta.updatedAt ?? createdAt,
  };
}

export interface EmbeddingRepositoryDeps {
  fetchRecords?: (ids: string[]) => Promise<ItemEmbeddingRecord[]>;
}

async function fetchRecordsFromSupabase(ids: string[]): Promise<ItemEmbeddingRecord[]> {
  if (ids.length === 0 || !isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const result: ItemEmbeddingRecord[] = [];
  try {
    for (const chunk of chunkIds(ids, EMBEDDING_FETCH_CHUNK)) {
      const { data, error } = await supabase
        .from('embeddings')
        .select('entity_id, embedding, metadata, created_at')
        .eq('entity_type', 'item')
        .in('entity_id', chunk);

      if (error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[embeddings] fetch', error.message);
        }
        return result;
      }

      for (const row of data ?? []) {
        const record = rowToEmbeddingRecord(row);
        if (record) result.push(record);
      }
    }
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] fetch unexpected', err);
    }
  }
  return result;
}

/**
 * Batched, deduplicated record fetch. Concurrent callers for the same item
 * share one in-flight promise; rejected promises are dropped.
 */
export async function fetchEmbeddingRecords(
  itemIds: string[],
  deps: EmbeddingRepositoryDeps = {}
): Promise<ItemEmbeddingRecord[]> {
  const uniqueIds = [...new Set(itemIds.filter((id) => id.length > 0))];
  if (uniqueIds.length === 0) return [];

  const waiters: Promise<ItemEmbeddingRecord | null>[] = [];
  const needFetch: string[] = [];

  for (const id of uniqueIds) {
    const pending = inflightFetches.get(id);
    if (pending) {
      waiters.push(pending);
    } else {
      needFetch.push(id);
    }
  }

  if (needFetch.length > 0) {
    const loader = deps.fetchRecords ?? fetchRecordsFromSupabase;
    const batchPromise = loader(needFetch);
    for (const id of needFetch) {
      const perItem = batchPromise
        .then((records) => records.find((record) => record.entityId === id) ?? null)
        .finally(() => {
          inflightFetches.delete(id);
        });
      inflightFetches.set(id, perItem);
      waiters.push(perItem);
    }
    batchPromise.catch(() => {
      for (const id of needFetch) inflightFetches.delete(id);
    });
  }

  const resolved = await Promise.all(waiters);
  return resolved.filter((record): record is ItemEmbeddingRecord => record !== null);
}

export async function upsertItemEmbeddingRecord(input: {
  userId: string;
  record: ItemEmbeddingRecord;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('embeddings').upsert(
      {
        user_id: input.userId,
        entity_type: 'item',
        entity_id: input.record.entityId,
        embedding: input.record.embedding,
        metadata: {
          model: input.record.model,
          dimensions: input.record.dimensions,
          version: input.record.version,
          sourceHash: input.record.sourceHash,
          source: 'client-lifecycle',
          updatedAt: input.record.updatedAt,
        },
      },
      { onConflict: 'user_id,entity_type,entity_id' }
    );
    if (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[embeddings] upsert failed', error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] upsert unexpected', err);
    }
    return false;
  }
}

export async function deleteItemEmbeddingRecords(entityId: string): Promise<void> {
  if (!entityId || !isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('embeddings')
      .delete()
      .eq('entity_type', 'item')
      .eq('entity_id', entityId);
    if (error && typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] delete failed', error.message);
    }
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] delete unexpected', err);
    }
  }
}

export function resetEmbeddingFetchInflightForTests(): void {
  inflightFetches.clear();
}
