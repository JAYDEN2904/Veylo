/** Locked MVP weights — mirrored from src/services/outfitDimensionScoring.ts */

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

export interface ScoringItem {
  id: string;
  category: string;
  sub_category?: string | null;
  colors: string[];
  colors_hsl?: Array<{ h: number; s: number; l: number }>;
  tags: string[];
  formality_score?: number | null;
  worn_count?: number | null;
  last_worn?: string | null;
}

export interface WeatherInput {
  temperature: number;
  condition: string;
}

const NAMED_TO_HSL: Record<string, { h: number; s: number; l: number }> = {
  black: { h: 0, s: 0, l: 8 },
  white: { h: 0, s: 0, l: 96 },
  gray: { h: 0, s: 0, l: 50 },
  grey: { h: 0, s: 0, l: 50 },
  navy: { h: 220, s: 55, l: 22 },
  blue: { h: 220, s: 70, l: 45 },
  red: { h: 0, s: 75, l: 45 },
  green: { h: 140, s: 45, l: 38 },
  yellow: { h: 48, s: 90, l: 55 },
  pink: { h: 340, s: 60, l: 70 },
  purple: { h: 280, s: 50, l: 45 },
  brown: { h: 25, s: 45, l: 30 },
  beige: { h: 38, s: 30, l: 78 },
  cream: { h: 45, s: 25, l: 92 },
  tan: { h: 32, s: 35, l: 62 },
  khaki: { h: 48, s: 25, l: 58 },
  olive: { h: 75, s: 30, l: 38 },
  orange: { h: 28, s: 85, l: 52 },
};

function namedColorToHsl(name: string): { h: number; s: number; l: number } {
  const key = name.trim().toLowerCase();
  for (const [token, hsl] of Object.entries(NAMED_TO_HSL)) {
    if (key.includes(token)) return { ...hsl };
  }
  return { h: 0, s: 0, l: 50 };
}

function itemHslColors(item: ScoringItem): Array<{ h: number; s: number; l: number }> {
  if (item.colors_hsl && item.colors_hsl.length > 0) return item.colors_hsl;
  return (item.colors ?? []).map(namedColorToHsl);
}

function hueDistance(a: { h: number }, b: { h: number }): number {
  const diff = Math.abs(a.h - b.h);
  return Math.min(diff, 360 - diff);
}

function isNeutralHsl(hsl: { h: number; s: number; l: number }): boolean {
  return hsl.s < 15 || hsl.l < 15 || hsl.l > 88;
}

function colorHarmonyScoreHsl(
  picked: Array<{ h: number; s: number; l: number }>,
  candidate: { h: number; s: number; l: number }
): number {
  if (picked.length === 0) return 75;
  const neutralCount = picked.filter(isNeutralHsl).length;
  const candNeutral = isNeutralHsl(candidate);
  if (neutralCount >= picked.length && !candNeutral) return 85;
  if (!candNeutral && picked.filter((p) => !isNeutralHsl(p)).length >= 2 && candNeutral) return 95;
  const avgHueDist = picked.reduce((sum, p) => sum + hueDistance(p, candidate), 0) / picked.length;
  if (avgHueDist < 30) return 90;
  if (avgHueDist < 60) return 75;
  if (avgHueDist < 120) return 60;
  return 40;
}

function scoreColour(item: ScoringItem, picked: ScoringItem[]): number {
  const pickedHsl = picked.flatMap((p) => itemHslColors(p));
  const candHsl = itemHslColors(item);
  if (candHsl.length === 0) return 55;
  const scores = candHsl.map((c) => colorHarmonyScoreHsl(pickedHsl, c));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function blob(item: ScoringItem): string {
  const tags = item.tags ?? [];
  const colors = item.colors ?? [];
  return [...tags, item.sub_category ?? '', ...colors].join(' ').toLowerCase();
}

function scoreFormality(item: ScoringItem, picked: ScoringItem[], occasion?: string): number {
  let score = 80;
  const b = blob(item);
  const formal = ['formal', 'elegant', 'dressy', 'work', 'business', 'blazer', 'suit'];
  const athletic = ['sport', 'athletic', 'gym', 'workout', 'active'];

  for (const p of picked) {
    if (item.formality_score != null && p.formality_score != null) {
      const delta = Math.abs(item.formality_score - p.formality_score);
      if (delta >= 2) score = Math.min(score, 45);
      else if (delta === 1) score = Math.min(score, 85);
    } else {
      const pb = blob(p);
      const cf = formal.some((h) => b.includes(h));
      const ca = athletic.some((h) => b.includes(h));
      const pf = formal.some((h) => pb.includes(h));
      const pa = athletic.some((h) => pb.includes(h));
      if ((cf && pa) || (ca && pf)) score = Math.min(score, 30);
    }
  }

  if (occasion && ['Formal', 'Work', 'Date Night'].includes(occasion)) {
    if (athletic.some((h) => b.includes(h))) score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreWeatherItem(item: ScoringItem, weather?: WeatherInput | null): number {
  if (!weather) return 70;
  const temp = weather.temperature;
  const condition = weather.condition.toLowerCase();
  const category = item.category.toLowerCase();
  const tags = (item.tags ?? []).map((t) => t.toLowerCase());

  if (temp >= 75) {
    if (category.includes('outerwear') && !tags.some((t) => t.includes('light'))) return 25;
    if (tags.some((t) => t.includes('warm') || t.includes('wool') || t.includes('heavy')))
      return 25;
  } else if (temp < 50) {
    if (category.includes('shorts')) return 20;
  }
  if (condition.includes('rain') && !tags.some((t) => t.includes('waterproof'))) return 40;
  return 90;
}

function scoreStyle(item: ScoringItem, terms: string[]): number {
  if (terms.length === 0) return 70;
  const b = blob(item);
  const hits = terms.filter((t) => b.includes(t.toLowerCase())).length;
  return hits === 0 ? 35 : Math.min(100, 50 + hits * 18);
}

function scoreWear(item: ScoringItem): number {
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
  return Math.max(0, Math.min(100, score));
}

export function scoreItemComposite(
  item: ScoringItem,
  picked: ScoringItem[],
  styleTerms: string[],
  weather?: WeatherInput | null,
  occasion?: string
): number {
  const hasWeather = Boolean(weather);
  const d: DimensionScores = {
    colourHarmony: scoreColour(item, picked),
    formality: scoreFormality(item, picked, occasion),
    weather: scoreWeatherItem(item, weather),
    styleProfile: scoreStyle(item, styleTerms),
    wearDiversity: scoreWear(item),
  };
  const w = DIMENSION_WEIGHTS;
  let total =
    d.colourHarmony * w.colourHarmony +
    d.formality * w.formality +
    d.styleProfile * w.styleProfile +
    d.wearDiversity * w.wearDiversity;
  let weightSum = w.colourHarmony + w.formality + w.styleProfile + w.wearDiversity;
  if (hasWeather) {
    total += d.weather * w.weather;
    weightSum += w.weather;
  }
  return Math.round(total / weightSum);
}

export function scoreOutfitComposite(
  items: ScoringItem[],
  styleTerms: string[],
  weather?: WeatherInput | null,
  occasion?: string
): number {
  if (items.length === 0) return 0;
  const scores: number[] = [];
  for (let i = 0; i < items.length; i++) {
    scores.push(scoreItemComposite(items[i], items.slice(0, i), styleTerms, weather, occasion));
  }
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function buildOutfitReasoning(
  items: ScoringItem[],
  styleTerms: string[],
  weather?: WeatherInput | null,
  occasion?: string
): string[] {
  const lines: string[] = [];
  if (items.length === 0) return ['No items in outfit.'];

  const avgColour =
    items.reduce((s, it, i) => s + scoreColour(it, items.slice(0, i)), 0) / items.length;
  const avgFormality =
    items.reduce((s, it, i) => s + scoreFormality(it, items.slice(0, i), occasion), 0) /
    items.length;
  const avgWeather = weather
    ? items.reduce((s, it) => s + scoreWeatherItem(it, weather), 0) / items.length
    : 0;
  const avgStyle = items.reduce((s, it) => s + scoreStyle(it, styleTerms), 0) / items.length;
  const avgWear = items.reduce((s, it) => s + scoreWear(it), 0) / items.length;

  if (avgColour >= 85) lines.push('Colours balance well together.');
  if (avgFormality >= 85) lines.push('Formality levels match across pieces.');
  if (weather && avgWeather >= 85) lines.push('Well suited to today’s weather.');
  if (avgStyle >= 80) lines.push('Aligns with your style profile.');
  if (avgWear >= 80) lines.push('Includes pieces you have not worn recently.');
  if (lines.length === 0) lines.push('A balanced look from your wardrobe.');
  return lines;
}
