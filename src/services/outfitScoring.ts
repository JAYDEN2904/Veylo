import { ClothingItem, WeatherData } from '../types';
import {
  clothingItemToScoringInput,
  compositeDimensionScore,
  scoreItemDimensions,
} from './outfitDimensionScoring';

export {
  DIMENSION_WEIGHTS,
  buildDimensionReasoning,
  scoreOutfitDimensions,
  clothingItemToScoringInput,
} from './outfitDimensionScoring';
export type { DimensionScores } from './outfitDimensionScoring';

const FORMAL_HINTS = [
  'formal',
  'elegant',
  'dressy',
  'work',
  'business',
  'professional',
  'office',
  'blazer',
  'suit',
];
const ATHLETIC_HINTS = [
  'sport',
  'athletic',
  'gym',
  'workout',
  'running',
  'training',
  'active',
  'yoga',
];

function itemTagBlob(item: ClothingItem): string {
  return [...item.tags, item.subCategory ?? '', ...(item.colors ?? [])].join(' ').toLowerCase();
}

function hasAnyHint(blob: string, hints: string[]): boolean {
  return hints.some((h) => blob.includes(h));
}

/** @deprecated Use dimension scoring — kept for tests */
export function clashPenalty(candidate: ClothingItem, picked: ClothingItem[]): number {
  let penalty = 0;
  const cand = itemTagBlob(candidate);
  const candFormal = hasAnyHint(cand, FORMAL_HINTS);
  const candAthletic = hasAnyHint(cand, ATHLETIC_HINTS);

  for (const p of picked) {
    if (candidate.formalityScore != null && p.formalityScore != null) {
      const delta = Math.abs(candidate.formalityScore - p.formalityScore);
      if (delta >= 2) penalty += delta * 35;
    } else {
      const pb = itemTagBlob(p);
      const pFormal = hasAnyHint(pb, FORMAL_HINTS);
      const pAthletic = hasAnyHint(pb, ATHLETIC_HINTS);
      if ((candFormal && pAthletic) || (candAthletic && pFormal)) penalty += 35;
    }
  }
  return penalty;
}

/** @deprecated Use dimension scoring — kept for tests */
export function colorHarmonyBonus(candidate: ClothingItem, picked: ClothingItem[]): number {
  if (picked.length === 0) return 0;
  const NEUTRAL = new Set([
    'white',
    'black',
    'gray',
    'grey',
    'navy',
    'beige',
    'cream',
    'tan',
    'brown',
    'khaki',
    'ivory',
    'charcoal',
  ]);
  const isNeutral = (c: string) => NEUTRAL.has(c.trim().toLowerCase());
  const pickedColors = picked.flatMap((p) => p.colors ?? []);
  const neutralCount = pickedColors.filter(isNeutral).length;
  const nonNeutralCount = pickedColors.length - neutralCount;
  const candNeutrals = (candidate.colors ?? []).filter(isNeutral).length;
  const candTotal = (candidate.colors ?? []).length || 1;
  if (nonNeutralCount >= 2 && candNeutrals === candTotal) return 12;
  if (neutralCount >= pickedColors.length && candNeutrals < candTotal) return 8;
  return 0;
}

export interface ScoreContext {
  occasionTagKeywords: string[];
  styleBoostTerms: string[];
  weather?: WeatherData;
  paletteId?: string;
  occasionKey?: string;
}

const PALETTE_TOKENS: Record<string, string[]> = {
  neutral: ['white', 'black', 'gray', 'grey', 'beige', 'cream', 'ivory', 'charcoal', 'silver'],
  earth: ['brown', 'tan', 'khaki', 'olive', 'rust', 'camel', 'sand', 'beige', 'terracotta'],
  bright: ['red', 'blue', 'green', 'yellow', 'orange', 'pink', 'cyan', 'magenta', 'lime'],
  pastel: ['pastel', 'baby', 'mint', 'blush', 'lilac', 'lavender', 'peach', 'sky', 'powder'],
  mono: ['black', 'white', 'gray', 'grey', 'charcoal', 'silver'],
};

function paletteAdjustment(item: ClothingItem, paletteId?: string): number {
  if (!paletteId) return 0;
  const tokens = PALETTE_TOKENS[paletteId];
  if (!tokens) return 0;
  const colors = (item.colors ?? []).map((c) => c.toLowerCase());
  if (colors.length === 0) return 0;
  const hits = colors.filter((c) => tokens.some((t) => c.includes(t))).length;
  if (hits === colors.length && hits > 0) return 8;
  if (hits > 0) return 4;
  return -4;
}

/**
 * Weighted composite score (30/25/20/15/10) for slot selection.
 */
export function scoreItemForSlot(
  item: ClothingItem,
  ctx: ScoreContext,
  picked: ClothingItem[]
): number {
  const input = clothingItemToScoringInput(item);
  const pickedInputs = picked.map(clothingItemToScoringInput);
  const styleTerms = [
    ...ctx.styleBoostTerms,
    ...ctx.occasionTagKeywords.map((k) => k.toLowerCase()),
  ];

  const dimensions = scoreItemDimensions(input, {
    picked: pickedInputs,
    styleTerms,
    weather: ctx.weather,
    occasion: ctx.occasionKey,
  });

  let score = compositeDimensionScore(dimensions, Boolean(ctx.weather));
  score += paletteAdjustment(item, ctx.paletteId);
  return Math.max(0, Math.min(100, score));
}
