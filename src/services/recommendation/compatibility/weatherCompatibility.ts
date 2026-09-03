import type { ClothingItem, WeatherData } from '../../../types';
import { isItemWeatherAppropriate } from '../../../utils/weatherOutfitFilter';
import { normalizeCategory } from '../../outfitCategoryNormalize';

function hasTag(item: ClothingItem, tokens: string[]): boolean {
  const blob = [...item.tags, item.subCategory ?? ''].join(' ').toLowerCase();
  return tokens.some((token) => blob.includes(token));
}

function isShorts(item: ClothingItem): boolean {
  const category = normalizeCategory(item.category).toLowerCase();
  const sub = (item.subCategory ?? '').toLowerCase();
  return category.includes('short') || sub.includes('short');
}

function isOpenShoe(item: ClothingItem): boolean {
  const sub = (item.subCategory ?? '').toLowerCase();
  const blob = item.tags.join(' ').toLowerCase();
  return sub.includes('sandal') || sub.includes('flip') || blob.includes('sandal');
}

/**
 * Weather is judged on the complete outfit. A warm coat plus shorts can fail
 * even when each garment is individually acceptable.
 */
export function scoreOutfitWeather(items: ClothingItem[], weather?: WeatherData): number {
  if (!weather) return 70;
  if (items.length === 0) return 0;

  const itemMean =
    items.reduce((sum, item) => sum + (isItemWeatherAppropriate(item, weather) ? 95 : 25), 0) /
    items.length;
  const coherence = weatherCoherence(items, weather);
  return Math.round(Math.max(0, Math.min(100, itemMean * 0.55 + coherence * 0.45)));
}

function weatherCoherence(items: ClothingItem[], weather: WeatherData): number {
  const temp = weather.temperature;
  const hasOuter = items.some((item) => normalizeCategory(item.category) === 'Outerwear');
  const hasShorts = items.some(isShorts);
  const hasOpenShoe = items.some(isOpenShoe);
  const hasHeavy = items.some((item) => hasTag(item, ['heavy', 'wool', 'coat', 'parka']));

  let score = 82;
  if (temp < 10) {
    if (hasShorts) score -= 28;
    if (hasOpenShoe) score -= 18;
    if (hasHeavy && hasShorts) score -= 12;
    if (!hasOuter && temp < 5) score -= 14;
  } else if (temp >= 24) {
    if (hasHeavy) score -= 26;
    if (hasHeavy && hasShorts) score -= 8;
  }
  return Math.max(0, Math.min(100, score));
}
