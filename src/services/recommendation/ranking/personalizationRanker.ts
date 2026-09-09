import type { ClothingItem } from '../../../types';
import { normalizeCategory } from '../../outfitCategoryNormalize';
import { scoreOutfitStyleMatch, styleFamiliesForItem } from '../compatibility/styleCompatibility';
import { buildStyleBoostTerms } from '../styleTerms';
import {
  hasBehavioralSignal,
  normalizePreferenceKey,
} from '../feedback/recommendationFeedback';
import type { RecommendationRequest, UserPreferenceVector } from '../types';

const COLOR_WEIGHT = 0.35;
const STYLE_WEIGHT = 0.25;
const CATEGORY_WEIGHT = 0.2;
const BRAND_WEIGHT = 0.1;
const OCCASION_WEIGHT = 0.1;
const AFFINITY_SCALE = 0.8;
const PERSONALIZATION_DELTA = 25;

function meanOrZero(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function lookup(bucket: Record<string, number>, key: string): number {
  return bucket[key] ?? 0;
}

function itemAffinity(
  item: ClothingItem,
  vector: UserPreferenceVector,
  occasion?: string
): number {
  const colorHits = (item.colors ?? []).map((color) =>
    lookup(vector.colors, normalizePreferenceKey(color))
  );
  const families = styleFamiliesForItem(item);
  const styleHits = families.map((family) => lookup(vector.styles, family));
  const category = lookup(
    vector.categories,
    normalizePreferenceKey(normalizeCategory(item.category))
  );
  const brand = item.brand ? lookup(vector.brands, normalizePreferenceKey(item.brand)) : 0;
  const occasionHit = occasion
    ? lookup(vector.occasions, normalizePreferenceKey(occasion))
    : 0;

  return (
    COLOR_WEIGHT * meanOrZero(colorHits) +
    STYLE_WEIGHT * meanOrZero(styleHits) +
    CATEGORY_WEIGHT * category +
    BRAND_WEIGHT * brand +
    OCCASION_WEIGHT * occasionHit
  );
}

/**
 * Outfit affinity against learned preferences. Positive = user has rewarded
 * matching colours/styles; negative = they rejected those traits.
 */
export function scoreOutfitAffinity(
  items: ClothingItem[],
  vector: UserPreferenceVector,
  occasion?: string
): number {
  if (items.length === 0) return 0;
  const affinities = items.map((item) => itemAffinity(item, vector, occasion));
  const mean = meanOrZero(affinities);
  const weakest = Math.min(...affinities);
  return 0.6 * mean + 0.4 * weakest;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Cold start: same as onboarding style match.
 * With behavioral data: style match plus a bounded affinity delta so a
 * liked navy look can outrank an equally coherent generic one.
 */
export function scorePersonalization(
  items: ClothingItem[],
  request: RecommendationRequest
): number {
  const styleTerms = buildStyleBoostTerms(request);
  const styleMatch = scoreOutfitStyleMatch(items, styleTerms);
  const vector = request.preferenceVector;
  if (!hasBehavioralSignal(vector) || !vector) {
    return styleMatch;
  }

  const affinity = scoreOutfitAffinity(items, vector, request.occasion);
  if (Math.abs(affinity) < 0.04) {
    return styleMatch;
  }

  return clampScore(styleMatch + PERSONALIZATION_DELTA * Math.tanh(affinity / AFFINITY_SCALE));
}
