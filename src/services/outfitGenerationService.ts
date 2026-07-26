import {
  ClothingItem,
  Outfit,
  WeatherData,
  OutfitGenerationResult,
  OutfitGenerationFailure,
} from '../types';
import {
  filterItemsByWeather,
  scoreOutfitWeatherAppropriateness,
} from '../utils/weatherOutfitFilter';
import { withNormalizedCategories, normalizeCategory } from './outfitCategoryNormalize';
import { scoreItemForSlot, ScoreContext } from './outfitScoring';
import { scoreOutfitDimensions, clothingItemToScoringInput } from './outfitDimensionScoring';

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
  /** Force this wardrobe item into the generated outfit (Insights "Style this"). */
  mustIncludeItemId?: string;
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

export const OCCASION_TAG_KEYWORDS: Record<string, string[]> = {
  Work: ['work', 'business', 'professional', 'office'],
  Casual: ['casual', 'everyday', 'weekend', 'comfort'],
  Formal: ['formal', 'elegant', 'dressy', 'event', 'wedding'],
  Exercise: ['sport', 'workout', 'athletic', 'gym', 'active'],
  'Date Night': ['date', 'night', 'romantic', 'evening'],
  Party: ['party', 'evening', 'night', 'celebration', 'cocktail'],
};

/** Resolve flow occasion id or canonical key to generator occasionKey */
export function resolveOccasionKey(raw?: string): string {
  if (!raw) return 'Casual';
  if (FLOW_OCCASION_TO_GENERATOR_KEY[raw]) return FLOW_OCCASION_TO_GENERATOR_KEY[raw];
  if (OCCASION_TAG_KEYWORDS[raw]) return raw;
  return 'Casual';
}

const STYLE_PREF_TERMS: Record<string, string[]> = {
  minimalist: ['minimal', 'minimalist', 'clean'],
  casual: ['casual', 'relaxed', 'comfort'],
  formal: ['formal', 'tailored', 'dressy'],
  streetwear: ['street', 'urban', 'streetwear'],
  bohemian: ['boho', 'bohemian', 'flowy'],
  vintage: ['vintage', 'retro'],
};

const FLOW_STYLE_TERMS: Record<string, string[]> = {
  minimal: ['minimal', 'minimalist', 'clean'],
  classic: ['classic', 'tailored', 'timeless'],
  trendy: ['trendy', 'modern', 'streetwear'],
  bold: ['bold', 'statement'],
  relaxed: ['relaxed', 'casual', 'comfort'],
  elegant: ['elegant', 'refined', 'dressy'],
};

const SLOT_ORDER = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'] as const;

export function createOutfitId(): string {
  return `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const getCurrentSeason = (): string => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
};

export const isSeasonallyAppropriate = (outfit: Outfit, season?: string): boolean => {
  const currentSeason = season || getCurrentSeason();
  return outfit.items.every((item) => {
    if (!item.season || item.season.length === 0) return true;
    return item.season.includes(currentSeason);
  });
};

function buildStyleBoostTerms(context: OutfitGenerationContext): string[] {
  const terms = new Set<string>();
  (context.stylePreferences ?? []).forEach((pref) => {
    (STYLE_PREF_TERMS[pref] ?? [pref]).forEach((t) => terms.add(t.toLowerCase()));
  });
  (context.flowStyleIds ?? []).forEach((id) => {
    (FLOW_STYLE_TERMS[id] ?? []).forEach((t) => terms.add(t.toLowerCase()));
  });
  return [...terms];
}

function applyOccasionFilter(items: ClothingItem[], occasionKey: string): ClothingItem[] {
  const tags = OCCASION_TAG_KEYWORDS[occasionKey];
  if (!tags?.length) return items;
  return items.filter((item) =>
    item.tags.some((tag) => tags.some((kw) => tag.toLowerCase().includes(kw.toLowerCase())))
  );
}

function filterPipeline(
  items: ClothingItem[],
  context: OutfitGenerationContext,
  options: { skipOccasion: boolean }
): ClothingItem[] {
  let pool = items.filter((item) => item.status === 'active');
  const currentSeason = context.season || getCurrentSeason();

  if (context.weather) {
    pool = filterItemsByWeather(pool, context.weather);
  }

  pool = pool.filter((item) => {
    if (!item.season || item.season.length === 0) return true;
    return item.season.includes(currentSeason);
  });

  if (context.occasionKey && !options.skipOccasion) {
    pool = applyOccasionFilter(pool, context.occasionKey);
  }

  if (context.timeOfDay === 'evening') {
    pool = pool.filter(
      (item) =>
        !item.tags.some((tag) => {
          const t = tag.toLowerCase();
          return t.includes('daytime') || t.includes('beach');
        })
    );
  }

  return pool;
}

function groupByCategory(items: ClothingItem[]): Record<string, ClothingItem[]> {
  const map: Record<string, ClothingItem[]> = {};
  for (const item of items) {
    const cat = normalizeCategory(item.category);
    if (!map[cat]) map[cat] = [];
    map[cat].push({ ...item, category: cat });
  }
  return map;
}

function pickBestInCategory(
  candidates: ClothingItem[],
  ctx: ScoreContext,
  picked: ClothingItem[]
): ClothingItem | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = scoreItemForSlot(best, ctx, picked);
  for (let i = 1; i < candidates.length; i++) {
    const s = scoreItemForSlot(candidates[i], ctx, picked);
    if (s > bestScore) {
      bestScore = s;
      best = candidates[i];
    }
  }
  return best;
}

function prefersDressPath(occasionKey?: string): boolean {
  if (!occasionKey) return false;
  return ['Formal', 'Date Night', 'Party'].includes(occasionKey);
}

function buildScoreContext(context: OutfitGenerationContext): ScoreContext {
  const occasionKey = context.occasionKey ?? 'Casual';
  return {
    occasionTagKeywords: OCCASION_TAG_KEYWORDS[occasionKey] ?? OCCASION_TAG_KEYWORDS.Casual,
    styleBoostTerms: buildStyleBoostTerms(context),
    weather: context.weather,
    paletteId: context.paletteId,
    occasionKey,
  };
}

function pickDressBasedOutfit(
  grouped: Record<string, ClothingItem[]>,
  scoreCtx: ScoreContext,
  forced: ClothingItem | null
): ClothingItem[] | null {
  const dresses = grouped['Dresses'] ?? [];
  if (dresses.length === 0 && normalizeCategory(forced?.category ?? '') !== 'Dresses') {
    return null;
  }

  const picked: ClothingItem[] = [];
  const forcedIsDress = forced != null && normalizeCategory(forced.category) === 'Dresses';
  const dress = forcedIsDress ? forced : pickBestInCategory(dresses, scoreCtx, picked);
  if (!dress) return null;
  picked.push(dress);

  const optionalSlots = ['Shoes', 'Outerwear', 'Accessories'] as const;
  for (const slot of optionalSlots) {
    if (forced && !forcedIsDress && normalizeCategory(forced.category) === slot) {
      picked.push(forced);
      continue;
    }
    const list = (grouped[slot] ?? []).filter((item) => item.id !== forced?.id);
    const next = pickBestInCategory(list, scoreCtx, picked);
    if (next) picked.push(next);
  }

  return picked;
}

function pickStandardOutfit(
  grouped: Record<string, ClothingItem[]>,
  scoreCtx: ScoreContext,
  forced: ClothingItem | null
): ClothingItem[] | null {
  const picked: ClothingItem[] = [];
  const forcedCat = forced ? normalizeCategory(forced.category) : null;

  for (const slot of SLOT_ORDER) {
    if (forced && forcedCat === slot) {
      picked.push(forced);
      continue;
    }
    const list = (grouped[slot] ?? []).filter((item) => item.id !== forced?.id);
    const next = pickBestInCategory(list, scoreCtx, picked);
    if (next) picked.push(next);
  }

  // Forced item outside core slots (e.g. odd category) — append if missing
  if (forced && !picked.some((item) => item.id === forced.id)) {
    picked.push(forced);
  }

  const cats = new Set(picked.map((i) => normalizeCategory(i.category)));
  const hasDress = cats.has('Dresses');
  const hasTopBottom = cats.has('Tops') && cats.has('Bottoms');

  if (hasDress || hasTopBottom) {
    return picked.length > 0 ? picked : null;
  }

  return null;
}

function meetsMinimumCoverage(items: ClothingItem[]): boolean {
  const cats = new Set(items.map((i) => normalizeCategory(i.category)));
  if (cats.has('Dresses')) return true;
  return cats.has('Tops') && cats.has('Bottoms');
}

function resolveForcedItem(pool: ClothingItem[], mustIncludeItemId?: string): ClothingItem | null {
  if (!mustIncludeItemId) return null;
  return pool.find((item) => item.id === mustIncludeItemId) ?? null;
}

function tryBuildOutfit(
  pool: ClothingItem[],
  context: OutfitGenerationContext
): ClothingItem[] | null {
  const grouped = groupByCategory(pool);
  const scoreCtx = buildScoreContext(context);
  const occasionKey = context.occasionKey ?? 'Casual';
  const forced = resolveForcedItem(pool, context.mustIncludeItemId);
  const forcedIsDress = forced != null && normalizeCategory(forced.category) === 'Dresses';

  if (forcedIsDress || prefersDressPath(occasionKey)) {
    const dressOutfit = pickDressBasedOutfit(grouped, scoreCtx, forced);
    if (dressOutfit && meetsMinimumCoverage(dressOutfit)) {
      return dressOutfit;
    }
  }

  const standard = pickStandardOutfit(grouped, scoreCtx, forced);
  if (standard && meetsMinimumCoverage(standard)) {
    return standard;
  }

  if ((grouped['Dresses'] ?? []).length > 0 || forcedIsDress) {
    const dressOutfit = pickDressBasedOutfit(grouped, scoreCtx, forced);
    if (dressOutfit && meetsMinimumCoverage(dressOutfit)) return dressOutfit;
  }

  return null;
}

function failure(
  reason: OutfitGenerationFailure['reason'],
  message: string,
  missingCategories?: string[]
): OutfitGenerationResult {
  return { ok: false, failure: { reason, message, missingCategories } };
}

/**
 * Generate context-aware outfit using scored selection and category normalization.
 */
export function generateContextAwareOutfit(
  items: ClothingItem[],
  context: OutfitGenerationContext
): OutfitGenerationResult {
  const active = items.filter((i) => i.status === 'active');
  if (active.length === 0) {
    return failure('empty_wardrobe', 'Add items to your closet to generate an outfit.');
  }

  const normalized = withNormalizedCategories(active);

  if (context.mustIncludeItemId) {
    const mustExist = normalized.find((item) => item.id === context.mustIncludeItemId);
    if (!mustExist) {
      return failure(
        'filters_too_strict',
        'That item is no longer in your active wardrobe. Pull to refresh and try again.'
      );
    }
  }

  let pool = filterPipeline(normalized, context, { skipOccasion: false });
  let usedRelaxed = false;

  if (pool.length === 0) {
    pool = filterPipeline(normalized, context, { skipOccasion: true });
    usedRelaxed = true;
  }

  // Always keep the anchored item in the pool even when filters would drop it.
  if (context.mustIncludeItemId) {
    const forced = normalized.find((item) => item.id === context.mustIncludeItemId);
    if (forced && !pool.some((item) => item.id === forced.id)) {
      pool = [...pool, forced];
      usedRelaxed = true;
    }
  }

  if (pool.length === 0) {
    return failure(
      'filters_too_strict',
      'No items match the weather, season, and occasion. Try a different occasion or add more versatile pieces.'
    );
  }

  let outfitItems = tryBuildOutfit(pool, context);

  if (!outfitItems && !usedRelaxed && context.occasionKey) {
    pool = filterPipeline(normalized, context, { skipOccasion: true });
    usedRelaxed = true;
    outfitItems = tryBuildOutfit(pool, context);
  }

  if (!outfitItems || outfitItems.length === 0) {
    const grouped = groupByCategory(pool);
    const missing: string[] = [];
    if (!(grouped['Dresses'] ?? []).length) {
      if (!(grouped['Tops'] ?? []).length) missing.push('Tops');
      if (!(grouped['Bottoms'] ?? []).length) missing.push('Bottoms');
    }
    return failure(
      'insufficient_categories',
      'You need at least a top and bottom, or a dress, to build an outfit. Add those categories or relax filters.',
      missing.length ? missing : undefined
    );
  }

  const occasionKey = context.occasionKey ?? 'Casual';
  const outfitTags = outfitItems
    .flatMap((item) => item.tags)
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .slice(0, 5);
  outfitTags.unshift(occasionKey.toLowerCase());

  const outfit: Outfit = {
    id: createOutfitId(),
    name: occasionKey,
    items: outfitItems,
    createdAt: new Date().toISOString(),
    tags: outfitTags,
    isFavorite: false,
    occasion: occasionKey,
    weatherAppropriate: context.weather
      ? scoreOutfitWeatherAppropriateness(outfitItems, context.weather) > 70
      : undefined,
    usedRelaxedFilters: usedRelaxed,
  };

  return { ok: true, outfit, usedRelaxedFilters: usedRelaxed };
}

/**
 * Generate up to `count` distinct ranked outfits from the wardrobe (local path).
 */
export function generateRankedOutfits(
  items: ClothingItem[],
  context: OutfitGenerationContext,
  count: number = 3
): OutfitGenerationResult[] {
  const results: OutfitGenerationResult[] = [];
  const usedItemIds = new Set<string>();
  const max = Math.min(Math.max(count, 1), 5);

  for (let i = 0; i < max; i++) {
    const available = items.filter((item) => !usedItemIds.has(item.id));
    const result = generateContextAwareOutfit(available, context);
    if (!result.ok) break;

    for (const item of result.outfit.items) {
      usedItemIds.add(item.id);
    }
    results.push(result);
  }

  return results;
}

export function enrichOutfitWithDimensionScores(
  outfit: Outfit,
  context: OutfitGenerationContext
): Outfit {
  const styleTerms = buildStyleBoostTerms(context);
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
