import type { RecommendationEventType, GenerationSource } from '../types';

export const ANALYTICS_EVENT_TYPES: readonly RecommendationEventType[] = [
  'impression',
  'view',
  'like',
  'dislike',
  'save',
  'swap',
  'remove',
  'wear',
  'share',
  'try_on',
  'dismiss',
] as const;

/**
 * Structured metadata stored on recommendation_events.metadata JSONB.
 * Reconstructs why an outfit was recommended without extra columns.
 */
export interface RecommendationAnalyticsMetadata {
  engineVersion: string;
  generationSource?: GenerationSource;
  occasion?: string;
  weather?: {
    temperature?: number;
    condition?: string;
    precipitationProbability?: number;
  };
  styleContext?: string[];
  personalizationUsed?: boolean;
  coldStart?: boolean;
  preferenceVectorVersion?: string;
  embeddingModel?: string;
  embeddingVersion?: string;
  finalScore?: number;
  compatibilityScore?: number;
  personalizationScore?: number;
  occasionScore?: number;
  weatherScore?: number;
  colourHarmonyScore?: number;
  formalityScore?: number;
  wearDiversityScore?: number;
  noveltyScore?: number;
  diversityScore?: number;
  recommendationPosition?: number;
  candidateCount?: number;
  composedCandidateCount?: number;
  rankedCandidateCount?: number;
  diversityCandidateCount?: number;
  diversityApplied?: boolean;
  diversitySelected?: boolean;
  explanationReasons?: string[];
}

export interface AnalyticsEvent {
  eventType: RecommendationEventType;
  sessionId?: string | null;
  outfitId?: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

export interface RecommendationFunnelCounts {
  impressions: number;
  views: number;
  likes: number;
  dislikes: number;
  saves: number;
  wears: number;
  swaps: number;
  removes: number;
  shares: number;
  tryOns: number;
  dismissals: number;
}

/**
 * Rates use impressions as the denominator unless noted.
 *
 * viewRate     = views / impressions
 * likeRate     = likes / impressions
 * saveRate     = saves / impressions
 * wearRate     = wears / impressions
 * swapRate     = swaps / impressions
 * dismissRate  = dismissals / impressions
 * tryOnRate    = try_ons / impressions
 *
 * viewedLikeRate = likes / views (engagement among outfits that were actually opened)
 */
export interface RecommendationFunnelRates {
  viewRate: number;
  likeRate: number;
  saveRate: number;
  wearRate: number;
  swapRate: number;
  dismissRate: number;
  tryOnRate: number;
  viewedLikeRate: number;
}

export interface RecommendationFunnelMetrics extends RecommendationFunnelCounts, RecommendationFunnelRates {}

export interface PositionAnalytics {
  position: number;
  impressions: number;
  views: number;
  likes: number;
  saves: number;
  wears: number;
  swaps: number;
}

export type RecommendationContextDimension =
  | 'occasion'
  | 'weather'
  | 'personalization'
  | 'engineVersion'
  | 'generationSource';

export interface ContextAnalyticsBucket extends RecommendationFunnelMetrics {
  key: string;
  dimension: RecommendationContextDimension;
}

export interface BuildAnalyticsMetadataInput {
  engineVersion: string;
  generationSource?: GenerationSource;
  occasion?: string;
  weather?: unknown;
  styleContext?: unknown;
  personalizationUsed?: boolean;
  coldStart?: boolean;
  preferenceVectorVersion?: string;
  embeddingModel?: string;
  embeddingVersion?: string;
  embeddingsUsed?: boolean;
  scoreBreakdown?: {
    overall?: number;
    compatibility?: number;
    personalization?: number;
    occasionFit?: number;
    weatherFit?: number;
    colourHarmony?: number;
    formality?: number;
    wearDiversity?: number;
    novelty?: number;
  };
  recommendationPosition?: number;
  candidateCount?: number;
  composedCandidateCount?: number;
  rankedCandidateCount?: number;
  diversityCandidateCount?: number;
  diversityApplied?: boolean;
  diversitySelected?: boolean;
  explanationReasons?: string[];
}
