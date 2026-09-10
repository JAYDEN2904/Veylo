import type { ClothingItem } from '../../../types';
import { cosineSimilarity } from '../../vectorSimilarity';
import { styleFamiliesForItem } from '../compatibility/styleCompatibility';
import type { ItemEmbeddingMap } from '../types';
import { DIVERSITY_SIMILARITY_WEIGHTS } from './diversityConfig';

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function itemIdSet(items: ClothingItem[]): Set<string> {
  return new Set(items.map((entry) => entry.id));
}

export function outfitItemSignature(items: ClothingItem[]): string {
  return [...items.map((entry) => entry.id)].sort().join('|');
}

function primaryItemForCategory(items: ClothingItem[], category: string): ClothingItem | undefined {
  const matches = items
    .filter((entry) => entry.category === category)
    .sort((a, b) => a.id.localeCompare(b.id));
  return matches[0];
}

function subcategorySimilarity(a: ClothingItem[], b: ClothingItem[]): number {
  const categories = [...new Set([...a, ...b].map((entry) => entry.category))].sort();
  if (categories.length === 0) return 0;
  let scored = 0;
  let compared = 0;
  for (const category of categories) {
    const left = primaryItemForCategory(a, category);
    const right = primaryItemForCategory(b, category);
    if (!left || !right) continue;
    compared += 1;
    const leftSub = (left.subCategory ?? '').trim().toLowerCase();
    const rightSub = (right.subCategory ?? '').trim().toLowerCase();
    if (leftSub && rightSub && leftSub === rightSub) scored += 1;
    else if (!leftSub && !rightSub && left.category === right.category) scored += 0.6;
  }
  return compared === 0 ? 0 : scored / compared;
}

function colourSimilarity(a: ClothingItem[], b: ClothingItem[]): number {
  const names = (items: ClothingItem[]): Set<string> =>
    new Set(
      items.flatMap((entry) => entry.colors).map((color) => color.trim().toLowerCase()).filter(Boolean)
    );
  return jaccard(names(a), names(b));
}

function styleFamilySimilarity(a: ClothingItem[], b: ClothingItem[]): number {
  const families = (items: ClothingItem[]): Set<string> =>
    new Set(items.flatMap((entry) => styleFamiliesForItem(entry)));
  return jaccard(families(a), families(b));
}

function meanVector(items: ClothingItem[], embeddings?: ItemEmbeddingMap): number[] | null {
  if (!embeddings) return null;
  const vectors = items
    .map((entry) => embeddings[entry.id])
    .filter((vector): vector is number[] => Array.isArray(vector) && vector.length > 0);
  if (vectors.length === 0) return null;
  const dimensions = vectors[0].length;
  const usable = vectors.filter((vector) => vector.length === dimensions);
  if (usable.length === 0) return null;
  const mean = new Array(dimensions).fill(0);
  for (const vector of usable) {
    for (let index = 0; index < dimensions; index += 1) {
      mean[index] += vector[index];
    }
  }
  for (let index = 0; index < dimensions; index += 1) {
    mean[index] /= usable.length;
  }
  return mean;
}

function embeddingSimilarity(
  a: ClothingItem[],
  b: ClothingItem[],
  embeddings?: ItemEmbeddingMap
): number | null {
  const left = meanVector(a, embeddings);
  const right = meanVector(b, embeddings);
  if (!left || !right || left.length !== right.length) return null;
  const cosine = cosineSimilarity(left, right);
  if (!Number.isFinite(cosine)) return null;
  return (Math.max(-1, Math.min(1, cosine)) + 1) / 2;
}

export interface OutfitSimilarityBreakdown {
  itemIdentity: number;
  subcategory: number;
  colour: number;
  styleFamily: number;
  embedding: number | null;
  overall: number;
}

/**
 * Outfit-to-outfit similarity in 0–1.
 * Identity > subcategory > colour > style family > embedding.
 */
export function calculateOutfitSimilarity(
  a: ClothingItem[],
  b: ClothingItem[],
  embeddings?: ItemEmbeddingMap
): OutfitSimilarityBreakdown {
  const itemIdentity = jaccard(itemIdSet(a), itemIdSet(b));
  const subcategory = subcategorySimilarity(a, b);
  const colour = colourSimilarity(a, b);
  const styleFamily = styleFamilySimilarity(a, b);
  const embedding = embeddingSimilarity(a, b, embeddings);

  const weights: {
    itemIdentity: number;
    subcategory: number;
    colour: number;
    styleFamily: number;
    embedding: number;
  } = { ...DIVERSITY_SIMILARITY_WEIGHTS };
  if (embedding == null) {
    const dropped = weights.embedding;
    weights.embedding = 0;
    const remain = 1 - dropped;
    weights.itemIdentity /= remain;
    weights.subcategory /= remain;
    weights.colour /= remain;
    weights.styleFamily /= remain;
  }

  const overall =
    itemIdentity * weights.itemIdentity +
    subcategory * weights.subcategory +
    colour * weights.colour +
    styleFamily * weights.styleFamily +
    (embedding ?? 0) * weights.embedding;

  return {
    itemIdentity,
    subcategory,
    colour,
    styleFamily,
    embedding,
    overall: Math.max(0, Math.min(1, overall)),
  };
}
