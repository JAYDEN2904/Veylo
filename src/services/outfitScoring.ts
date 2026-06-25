import { ClothingItem, WeatherData } from '../types';
import { isItemWeatherAppropriate } from '../utils/weatherOutfitFilter';

const NEUTRAL_TOKENS = new Set([
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

/**
 * Penalize formality mismatches between a candidate and already picked items.
 *
 * When both items have a numeric `formalityScore` (1 = athletic, 4 = formal),
 * the penalty scales with the delta so the engine prefers coherent outfits:
 *   delta 0 → 0   (perfect match)
 *   delta 1 → 0   (acceptable step)
 *   delta 2 → 35  (noticeable clash)
 *   delta 3 → 70  (severe clash, e.g. gym shorts + blazer)
 *
 * Falls back to the keyword heuristic when scores are absent.
 */
export function clashPenalty(candidate: ClothingItem, picked: ClothingItem[]): number {
  let penalty = 0;
  const cand = itemTagBlob(candidate);
  const candFormal = hasAnyHint(cand, FORMAL_HINTS);
  const candAthletic = hasAnyHint(cand, ATHLETIC_HINTS);

  for (const p of picked) {
    if (candidate.formalityScore != null && p.formalityScore != null) {
      const delta = Math.abs(candidate.formalityScore - p.formalityScore);
      if (delta >= 2) {
        penalty += delta * 35;
      }
    } else {
      const pb = itemTagBlob(p);
      const pFormal = hasAnyHint(pb, FORMAL_HINTS);
      const pAthletic = hasAnyHint(pb, ATHLETIC_HINTS);
      if ((candFormal && pAthletic) || (candAthletic && pFormal)) {
        penalty += 35;
      }
    }
  }
  return penalty;
}

function isNeutralColorName(color: string): boolean {
  return NEUTRAL_TOKENS.has(color.trim().toLowerCase());
}

/**
 * Light bonus when new item balances neutrals vs colors already in the outfit.
 */
export function colorHarmonyBonus(candidate: ClothingItem, picked: ClothingItem[]): number {
  if (picked.length === 0) return 0;
  const pickedColors = picked.flatMap((p) => p.colors ?? []);
  const neutralCount = pickedColors.filter(isNeutralColorName).length;
  const nonNeutralCount = pickedColors.length - neutralCount;
  const candNeutrals = (candidate.colors ?? []).filter(isNeutralColorName).length;
  const candTotal = (candidate.colors ?? []).length || 1;

  if (nonNeutralCount >= 2 && candNeutrals === candTotal) return 12;
  if (neutralCount >= pickedColors.length && candNeutrals < candTotal) return 8;
  return 0;
}

export interface ScoreContext {
  occasionTagKeywords: string[];
  /** Lowercase substrings to boost when present in tags */
  styleBoostTerms: string[];
  weather?: WeatherData;
  /**
   * Wizard palette id (neutral | earth | bright | pastel | mono).
   * When set, items whose colors fall in-palette get a meaningful bonus,
   * items whose colors clash get a penalty.
   */
  paletteId?: string;
}

/** Lowercase color tokens belonging to each wizard palette. */
const PALETTE_TOKENS: Record<string, string[]> = {
  neutral: ['white', 'black', 'gray', 'grey', 'beige', 'cream', 'ivory', 'charcoal', 'silver'],
  earth: ['brown', 'tan', 'khaki', 'olive', 'rust', 'camel', 'sand', 'beige', 'terracotta'],
  bright: ['red', 'blue', 'green', 'yellow', 'orange', 'pink', 'cyan', 'magenta', 'lime'],
  pastel: ['pastel', 'baby', 'mint', 'blush', 'lilac', 'lavender', 'peach', 'sky', 'powder'],
  mono: ['black', 'white', 'gray', 'grey', 'charcoal', 'silver'],
};

function paletteBonus(item: ClothingItem, paletteId?: string): number {
  if (!paletteId) return 0;
  const tokens = PALETTE_TOKENS[paletteId];
  if (!tokens) return 0;
  const colors = (item.colors ?? []).map((c) => c.toLowerCase());
  if (colors.length === 0) return 0;
  const hits = colors.filter((c) => tokens.some((t) => c.includes(t))).length;
  if (hits === colors.length && hits > 0) return 20;
  if (hits > 0) return 10;
  return -8;
}

/**
 * Higher is better. Used to pick among candidates in a category slot.
 */
export function scoreItemForSlot(
  item: ClothingItem,
  ctx: ScoreContext,
  picked: ClothingItem[]
): number {
  let score = 45;
  const blob = itemTagBlob(item);

  for (const kw of ctx.occasionTagKeywords) {
    if (blob.includes(kw.toLowerCase())) score += 18;
  }

  let styleHits = 0;
  for (const term of ctx.styleBoostTerms) {
    if (term && blob.includes(term.toLowerCase())) {
      styleHits += 1;
      score += 10;
    }
  }
  score += Math.min(15, styleHits * 3);

  if (ctx.weather && isItemWeatherAppropriate(item, ctx.weather)) {
    score += 16;
  }

  const worn = item.wornCount ?? 0;
  score += Math.min(10, worn * 2);

  score += colorHarmonyBonus(item, picked);
  score -= clashPenalty(item, picked);
  score += paletteBonus(item, ctx.paletteId);

  return score;
}
