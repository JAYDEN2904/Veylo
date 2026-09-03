import type { ClothingItem } from '../../../types';
import { scoreOutfitColourHarmony } from './colourCompatibility';
import { scoreOutfitFormality } from './formalityCompatibility';
import { scoreOutfitStyleCoherence } from './styleCompatibility';
import { relevantPairs } from './pairSlots';

export interface CompatibilityBreakdown {
  colourHarmony: number;
  formality: number;
  styleCoherence: number;
  pairCount: number;
  /** Outfit-level "do these pieces belong together" — not an item average. */
  compatibility: number;
}

export function scoreOutfitCompatibility(
  items: ClothingItem[],
  occasion?: string
): CompatibilityBreakdown {
  const colourHarmony = scoreOutfitColourHarmony(items);
  const formality = scoreOutfitFormality(items, occasion);
  const styleCoherence = scoreOutfitStyleCoherence(items);
  const pairCount = relevantPairs(items).length;
  const compatibility = Math.round(colourHarmony * 0.4 + formality * 0.4 + styleCoherence * 0.2);

  return {
    colourHarmony,
    formality,
    styleCoherence,
    pairCount,
    compatibility,
  };
}
