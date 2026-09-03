import {
  ClothingItem,
  Outfit,
  WeatherData,
  OutfitGenerationResult,
  OutfitGenerationFailure,
} from '../types';
import { scoreOutfitWeatherAppropriateness } from '../utils/weatherOutfitFilter';
import { withNormalizedCategories, normalizeCategory } from './outfitCategoryNormalize';
import { scoreOutfitDimensions, clothingItemToScoringInput } from './outfitDimensionScoring';
import { recommendOutfits } from './recommendation/recommendationEngine';
import { itemMatchesSeason, getCurrentSeason } from './recommendation/constraintEngine';
import { OCCASION_TAG_KEYWORDS, buildStyleBoostTerms } from './recommendation/styleTerms';
import type {
  RankedOutfit,
  RecommendationRequest,
  UserPreferenceVector,
} from './recommendation/types';

export { OCCASION_TAG_KEYWORDS };
export { getCurrentSeason };

export interface OutfitGenerationContext {
  /** Canonical occasion key, e.g. Casual, Work — set by store from flow id */
  occasionKey?: string;
  weather?: WeatherData;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  location?: string;
  season?: string;
  /** Profile StylePreference values */
  stylePreferences?: string[];
  /** Flow step style chip ids: minimal, classic, ... */
  flowStyleIds?: string[];
  paletteId?: string;
  /** Force wardrobe items into the generated outfit (Insights "Style this", Create Outfit). */
  mustIncludeItemIds?: string[];
  /** @deprecated Use mustIncludeItemIds — kept for single-item callers */
  mustIncludeItemId?: string;
  /** Local preference vector. Must already be in memory — never fetched here. */
  preferenceVector?: UserPreferenceVector;
  userId?: string;
}

export interface OutfitVariation {
  outfit: Outfit;
  variationScore: number;
  description: string;
}

/** Flow occasion ids from GenerateOutfitFlow → generator keys */
export const FLOW_OCCASION_TO_GENERATOR_KEY: Record<string, string> = {
  casual: 'Casual',
  work: 'Work',
  date: 'Date Night',
  party: 'Party',
  sport: 'Exercise',
  formal: 'Formal',
};

/** Resolve flow occasion id or canonical key to generator occasionKey */
export function resolveOccasionKey(raw?: string): string {
  if (!raw) return 'Casual';
  if (FLOW_OCCASION_TO_GENERATOR_KEY[raw]) return FLOW_OCCASION_TO_GENERATOR_KEY[raw];
  if (OCCASION_TAG_KEYWORDS[raw]) return raw;
  return 'Casual';
}

/** Normalize singular + plural anchor ids from generation context or store options. */
export function resolveMustIncludeItemIds(
  source:
    | Pick<OutfitGenerationContext, 'mustIncludeItemIds' | 'mustIncludeItemId'>
    | Record<string, unknown>
): string[] {
  const fromArray =
    'mustIncludeItemIds' in source && Array.isArray(source.mustIncludeItemIds)
      ? source.mustIncludeItemIds
      : 'mustIncludeItemIds' in source &&
          Array.isArray((source as Record<string, unknown>).mustIncludeItemIds)
        ? ((source as Record<string, unknown>).mustIncludeItemIds as unknown[])
        : null;

  if (fromArray) {
    return fromArray.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  const singular =
    'mustIncludeItemId' in source && typeof source.mustIncludeItemId === 'string'
      ? source.mustIncludeItemId
      : typeof (source as Record<string, unknown>).mustIncludeItemId === 'string'
        ? ((source as Record<string, unknown>).mustIncludeItemId as string)
        : undefined;

  return singular ? [singular] : [];
}

export function createOutfitId(): string {
  return `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const isSeasonallyAppropriate = (outfit: Outfit, season?: string): boolean => {
  const currentSeason = season || getCurrentSeason();
  return outfit.items.every((item) => itemMatchesSeason(item, currentSeason));
};

export function toRecommendationRequest(
  context: OutfitGenerationContext,
  count: number = 5
): RecommendationRequest {
  const mustIncludeItemIds = resolveMustIncludeItemIds(context);
  return {
    occasion: context.occasionKey ?? 'Casual',
    weather: context.weather,
    timeOfDay: context.timeOfDay,
    location: context.location,
    season: context.season,
    styleIds: context.flowStyleIds,
    stylePreferences: context.stylePreferences,
    paletteId: context.paletteId,
    mustIncludeItemIds: mustIncludeItemIds.length > 0 ? mustIncludeItemIds : undefined,
    count,
    preferenceVector: context.preferenceVector,
    userId: context.userId,
  };
}

function outfitTagsFor(items: ClothingItem[], occasionKey: string): string[] {
  const tags = items
    .flatMap((item) => item.tags)
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .slice(0, 5);
  tags.unshift(occasionKey.toLowerCase());
  return tags;
}

function rankedToOutfit(
  ranked: RankedOutfit,
  context: OutfitGenerationContext,
  usedRelaxedFilters: boolean
): Outfit {
  const occasionKey = context.occasionKey ?? 'Casual';
  return {
    id: ranked.id,
    name: occasionKey,
    items: ranked.items,
    createdAt: new Date().toISOString(),
    tags: outfitTagsFor(ranked.items, occasionKey),
    isFavorite: false,
    occasion: occasionKey,
    weatherAppropriate: context.weather
      ? scoreOutfitWeatherAppropriateness(ranked.items, context.weather) > 70
      : undefined,
    usedRelaxedFilters,
    fitScore: ranked.score.overall,
    fitReasoning: ranked.reasons.map((reason) => reason.text),
    styleMatchScore: ranked.score.styleMatch,
  };
}

function failure(
  reason: OutfitGenerationFailure['reason'],
  message: string,
  missingCategories?: string[]
): OutfitGenerationResult {
  return { ok: false, failure: { reason, message, missingCategories } };
}

/**
 * Generate a context-aware outfit via the v2 recommendation engine.
 * Compatibility wrapper — callers keep the original result shape.
 */
export function generateContextAwareOutfit(
  items: ClothingItem[],
  context: OutfitGenerationContext
): OutfitGenerationResult {
  const ranked = generateRankedOutfits(items, context, 1);
  if (ranked.length === 0) {
    return failure(
      'filters_too_strict',
      'No items match the weather, season, and occasion. Try a different occasion or add more versatile pieces.'
    );
  }
  return ranked[0];
}

/**
 * Generate up to `count` distinct ranked outfits from the wardrobe (local path).
 */
export function generateRankedOutfits(
  items: ClothingItem[],
  context: OutfitGenerationContext,
  count: number = 3
): OutfitGenerationResult[] {
  const result = recommendOutfits(items, toRecommendationRequest(context, count));
  if (!result.ok) {
    return [{ ok: false, failure: result.failure }];
  }

  return result.recommendations.map((ranked) => ({
    ok: true as const,
    outfit: rankedToOutfit(ranked, context, result.metadata.filtersRelaxed),
    usedRelaxedFilters: result.metadata.filtersRelaxed,
  }));
}

export function enrichOutfitWithDimensionScores(
  outfit: Outfit,
  context: OutfitGenerationContext
): Outfit {
  const styleTerms = buildStyleBoostTerms(toRecommendationRequest(context));
  const occasionKey = context.occasionKey ?? 'Casual';
  const inputs = outfit.items.map(clothingItemToScoringInput);
  const scored = scoreOutfitDimensions(inputs, {
    styleTerms,
    weather: context.weather,
    occasion: occasionKey,
  });

  return {
    ...outfit,
    fitScore: scored.composite,
    fitReasoning: scored.reasoning,
    styleMatchScore: scored.dimensions.styleProfile,
  };
}

export const generateOutfitVariations = (
  baseOutfit: Outfit,
  allItems: ClothingItem[],
  maxVariations: number = 3
): OutfitVariation[] => {
  const variations: OutfitVariation[] = [];
  const normalizedWardrobe = withNormalizedCategories(
    allItems.filter((i) => i.status === 'active')
  );

  baseOutfit.items.forEach((baseItem, index) => {
    if (variations.length >= maxVariations) return;

    const canon = normalizeCategory(baseItem.category);
    const alternatives = normalizedWardrobe.filter(
      (item) => normalizeCategory(item.category) === canon && item.id !== baseItem.id
    );

    if (alternatives.length > 0) {
      const alternative = alternatives[0];
      const variationItems = [...baseOutfit.items];
      variationItems[index] = alternative;

      const variation: Outfit = {
        ...baseOutfit,
        id: `variation-${Date.now()}-${index}`,
        items: variationItems,
        name: `${baseOutfit.name} (Variation ${variations.length + 1})`,
      };

      variations.push({
        outfit: variation,
        variationScore: 50,
        description: `Swapped ${canon.toLowerCase()} for alternative`,
      });
    }
  });

  return variations;
};
