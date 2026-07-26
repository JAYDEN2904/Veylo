import { ClothingItem, WeatherData } from '../types';
import { isItemWeatherAppropriate } from '../utils/weatherOutfitFilter';
import { colorHarmonyScoreHsl, namedColorToHsl, type HslColor } from '../utils/hslColor';

/** Locked MVP weights — must sum to 1.0 */
export const DIMENSION_WEIGHTS = {
  colourHarmony: 0.3,
  formality: 0.25,
  weather: 0.2,
  styleProfile: 0.15,
  wearDiversity: 0.1,
} as const;

export interface DimensionScores {
  colourHarmony: number;
  formality: number;
  weather: number;
  styleProfile: number;
  wearDiversity: number;
}

export interface ScoringItemInput {
  id: string;
  category: string;
  sub_category?: string | null;
  colors: string[];
  colors_hsl?: HslColor[];
  tags: string[];
  formality_score?: number | null;
  worn_count?: number | null;
  last_worn?: string | null;
}

function itemHslColors(item: ScoringItemInput): HslColor[] {
  if (item.colors_hsl && item.colors_hsl.length > 0) return item.colors_hsl;
  return item.colors.map(namedColorToHsl);
}

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

function tagBlob(item: ScoringItemInput): string {
  return [...item.tags, item.sub_category ?? '', ...item.colors].join(' ').toLowerCase();
}

function hasHint(blob: string, hints: string[]): boolean {
  return hints.some((h) => blob.includes(h));
}

function isNeutral(color: string): boolean {
  return NEUTRAL_TOKENS.has(color.trim().toLowerCase());
}

/** 0–100 colour harmony for a candidate against already-picked items. */
export function scoreColourHarmonyDimension(
  candidate: ScoringItemInput,
  picked: ScoringItemInput[]
): number {
  const pickedHsl = picked.flatMap((p) => itemHslColors(p));
  const candHsl = itemHslColors(candidate);
  if (candHsl.length === 0) return 55;
  const primary = candHsl[0];
  return colorHarmonyScoreHsl(pickedHsl, primary);
}

/** 0–100 formality coherence with picked items and target occasion. */
export function scoreFormalityDimension(
  candidate: ScoringItemInput,
  picked: ScoringItemInput[],
  occasion?: string
): number {
  let score = 80;
  const blob = tagBlob(candidate);

  for (const p of picked) {
    if (candidate.formality_score != null && p.formality_score != null) {
      const delta = Math.abs(candidate.formality_score - p.formality_score);
      if (delta === 0) score = Math.max(score, 100);
      else if (delta === 1) score = Math.min(score, 85);
      else if (delta === 2) score = Math.min(score, 45);
      else score = Math.min(score, 15);
    } else {
      const pb = tagBlob(p);
      const candFormal = hasHint(blob, FORMAL_HINTS);
      const candAthletic = hasHint(blob, ATHLETIC_HINTS);
      const pFormal = hasHint(pb, FORMAL_HINTS);
      const pAthletic = hasHint(pb, ATHLETIC_HINTS);
      if ((candFormal && pAthletic) || (candAthletic && pFormal)) {
        score = Math.min(score, 30);
      }
    }
  }

  if (occasion) {
    const formalOccasions = ['Formal', 'Work', 'Date Night'];
    const athleticOccasions = ['Exercise'];
    if (formalOccasions.includes(occasion) && hasHint(blob, ATHLETIC_HINTS)) score -= 25;
    if (athleticOccasions.includes(occasion) && hasHint(blob, FORMAL_HINTS)) score -= 25;
  }

  return Math.max(0, Math.min(100, score));
}

/** 0–100 weather appropriateness; neutral 70 when weather omitted. */
export function scoreWeatherDimension(
  item: ScoringItemInput,
  weather?: WeatherData | null
): number {
  if (!weather) return 70;

  const asClothing: ClothingItem = {
    id: item.id,
    imageUrl: '',
    category: item.category,
    colors: item.colors ?? [],
    colorsHsl: itemHslColors(item),
    tags: item.tags ?? [],
    createdAt: new Date().toISOString(),
    status: 'active',
    subCategory: item.sub_category ?? undefined,
    formalityScore: item.formality_score ?? undefined,
  };

  return isItemWeatherAppropriate(asClothing, weather) ? 95 : 25;
}

/** 0–100 alignment with user style preference terms. */
export function scoreStyleProfileDimension(item: ScoringItemInput, styleTerms: string[]): number {
  if (styleTerms.length === 0) return 70;
  const blob = tagBlob(item);
  const hits = styleTerms.filter((t) => t && blob.includes(t.toLowerCase())).length;
  if (hits === 0) return 35;
  return Math.min(100, 50 + hits * 18);
}

/** 0–100 wear diversity — favours less-recently-worn items. */
export function scoreWearDiversityDimension(item: ScoringItemInput): number {
  let score = 75;

  if (item.last_worn) {
    const days = (Date.now() - new Date(item.last_worn).getTime()) / 86_400_000;
    if (days < 3) score = 20;
    else if (days < 14) score = 55;
    else if (days < 30) score = 80;
    else score = 95;
  } else {
    score = 90;
  }

  const worn = item.worn_count ?? 0;
  if (worn > 20) score = Math.max(10, score - 20);
  else if (worn > 10) score = Math.max(20, score - 10);

  return Math.max(0, Math.min(100, score));
}

export function scoreItemDimensions(
  item: ScoringItemInput,
  options: {
    picked: ScoringItemInput[];
    styleTerms: string[];
    weather?: WeatherData | null;
    occasion?: string;
  }
): DimensionScores {
  return {
    colourHarmony: scoreColourHarmonyDimension(item, options.picked),
    formality: scoreFormalityDimension(item, options.picked, options.occasion),
    weather: scoreWeatherDimension(item, options.weather),
    styleProfile: scoreStyleProfileDimension(item, options.styleTerms),
    wearDiversity: scoreWearDiversityDimension(item),
  };
}

export function compositeDimensionScore(dimensions: DimensionScores, hasWeather: boolean): number {
  const w = DIMENSION_WEIGHTS;
  let total = 0;
  let weightSum = 0;

  total += dimensions.colourHarmony * w.colourHarmony;
  weightSum += w.colourHarmony;

  total += dimensions.formality * w.formality;
  weightSum += w.formality;

  if (hasWeather) {
    total += dimensions.weather * w.weather;
    weightSum += w.weather;
  }

  total += dimensions.styleProfile * w.styleProfile;
  weightSum += w.styleProfile;

  total += dimensions.wearDiversity * w.wearDiversity;
  weightSum += w.wearDiversity;

  return Math.round(total / weightSum);
}

export function clothingItemToScoringInput(item: ClothingItem): ScoringItemInput {
  return {
    id: item.id,
    category: item.category,
    sub_category: item.subCategory ?? null,
    colors: item.colors ?? [],
    colors_hsl: item.colorsHsl?.length ? item.colorsHsl : undefined,
    tags: item.tags ?? [],
    formality_score: item.formalityScore ?? null,
    worn_count: item.wornCount ?? null,
    last_worn: item.lastWorn ?? null,
  };
}

/** Plain-English rationale lines from dimension scores. */
export function buildDimensionReasoning(
  dimensions: DimensionScores,
  hasWeather: boolean
): string[] {
  const lines: string[] = [];

  if (dimensions.colourHarmony >= 85) {
    lines.push('Colours balance well together.');
  } else if (dimensions.colourHarmony < 55) {
    lines.push('Colour mix may feel busy — consider a neutral piece.');
  }

  if (dimensions.formality >= 85) {
    lines.push('Formality levels match across pieces.');
  } else if (dimensions.formality < 50) {
    lines.push('Some pieces clash in formality — double-check the vibe.');
  }

  if (hasWeather) {
    if (dimensions.weather >= 85) {
      lines.push('Well suited to today’s weather.');
    } else if (dimensions.weather < 50) {
      lines.push('May not be ideal for current conditions.');
    }
  }

  if (dimensions.styleProfile >= 80) {
    lines.push('Aligns with your style profile.');
  } else if (dimensions.styleProfile < 45) {
    lines.push('A bit outside your usual style preferences.');
  }

  if (dimensions.wearDiversity >= 80) {
    lines.push('Includes pieces you have not worn recently.');
  } else if (dimensions.wearDiversity < 45) {
    lines.push('Relies on items you have worn lately.');
  }

  if (lines.length === 0) {
    lines.push('A balanced look from your wardrobe.');
  }

  return lines;
}

/** Score a full outfit (average of per-item composites). */
export function scoreOutfitDimensions(
  items: ScoringItemInput[],
  options: {
    styleTerms: string[];
    weather?: WeatherData | null;
    occasion?: string;
  }
): { composite: number; dimensions: DimensionScores; reasoning: string[] } {
  if (items.length === 0) {
    const empty: DimensionScores = {
      colourHarmony: 0,
      formality: 0,
      weather: 0,
      styleProfile: 0,
      wearDiversity: 0,
    };
    return { composite: 0, dimensions: empty, reasoning: ['No items in outfit.'] };
  }

  const hasWeather = Boolean(options.weather);
  const perItem: DimensionScores[] = [];

  for (let i = 0; i < items.length; i++) {
    const picked = items.slice(0, i);
    perItem.push(
      scoreItemDimensions(items[i], {
        picked,
        styleTerms: options.styleTerms,
        weather: options.weather,
        occasion: options.occasion,
      })
    );
  }

  const avg = (key: keyof DimensionScores): number =>
    Math.round(perItem.reduce((sum, d) => sum + d[key], 0) / perItem.length);

  const dimensions: DimensionScores = {
    colourHarmony: avg('colourHarmony'),
    formality: avg('formality'),
    weather: avg('weather'),
    styleProfile: avg('styleProfile'),
    wearDiversity: avg('wearDiversity'),
  };

  return {
    composite: compositeDimensionScore(dimensions, hasWeather),
    dimensions,
    reasoning: buildDimensionReasoning(dimensions, hasWeather),
  };
}
