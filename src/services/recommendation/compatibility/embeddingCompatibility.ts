import type { ClothingItem } from '../../../types';
import { cosineSimilarity } from '../../vectorSimilarity';
import { relevantPairs } from './pairSlots';
import type { ItemEmbeddingMap, RecommendationRequest } from '../types';

/** Same band as missing weather — not a fashion judgement. */
export const NEUTRAL_EMBEDDING_SCORE = 70;

export function hasItemEmbeddings(map?: ItemEmbeddingMap | null): boolean {
  if (!map) return false;
  return Object.values(map).some((vector) => Array.isArray(vector) && vector.length > 0);
}

export function cosineToUnitScore(similarity: number): number {
  if (!Number.isFinite(similarity)) return NEUTRAL_EMBEDDING_SCORE;
  const clamped = Math.max(-1, Math.min(1, similarity));
  return Math.round(((clamped + 1) / 2) * 100);
}

export function scoreEmbeddingPair(
  leftId: string,
  rightId: string,
  embeddings?: ItemEmbeddingMap
): { score: number; used: boolean } {
  const left = embeddings?.[leftId];
  const right = embeddings?.[rightId];
  if (!left || !right || left.length === 0 || right.length === 0) {
    return { score: NEUTRAL_EMBEDDING_SCORE, used: false };
  }
  if (left.length !== right.length) {
    return { score: NEUTRAL_EMBEDDING_SCORE, used: false };
  }
  return {
    score: cosineToUnitScore(cosineSimilarity(left, right)),
    used: true,
  };
}

export interface OutfitEmbeddingCompatibility {
  score: number;
  used: boolean;
  pairCount: number;
}

/**
 * Pairwise embedding similarity on the same slots as colour/formality.
 * Missing vectors → unused, so callers keep the Sprint 2 compatibility formula.
 */
export function scoreOutfitEmbeddingCompatibility(
  items: ClothingItem[],
  embeddings?: ItemEmbeddingMap
): OutfitEmbeddingCompatibility {
  if (!hasItemEmbeddings(embeddings) || items.length < 2) {
    return { score: NEUTRAL_EMBEDDING_SCORE, used: false, pairCount: 0 };
  }

  const pairs = relevantPairs(items);
  if (pairs.length === 0) {
    return { score: NEUTRAL_EMBEDDING_SCORE, used: false, pairCount: 0 };
  }

  const scored = pairs.map((pair) => scoreEmbeddingPair(pair.left.id, pair.right.id, embeddings));
  const usedPairs = scored.filter((entry) => entry.used);
  if (usedPairs.length === 0) {
    return { score: NEUTRAL_EMBEDDING_SCORE, used: false, pairCount: pairs.length };
  }

  const total = usedPairs.reduce((sum, entry) => sum + entry.score, 0);
  return {
    score: Math.round(total / usedPairs.length),
    used: true,
    pairCount: usedPairs.length,
  };
}

/**
 * Retrieval aid: similarity to must-include anchors that have vectors.
 * Returns null when embeddings cannot influence this item.
 */
export function scoreItemEmbeddingAffinity(
  item: ClothingItem,
  request: Pick<RecommendationRequest, 'itemEmbeddings' | 'mustIncludeItemIds'>
): number | null {
  const embeddings = request.itemEmbeddings;
  const itemVector = embeddings?.[item.id];
  if (!itemVector || itemVector.length === 0) return null;

  const anchorIds = request.mustIncludeItemIds ?? [];
  if (anchorIds.length === 0) return null;
  if (anchorIds.includes(item.id)) return 100;

  const anchors = anchorIds
    .map((id) => embeddings?.[id])
    .filter((vector): vector is number[] => Array.isArray(vector) && vector.length === itemVector.length);

  if (anchors.length === 0) return null;

  const best = Math.max(...anchors.map((anchor) => cosineSimilarity(itemVector, anchor)));
  return cosineToUnitScore(best);
}

export function combinePreliminaryScore(slotScore: number, embeddingAffinity: number | null): number {
  if (embeddingAffinity == null) return slotScore;
  return slotScore * 0.75 + embeddingAffinity * 0.25;
}
