import type { ClothingItem } from '../../../types';
import { scoreOutfitColourHarmony } from './colourCompatibility';
import { scoreOutfitFormality } from './formalityCompatibility';
import { scoreOutfitStyleCoherence } from './styleCompatibility';
import { scoreOutfitEmbeddingCompatibility } from './embeddingCompatibility';
import { relevantPairs } from './pairSlots';
import type { ItemEmbeddingMap } from '../types';

export interface CompatibilityBreakdown {
  colourHarmony: number;
  formality: number;
  styleCoherence: number;
  embedding: number;
  embeddingsUsed: boolean;
  pairCount: number;
  /** Outfit-level "do these pieces belong together" — not an item average. */
  compatibility: number;
}

export function scoreOutfitCompatibility(
  items: ClothingItem[],
  occasion?: string,
  itemEmbeddings?: ItemEmbeddingMap
): CompatibilityBreakdown {
  const colourHarmony = scoreOutfitColourHarmony(items);
  const formality = scoreOutfitFormality(items, occasion);
  const styleCoherence = scoreOutfitStyleCoherence(items);
  const embedding = scoreOutfitEmbeddingCompatibility(items, itemEmbeddings);
  const pairCount = relevantPairs(items).length;
  const compatibility = embedding.used
    ? Math.round(
        colourHarmony * 0.34 + formality * 0.34 + styleCoherence * 0.17 + embedding.score * 0.15
      )
    : Math.round(colourHarmony * 0.4 + formality * 0.4 + styleCoherence * 0.2);

  return {
    colourHarmony,
    formality,
    styleCoherence,
    embedding: embedding.score,
    embeddingsUsed: embedding.used,
    pairCount,
    compatibility,
  };
}
