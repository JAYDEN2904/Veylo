import { DEFAULT_RANKING_WEIGHTS, type RankingWeights, type RecommendationRequest } from './types';

const WEIGHT_KEYS: (keyof RankingWeights)[] = [
  'compatibility',
  'personalization',
  'occasionFit',
  'weatherFit',
  'colourHarmony',
  'formality',
  'wearDiversity',
  'novelty',
];

const OCCASION_WEIGHT_TILTS: Record<string, Partial<RankingWeights>> = {
  Exercise: { occasionFit: 0.25, weatherFit: 0.2, compatibility: 0.2, personalization: 0.15 },
  'Date Night': { personalization: 0.25, occasionFit: 0.2, formality: 0.15, weatherFit: 0.1 },
  Formal: { formality: 0.15, occasionFit: 0.2, compatibility: 0.25 },
};

export function renormalizeWeights(weights: RankingWeights): RankingWeights {
  const total = WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
  if (total <= 0) return { ...DEFAULT_RANKING_WEIGHTS };
  const next = { ...weights };
  for (const key of WEIGHT_KEYS) {
    next[key] = weights[key] / total;
  }
  return next;
}

export function resolveRankingWeights(
  request: RecommendationRequest,
  overrides?: Partial<RankingWeights>
): RankingWeights {
  const occasionTilt = request.occasion ? (OCCASION_WEIGHT_TILTS[request.occasion] ?? {}) : {};
  const merged: RankingWeights = {
    ...DEFAULT_RANKING_WEIGHTS,
    ...occasionTilt,
    ...overrides,
  };
  return renormalizeWeights(merged);
}

export function weightedOverall(
  scores: RankingWeights,
  weights: RankingWeights,
  options: { includeWeather: boolean }
): number {
  const active = { ...weights };
  if (!options.includeWeather) active.weatherFit = 0;
  const normalized = renormalizeWeights(active);
  let total = 0;
  for (const key of WEIGHT_KEYS) {
    total += scores[key] * normalized[key];
  }
  return Math.round(total);
}
