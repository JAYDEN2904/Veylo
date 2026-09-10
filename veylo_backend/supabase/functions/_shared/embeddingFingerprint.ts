/**
 * Must stay in sync with src/services/recommendation/embeddings/embeddingFingerprint.ts
 * and embeddingConfig.ts. Deno Edge cannot import the React Native module.
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_VERSION = '1.0.0';
export const EMBEDDING_DIMENSIONS = 1536;

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

export function sourceFieldsFromItemRow(row: {
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

export function isFiniteVector(vector: number[] | null | undefined, expectedDimensions: number): boolean {
  return (
    Array.isArray(vector) &&
    vector.length === expectedDimensions &&
    vector.every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}
