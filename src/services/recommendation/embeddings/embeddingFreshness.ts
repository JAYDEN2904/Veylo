import type { ClothingItem } from '../../../types';
import { resolveEmbeddingPolicy, type EmbeddingPolicy } from './embeddingConfig';
import { fingerprintClothingItem } from './embeddingFingerprint';
import type { EmbeddingStatus, ItemEmbeddingRecord } from './embeddingTypes';

export function isFiniteVector(vector: number[] | null | undefined): vector is number[] {
  return (
    Array.isArray(vector) &&
    vector.length > 0 &&
    vector.every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}

export function validateEmbeddingVector(
  vector: unknown,
  expectedDimensions: number
): vector is number[] {
  if (!Array.isArray(vector) || vector.length === 0) return false;
  if (vector.length !== expectedDimensions) return false;
  return vector.every((value) => typeof value === 'number' && Number.isFinite(value));
}

export function isEmbeddingFresh(
  item: ClothingItem,
  embedding: ItemEmbeddingRecord | null | undefined,
  policy?: Partial<EmbeddingPolicy>
): boolean {
  return embeddingFreshness(item, embedding, policy) === 'fresh';
}

export function embeddingFreshness(
  item: ClothingItem,
  embedding: ItemEmbeddingRecord | null | undefined,
  policy?: Partial<EmbeddingPolicy>
): EmbeddingStatus {
  if (!embedding) return 'missing';
  const resolved = resolveEmbeddingPolicy(policy);
  if (embedding.entityId !== item.id || embedding.entityType !== 'item') return 'stale';
  if (!isFiniteVector(embedding.embedding)) return 'invalid';
  if (embedding.embedding.length !== embedding.dimensions) return 'invalid';
  if (embedding.model !== resolved.model) return 'stale';
  if (embedding.dimensions !== resolved.dimensions) return 'stale';
  if (embedding.version !== resolved.version) return 'stale';
  if (!embedding.sourceHash || embedding.sourceHash !== fingerprintClothingItem(item)) {
    return 'stale';
  }
  return 'fresh';
}
