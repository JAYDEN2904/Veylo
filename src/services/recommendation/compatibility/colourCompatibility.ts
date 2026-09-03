import type { ClothingItem } from '../../../types';
import {
  colorHarmonyScoreHsl,
  hueDistance,
  isNeutralHsl,
  namedColorToHsl,
  type HslColor,
} from '../../../utils/hslColor';
import { clothingItemToScoringInput } from '../../outfitDimensionScoring';
import { relevantPairs } from './pairSlots';

function primaryHsl(item: ClothingItem): HslColor | null {
  if (item.colorsHsl && item.colorsHsl.length > 0) return item.colorsHsl[0];
  const input = clothingItemToScoringInput(item);
  if (input.colors.length === 0) return null;
  return namedColorToHsl(input.colors[0]);
}

/**
 * Pairwise colour using existing HSL harmony, plus complementary as a valid scheme.
 * Same colour is not automatically better than a planned contrast.
 */
export function scoreColourPair(left: ClothingItem, right: ClothingItem): number {
  const leftHsl = primaryHsl(left);
  const rightHsl = primaryHsl(right);
  if (!leftHsl || !rightHsl) return 55;

  const forward = colorHarmonyScoreHsl([leftHsl], rightHsl);
  const backward = colorHarmonyScoreHsl([rightHsl], leftHsl);
  let score = (forward + backward) / 2;

  if (isNeutralHsl(leftHsl) || isNeutralHsl(rightHsl)) {
    return Math.round(Math.max(score, 86));
  }

  const distance = hueDistance(leftHsl, rightHsl);
  if (distance >= 150) {
    score = Math.max(score, 80);
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function scoreOutfitColourHarmony(items: ClothingItem[]): number {
  if (items.length < 2) return 70;
  const pairs = relevantPairs(items);
  if (pairs.length === 0) return 70;
  const total = pairs.reduce((sum, pair) => sum + scoreColourPair(pair.left, pair.right), 0);
  return Math.round(total / pairs.length);
}
