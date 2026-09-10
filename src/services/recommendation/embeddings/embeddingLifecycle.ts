import type { ClothingItem } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import { isSupabaseConfigured } from '../../supabase';
import { invalidateCachedEmbedding } from './embeddingCache';
import {
  clothingItemToSourceFields,
  clothingRowToSourceFields,
  fingerprintEmbeddingSource,
} from './embeddingFingerprint';
import { deleteItemEmbeddingRecords } from './embeddingRepository';
import { scheduleItemEmbedding } from './embeddingService';

type ClothingRowLike = Parameters<typeof clothingRowToSourceFields>[0] & {
  id: string;
  created_at?: string;
  status?: string;
  notes?: string | null;
  brand?: string | null;
  formality_score?: number | null;
  worn_count?: number | null;
  last_worn?: string | null;
  colors_hsl?: ClothingItem['colorsHsl'] | null;
};

function clothingStatus(value: string | undefined): ClothingItem['status'] {
  if (value === 'archived' || value === 'donated' || value === 'active') return value;
  return 'active';
}

function clothingGender(value: string | null | undefined): ClothingItem['genderAffinity'] {
  if (value === 'men' || value === 'women' || value === 'unisex') return value;
  return undefined;
}

function fingerprintsDiffer(
  previous: ReturnType<typeof clothingItemToSourceFields>,
  next: ReturnType<typeof clothingItemToSourceFields>
): boolean {
  return fingerprintEmbeddingSource(previous) !== fingerprintEmbeddingSource(next);
}

function rowToSchedulableItem(row: ClothingRowLike): ClothingItem {
  const colors = row.colors ?? [];
  return {
    id: row.id,
    imageUrl: row.image_path ?? '',
    category: row.category ?? 'unknown',
    subCategory: row.sub_category ?? undefined,
    colors,
    colorsHsl: row.colors_hsl?.length ? row.colors_hsl : namedColorsToHsl(colors),
    brand: row.brand ?? undefined,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    material: row.material ?? undefined,
    pattern: row.pattern ?? undefined,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    lastWorn: row.last_worn ?? undefined,
    wornCount: row.worn_count ?? undefined,
    season: row.season ?? undefined,
    status: clothingStatus(row.status),
    formalityScore: row.formality_score ?? undefined,
    genderAffinity: clothingGender(row.gender_affinity),
    occasionTags: row.occasion_tags ?? undefined,
  };
}

/**
 * Item create/update/delete hooks. Generation is fire-and-forget and non-fatal.
 */
export function onClientItemUpdated(previous: ClothingItem, next: ClothingItem): void {
  try {
    if (!fingerprintsDiffer(clothingItemToSourceFields(previous), clothingItemToSourceFields(next))) {
      return;
    }
    invalidateCachedEmbedding(next.id);
    if (!isSupabaseConfigured()) return;
    scheduleItemEmbedding(next);
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] client update hook failed', err instanceof Error ? err.message : err);
    }
  }
}

export function onClothingRowUpdated(previous: ClothingRowLike, next: ClothingRowLike): void {
  try {
    if (!fingerprintsDiffer(clothingRowToSourceFields(previous), clothingRowToSourceFields(next))) {
      return;
    }
    invalidateCachedEmbedding(next.id);
    if (!isSupabaseConfigured()) return;
    scheduleItemEmbedding(rowToSchedulableItem(next));
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] row update hook failed', err instanceof Error ? err.message : err);
    }
  }
}

export function onClothingItemDeleted(itemId: string): void {
  try {
    invalidateCachedEmbedding(itemId);
    if (!isSupabaseConfigured()) return;
    void deleteItemEmbeddingRecords(itemId);
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] delete hook failed', err instanceof Error ? err.message : err);
    }
  }
}

export function onEmbeddingSourceChanged(row: ClothingRowLike): void {
  try {
    invalidateCachedEmbedding(row.id);
    if (!isSupabaseConfigured()) return;
    scheduleItemEmbedding(rowToSchedulableItem(row));
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] source-change hook failed', err instanceof Error ? err.message : err);
    }
  }
}

/**
 * Scan inserts a placeholder (`category: unknown`, no tags) then `tag-item`
 * writes the first real vector. Scheduling here would race that write with a
 * weak "unknown" embedding.
 */
export function hasSchedulableEmbeddingSource(item: ClothingItem): boolean {
  const category = (item.category ?? '').trim().toLowerCase();
  if (category.length > 0 && category !== 'unknown') return true;
  if ((item.subCategory ?? '').trim().length > 0) return true;
  if ((item.colors?.length ?? 0) > 0) return true;
  if ((item.tags?.length ?? 0) > 0) return true;
  if ((item.material ?? '').trim().length > 0) return true;
  if ((item.pattern ?? '').trim().length > 0) return true;
  return false;
}

export function onClothingItemCreated(item: ClothingItem): void {
  try {
    if (!isSupabaseConfigured()) return;
    if (!hasSchedulableEmbeddingSource(item)) return;
    scheduleItemEmbedding(item);
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] create hook failed', err instanceof Error ? err.message : err);
    }
  }
}

export function onClothingRowCreated(row: ClothingRowLike): void {
  try {
    onClothingItemCreated(rowToSchedulableItem(row));
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] row create hook failed', err instanceof Error ? err.message : err);
    }
  }
}
