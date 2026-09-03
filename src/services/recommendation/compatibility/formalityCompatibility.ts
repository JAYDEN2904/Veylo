import type { ClothingItem } from '../../../types';
import { clothingItemToScoringInput, scoreFormalityDimension } from '../../outfitDimensionScoring';
import { relevantPairs } from './pairSlots';

export function scoreFormalityPair(
  left: ClothingItem,
  right: ClothingItem,
  occasion?: string
): number {
  const leftInput = clothingItemToScoringInput(left);
  const rightInput = clothingItemToScoringInput(right);
  const forward = scoreFormalityDimension(leftInput, [rightInput], occasion);
  const backward = scoreFormalityDimension(rightInput, [leftInput], occasion);
  return Math.round(Math.min(forward, backward));
}

/** Outfit formality: mean of pairs pulled down by the worst clash. */
export function scoreOutfitFormality(items: ClothingItem[], occasion?: string): number {
  if (items.length < 2) return 80;
  const pairs = relevantPairs(items);
  if (pairs.length === 0) return 80;

  const scores = pairs.map((pair) => scoreFormalityPair(pair.left, pair.right, occasion));
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const worst = Math.min(...scores);
  return Math.round(Math.max(0, Math.min(100, mean * 0.6 + worst * 0.4)));
}
