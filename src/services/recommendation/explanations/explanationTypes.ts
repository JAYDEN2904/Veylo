import type { WeatherData } from '../../../types';
import type { OutfitScoreBreakdown, RecommendationReason, RecommendationReasonType } from '../types';

export type { RecommendationReason, RecommendationReasonType };

export const MAX_EXPLANATION_REASONS = 3;

export interface ExplanationContext {
  occasion?: string;
  weather?: Pick<WeatherData, 'temperature' | 'condition'> | WeatherData;
  stylePreferences?: string[];
  styleIds?: string[];
  /** True when a behavioral preference vector was injected. */
  personalizationUsed?: boolean;
  /** True when there is no behavioral signal. Blocks personalization claims. */
  coldStart?: boolean;
  /** True when MMR actually selected this outfit as an alternative. */
  diversitySelected?: boolean;
}

export interface ExplanationCandidate extends RecommendationReason {
  type: RecommendationReasonType;
  text: string;
  score: number;
  confidence: number;
  priority: number;
}

export interface ExplanationInput {
  breakdown: OutfitScoreBreakdown;
  context?: ExplanationContext;
}
