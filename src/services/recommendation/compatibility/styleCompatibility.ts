import type { ClothingItem } from '../../../types';
import {
  clothingItemToScoringInput,
  scoreStyleProfileDimension,
} from '../../outfitDimensionScoring';

const STYLE_FAMILIES: Record<string, string[]> = {
  minimal: ['minimal', 'minimalist', 'clean'],
  street: ['street', 'urban', 'streetwear'],
  classic: ['classic', 'tailored', 'timeless'],
  formal: ['formal', 'elegant', 'dressy'],
  casual: ['casual', 'relaxed', 'comfort', 'everyday'],
  athletic: ['athletic', 'gym', 'sport', 'active', 'workout'],
  bold: ['bold', 'statement', 'graphic'],
};

export function styleFamiliesForItem(item: ClothingItem): string[] {
  const blob = [...item.tags, item.subCategory ?? ''].join(' ').toLowerCase();
  return Object.entries(STYLE_FAMILIES)
    .filter(([, tokens]) => tokens.some((token) => blob.includes(token)))
    .map(([family]) => family);
}

/**
 * Map a preference label onto existing style-family keys.
 * `streetwear` → `street`, `minimalist` → `minimal`. Does not classify garments.
 */
export function styleFamiliesMatchingPreference(preferred: string): string[] {
  const key = preferred.trim().toLowerCase();
  if (!key) return [];
  return Object.entries(STYLE_FAMILIES)
    .filter(([family, tokens]) => family === key || tokens.includes(key))
    .map(([family]) => family);
}

/**
 * Outfit style coherence — shared families matter more than raw tag overlap.
 * Streetwear top + streetwear bottom + minimal shoes can still be coherent.
 */
export function scoreOutfitStyleCoherence(items: ClothingItem[]): number {
  if (items.length === 0) return 70;
  const familyHits: Record<string, number> = {};
  for (const item of items) {
    const unique = new Set(styleFamiliesForItem(item));
    for (const family of unique) {
      familyHits[family] = (familyHits[family] ?? 0) + 1;
    }
  }
  const counts = Object.values(familyHits);
  if (counts.length === 0) return 65;
  const dominant = Math.max(...counts);
  if (dominant >= items.length) return 90;
  if (dominant >= items.length - 1) return 82;
  if (dominant >= 2) return 74;
  return 48;
}

export function scoreOutfitStyleMatch(items: ClothingItem[], styleTerms: string[]): number {
  if (items.length === 0) return 70;
  if (styleTerms.length === 0) return 70;
  const total = items.reduce((sum, item) => {
    return sum + scoreStyleProfileDimension(clothingItemToScoringInput(item), styleTerms);
  }, 0);
  return Math.round(total / items.length);
}
