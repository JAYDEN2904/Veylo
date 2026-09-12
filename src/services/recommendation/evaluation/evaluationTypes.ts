import type { ClothingItem } from '../../../types';
import type { RecommendationRequest } from '../types';

/**
 * Golden-dataset expectations. This dataset is a deterministic
 * regression/evaluation fixture — not a substitute for real-user feedback.
 *
 * Hard constraints (required/forbidden categories and colours, wardrobe
 * membership, must-include/exclude) can fail a scenario.
 *
 * Preferred colour/style are evaluation-only: they are tracked as metrics
 * and are not recommendation-engine hard constraints.
 */
export interface GoldenExpectations {
  requiredCategories?: string[];
  forbiddenCategories?: string[];
  /** Soft: at least one recommended item uses a matching colour key. */
  preferredColours?: string[];
  forbiddenColours?: string[];
  /** Soft: at least one recommended item belongs to a matching style family. */
  preferredStyles?: string[];
  /**
   * Descriptive only. Occasion fit reuses `shouldRespectOccasion` + engine
   * `occasionFit` — do not interpret this as a second occasion scorer.
   */
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

export interface ExpectationEvaluation {
  /** Set only when `preferredColours` is defined. Soft preference, not a hard constraint. */
  colourPreferencePassed?: boolean;
  /** Set only when `preferredStyles` is defined. Soft preference, not a hard constraint. */
  stylePreferencePassed?: boolean;
}

export interface ScenarioEvaluation extends ExpectationEvaluation {
  scenarioId: string;
  /** Engine produced at least one recommendation. */
  ok: boolean;
  /** Structural / hard-requirement validity only. Independent of minScore. */
  hardConstraintPassed: boolean;
  /** `topScore >= minScore`, or true when the scenario has no minScore. */
  scoreThresholdPassed: boolean;
  /**
   * Objective scenario outcome: generation succeeded, hard constraints held,
   * score threshold held, and the list has no exact duplicates.
   * Preferred colour/style/occasion/weather are not required here.
   */
  scenarioPassed: boolean;
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
  /** Fraction of scenarios whose recommendations satisfied hard requirements. */
  hardConstraintPassRate: number;
  /** Fraction whose top score met `minScore` (scenarios without minScore count as pass). */
  scoreThresholdPassRate: number;
  /** Fraction that passed the objective scenario outcome. */
  scenarioPassRate: number;
  occasionFitRate: number;
  weatherFitRate: number;
  personalizationActivationRate: number;
  colourPreferenceRate: number;
  stylePreferenceRate: number;
  duplicateRate: number;
  averagePairwiseSimilarity: number;
  diversityPassRate: number;
  averageTopScore: number;
}

/**
 * Regression thresholds. Hard constraints and duplicates are strict;
 * style/weather/occasion/colour preferences are softer because they are
 * not engine hard constraints and the engine may relax filters.
 *
 * hardConstraintPassRate ≥ 0.95 — wardrobe membership, must-include/exclude,
 *   required/forbidden categories, and top+bottom or dress coverage.
 * scoreThresholdPassRate ≥ 0.95 — scenarios that set minScore must meet it;
 *   most golden rows omit minScore and therefore pass this check.
 * scenarioPassRate ≥ 0.95 — objective pass (hard + score + no duplicates).
 * duplicateRate = 0 — exact item-set duplicates are a ranking bug.
 * occasionFitRate ≥ 0.80 — top look should usually match the requested occasion
 *   when the closet can support it; not 1.0 because relaxation exists.
 * weatherFitRate ≥ 0.75 — weather is a soft constraint after level 2.
 * personalizationActivationRate = 1.0 — scenarios that inject a behavioral
 *   vector must be flagged as personalized.
 * diversityPassRate ≥ 0.85 — multi-result lists should not be near-duplicates.
 */
export const EVALUATION_THRESHOLDS = {
  hardConstraintPassRate: 0.95,
  scoreThresholdPassRate: 0.95,
  scenarioPassRate: 0.95,
  duplicateRate: 0,
  occasionFitRate: 0.8,
  weatherFitRate: 0.75,
  personalizationActivationRate: 1,
  diversityPassRate: 0.85,
} as const;

export const OCCASION_FIT_SCORE_MIN = 55;
export const WEATHER_FIT_SCORE_MIN = 55;
export const DIVERSITY_SIMILARITY_MAX = 0.92;
