import type { ClothingItem } from '../../../types';
import type { RecommendationRequest } from '../types';

export interface GoldenExpectations {
  requiredCategories?: string[];
  forbiddenCategories?: string[];
  preferredColours?: string[];
  forbiddenColours?: string[];
  preferredStyles?: string[];
  preferredOccasions?: string[];
  minScore?: number;
  maxResults?: number;
  shouldUsePersonalization?: boolean;
  shouldRespectWeather?: boolean;
  shouldRespectOccasion?: boolean;
}

export interface GoldenScenario {
  id: string;
  description: string;
  wardrobe: ClothingItem[];
  request: RecommendationRequest;
  expectations: GoldenExpectations;
}

export interface ScenarioEvaluation {
  scenarioId: string;
  ok: boolean;
  constraintPassed: boolean;
  occasionFit: boolean | null;
  weatherFit: boolean | null;
  personalizationActivated: boolean | null;
  hasDuplicate: boolean;
  pairwiseSimilarity: number | null;
  topScore: number | null;
}

export interface EvaluationMetrics {
  scenarioCount: number;
  successfulCount: number;
  constraintPassRate: number;
  occasionFitRate: number;
  weatherFitRate: number;
  personalizationActivationRate: number;
  duplicateRate: number;
  averagePairwiseSimilarity: number;
  diversityPassRate: number;
  averageTopScore: number;
}

/**
 * Regression thresholds. Hard constraints are strict; style/weather/occasion
 * are softer because the engine may relax filters on small or incomplete closets.
 *
 * constraintPassRate ≥ 0.95 — generated outfits must obey wardrobe membership,
 *   must-include/exclude, and top+bottom or dress coverage.
 * duplicateRate = 0 — exact item-set duplicates are a ranking bug.
 * occasionFitRate ≥ 0.80 — top look should usually match the requested occasion
 *   when the closet can support it; not 1.0 because relaxation exists.
 * weatherFitRate ≥ 0.75 — weather is a soft constraint after level 2.
 * personalizationActivationRate = 1.0 — scenarios that inject a behavioral
 *   vector must be flagged as personalized.
 * diversityPassRate ≥ 0.85 — multi-result lists should not be near-duplicates.
 */
export const EVALUATION_THRESHOLDS = {
  constraintPassRate: 0.95,
  duplicateRate: 0,
  occasionFitRate: 0.8,
  weatherFitRate: 0.75,
  personalizationActivationRate: 1,
  diversityPassRate: 0.85,
} as const;

export const OCCASION_FIT_SCORE_MIN = 55;
export const WEATHER_FIT_SCORE_MIN = 55;
export const DIVERSITY_SIMILARITY_MAX = 0.92;
