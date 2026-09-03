import type { ClothingItem } from '../../types';
import { filterItemsByWeather } from '../../utils/weatherOutfitFilter';
import {
  filterItemsForOccasion,
  getOccasionProfile,
  isBannedForOccasion,
} from '../../utils/occasionProfiles';
import { deriveGenderAffinity, deriveOccasionTags } from '../../utils/itemMetadata';
import { normalizeCategory } from '../outfitCategoryNormalize';
import type { RecommendationRequest, RelaxationLevel, SoftConstraintOptions } from './types';

export function getCurrentSeason(now: Date = new Date()): string {
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

export function itemMatchesSeason(item: ClothingItem, season: string): boolean {
  if (!item.season || item.season.length === 0) return true;
  const target = season.trim().toLowerCase();
  return item.season.some((entry) => entry.trim().toLowerCase() === target);
}

export function relaxationOptions(level: RelaxationLevel): SoftConstraintOptions {
  switch (level) {
    case 0:
      return { skipSeason: false, skipOccasion: false, skipWeather: false, skipTimeOfDay: false };
    case 1:
      return { skipSeason: true, skipOccasion: false, skipWeather: false, skipTimeOfDay: false };
    case 2:
      return { skipSeason: true, skipOccasion: true, skipWeather: false, skipTimeOfDay: false };
    case 3:
      return { skipSeason: true, skipOccasion: true, skipWeather: true, skipTimeOfDay: false };
    case 4:
      return { skipSeason: true, skipOccasion: true, skipWeather: true, skipTimeOfDay: true };
    default: {
      const exhaustive: never = level;
      throw new Error(`Unhandled relaxation level: ${exhaustive}`);
    }
  }
}

export function applyHardConstraints(
  items: ClothingItem[],
  request: RecommendationRequest
): ClothingItem[] {
  const excluded = new Set(request.excludeItemIds ?? []);
  return items.filter((item) => {
    if (item.status !== 'active') return false;
    if (excluded.has(item.id)) return false;
    return true;
  });
}

export function enrichOccasionMetadata(item: ClothingItem): ClothingItem {
  return {
    ...item,
    genderAffinity:
      item.genderAffinity ??
      deriveGenderAffinity({
        category: item.category,
        subCategory: item.subCategory,
        styleTags: item.tags,
      }),
    occasionTags:
      item.occasionTags && item.occasionTags.length > 0
        ? item.occasionTags
        : deriveOccasionTags({
            category: item.category,
            subCategory: item.subCategory,
            styleTags: item.tags,
            formalityScore: item.formalityScore,
          }),
  };
}

function applyOccasionHardFilter(items: ClothingItem[], occasionKey: string): ClothingItem[] {
  const profile = getOccasionProfile(occasionKey);
  if (!profile) {
    return items;
  }

  const enriched = items.map(enrichOccasionMetadata);
  const filtered = filterItemsForOccasion(
    enriched.map((item) => ({
      id: item.id,
      category: item.category,
      subCategory: item.subCategory,
      colors: item.colors,
      tags: item.tags,
      occasionTags: item.occasionTags,
      formalityScore: item.formalityScore,
      genderAffinity: item.genderAffinity,
    })),
    profile,
    { hardBan: true }
  );
  const allowedIds = new Set(filtered.map((entry) => entry.id));
  return enriched.filter((item) => {
    if (!allowedIds.has(item.id)) return false;
    return !isBannedForOccasion(
      {
        id: item.id,
        category: item.category,
        subCategory: item.subCategory,
        tags: item.tags,
        occasionTags: item.occasionTags,
        formalityScore: item.formalityScore,
        genderAffinity: item.genderAffinity,
      },
      profile
    );
  });
}

function applyTimeOfDayFilter(items: ClothingItem[], timeOfDay?: string): ClothingItem[] {
  if (timeOfDay !== 'evening') return items;
  return items.filter(
    (item) =>
      !item.tags.some((tag) => {
        const lower = tag.toLowerCase();
        return lower.includes('daytime') || lower.includes('beach');
      })
  );
}

export function applySoftConstraints(
  items: ClothingItem[],
  request: RecommendationRequest,
  options: SoftConstraintOptions
): ClothingItem[] {
  let pool = items;
  const season = request.season || getCurrentSeason();

  if (request.weather && !options.skipWeather) {
    pool = filterItemsByWeather(pool, request.weather);
  }

  if (!options.skipSeason) {
    pool = pool.filter((item) => itemMatchesSeason(item, season));
  }

  if (request.occasion && !options.skipOccasion) {
    pool = applyOccasionHardFilter(pool, request.occasion);
  }

  if (!options.skipTimeOfDay) {
    pool = applyTimeOfDayFilter(pool, request.timeOfDay);
  }

  return pool;
}

export function reinjectAnchors(
  pool: ClothingItem[],
  source: ClothingItem[],
  anchorIds: string[]
): ClothingItem[] {
  if (anchorIds.length === 0) return pool;
  const present = new Set(pool.map((item) => item.id));
  const extra = source.filter((item) => anchorIds.includes(item.id) && !present.has(item.id));
  if (extra.length === 0) return pool;
  return [...pool, ...extra];
}

export function canFormOutfit(pool: ClothingItem[]): boolean {
  let hasDress = false;
  let hasTop = false;
  let hasBottom = false;
  for (const item of pool) {
    const category = normalizeCategory(item.category);
    if (category === 'Dresses') hasDress = true;
    else if (category === 'Tops') hasTop = true;
    else if (category === 'Bottoms') hasBottom = true;
    if (hasDress || (hasTop && hasBottom)) return true;
  }
  return false;
}

export function missingOutfitCategories(pool: ClothingItem[]): string[] {
  const categories = new Set(pool.map((item) => normalizeCategory(item.category)));
  if (categories.has('Dresses')) return [];
  const missing: string[] = [];
  if (!categories.has('Tops')) missing.push('Tops');
  if (!categories.has('Bottoms')) missing.push('Bottoms');
  return missing;
}

export const RELAXATION_LEVELS: RelaxationLevel[] = [0, 1, 2, 3, 4];
