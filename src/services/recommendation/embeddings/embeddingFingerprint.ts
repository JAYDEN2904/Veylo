import type { ClothingItem } from '../../../types';

/**
 * Canonical fields that participate in an item's embedding source.
 * Wear counts, notes, brand, timestamps, and signed-URL tokens are excluded.
 */
export interface EmbeddingSourceFields {
  category: string;
  subCategory: string;
  colors: string[];
  tags: string[];
  material: string;
  pattern: string;
  season: string[];
  genderAffinity: string;
  occasionTags: string[];
  imageIdentity: string;
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeList(values: string[] | null | undefined): string[] {
  return [...(values ?? [])]
    .map((value) => normalizeToken(value))
    .filter((value) => value.length > 0)
    .sort();
}

/**
 * Stable photo identity. Signed URLs change; the storage path does not.
 */
export function imageIdentityFromUrlOrPath(urlOrPath: string | null | undefined): string {
  if (!urlOrPath) return '';
  const withoutQuery = urlOrPath.split('?')[0].replace(/\\/g, '/');
  const lower = withoutQuery.toLowerCase();
  const marker = '/item-photos/';
  const markerIndex = lower.indexOf(marker);
  if (markerIndex >= 0) {
    return withoutQuery.slice(markerIndex + marker.length).toLowerCase();
  }
  const parts = withoutQuery.split('/').filter(Boolean);
  return (parts[parts.length - 1] ?? '').toLowerCase();
}

export function clothingItemToSourceFields(item: ClothingItem): EmbeddingSourceFields {
  return {
    category: normalizeToken(item.category),
    subCategory: normalizeToken(item.subCategory),
    colors: normalizeList(item.colors),
    tags: normalizeList(item.tags),
    material: normalizeToken(item.material),
    pattern: normalizeToken(item.pattern),
    season: normalizeList(item.season),
    genderAffinity: normalizeToken(item.genderAffinity),
    occasionTags: normalizeList(item.occasionTags),
    imageIdentity: imageIdentityFromUrlOrPath(item.imageUrl),
  };
}

export function clothingRowToSourceFields(row: {
  category?: string | null;
  sub_category?: string | null;
  colors?: string[] | null;
  tags?: string[] | null;
  material?: string | null;
  pattern?: string | null;
  season?: string[] | null;
  gender_affinity?: string | null;
  occasion_tags?: string[] | null;
  image_path?: string | null;
}): EmbeddingSourceFields {
  return {
    category: normalizeToken(row.category),
    subCategory: normalizeToken(row.sub_category),
    colors: normalizeList(row.colors),
    tags: normalizeList(row.tags),
    material: normalizeToken(row.material),
    pattern: normalizeToken(row.pattern),
    season: normalizeList(row.season),
    genderAffinity: normalizeToken(row.gender_affinity),
    occasionTags: normalizeList(row.occasion_tags),
    imageIdentity: imageIdentityFromUrlOrPath(row.image_path),
  };
}

/**
 * Stable serialization used for fingerprinting.
 * Image identity is included so a new photo invalidates the vector even though
 * the current provider embeds garment text, not pixels.
 */
export function serializeEmbeddingSource(fields: EmbeddingSourceFields): string {
  return [
    'v1',
    fields.category,
    fields.subCategory,
    fields.colors.join(','),
    fields.tags.join(','),
    fields.material,
    fields.pattern,
    fields.season.join(','),
    fields.genderAffinity,
    fields.occasionTags.join(','),
    fields.imageIdentity,
  ].join('|');
}

/** Text actually sent to the embedding provider (no storage paths). */
export function buildEmbeddingInputText(fields: EmbeddingSourceFields): string {
  return [
    fields.category,
    fields.subCategory,
    fields.colors.join(' '),
    fields.material,
    fields.pattern,
    fields.tags.join(' '),
    fields.season.join(' '),
    fields.genderAffinity,
    fields.occasionTags.join(' '),
  ]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
}

/** FNV-1a 32-bit hex — sync, no crypto, deterministic. */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function fingerprintEmbeddingSource(fields: EmbeddingSourceFields): string {
  return fnv1aHex(serializeEmbeddingSource(fields));
}

export function fingerprintClothingItem(item: ClothingItem): string {
  return fingerprintEmbeddingSource(clothingItemToSourceFields(item));
}

export function fingerprintClothingRow(
  row: Parameters<typeof clothingRowToSourceFields>[0]
): string {
  return fingerprintEmbeddingSource(clothingRowToSourceFields(row));
}

export function embeddingSourceChanged(
  previous: ClothingItem | EmbeddingSourceFields,
  next: ClothingItem | EmbeddingSourceFields
): boolean {
  const prevFields = 'id' in previous ? clothingItemToSourceFields(previous) : previous;
  const nextFields = 'id' in next ? clothingItemToSourceFields(next) : next;
  return fingerprintEmbeddingSource(prevFields) !== fingerprintEmbeddingSource(nextFields);
}
