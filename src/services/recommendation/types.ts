import type { ClothingItem, OutfitGenerationFailure, WeatherData } from '../../types';
import type { DiversityConfig } from './ranking/diversityConfig';

export const ENGINE_VERSION = '2.6.0';

/** Schema version for the local preference vector. Not a learned model. */
export const PREFERENCE_VECTOR_VERSION = '1.0.0';

export type GenerationSource = 'local' | 'edge-fallback';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type RelaxationLevel = 0 | 1 | 2 | 3 | 4;

export type RecommendationArchetype = 'safe' | 'balanced' | 'bold' | 'minimal' | 'experimental';

export type RecommendationReasonType =
  | 'weather'
  | 'occasion'
  | 'style'
  | 'colour'
  | 'personalization'
  | 'novelty'
  | 'wardrobe'
  | 'compatibility'
  | 'formality'
  | 'diversity';

export type CanonicalSlot = 'Tops' | 'Bottoms' | 'Shoes' | 'Outerwear' | 'Accessories' | 'Dresses';

export interface CandidateLimits {
  Tops: number;
  Bottoms: number;
  Shoes: number;
  Outerwear: number;
  Accessories: number;
  Dresses: number;
}

export const DEFAULT_CANDIDATE_LIMITS: CandidateLimits = {
  Tops: 6,
  Bottoms: 6,
  Shoes: 4,
  Outerwear: 3,
  Accessories: 3,
  Dresses: 6,
};

export type RecommendationEventType =
  | 'impression'
  | 'view'
  | 'like'
  | 'dislike'
  | 'save'
  | 'swap'
  | 'remove'
  | 'wear'
  | 'share'
  | 'try_on'
  | 'dismiss';

export interface UserPreferenceVector {
  colors: Record<string, number>;
  categories: Record<string, number>;
  styles: Record<string, number>;
  occasions: Record<string, number>;
  brands: Record<string, number>;
  updatedAt: string;
}

/** itemId → embedding vector. Never fetched inside recommendOutfits. */
export type ItemEmbeddingMap = Record<string, number[]>;

export interface RecommendationRequest {
  userId?: string;
  occasion?: string;
  weather?: WeatherData;
  timeOfDay?: TimeOfDay;
  location?: string;
  season?: string;
  styleIds?: string[];
  stylePreferences?: string[];
  paletteId?: string;
  mustIncludeItemIds?: string[];
  excludeItemIds?: string[];
  count?: number;
  /**
   * Precomputed local preference vector. Never fetched inside recommendOutfits.
   * Missing or empty → cold-start style match.
   */
  preferenceVector?: UserPreferenceVector;
  /**
   * Optional item embeddings already loaded by the caller.
   * Missing → embedding compatibility is skipped (neutral, existing formula).
   */
  itemEmbeddings?: ItemEmbeddingMap;
}

export interface RankingWeights {
  compatibility: number;
  personalization: number;
  occasionFit: number;
  weatherFit: number;
  colourHarmony: number;
  formality: number;
  wearDiversity: number;
  novelty: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  compatibility: 0.25,
  personalization: 0.2,
  occasionFit: 0.15,
  weatherFit: 0.15,
  colourHarmony: 0.1,
  formality: 0.05,
  wearDiversity: 0.05,
  novelty: 0.05,
};

export interface RecommendEngineOptions {
  candidateLimits?: Partial<CandidateLimits>;
  maxComposed?: number;
  weights?: Partial<RankingWeights>;
  /** Set false to skip MMR. Partial config overrides defaults. */
  diversity?: Partial<DiversityConfig> | false;
}

export interface OutfitScoreBreakdown {
  compatibility: number;
  colourHarmony: number;
  formality: number;
  occasionFit: number;
  weatherFit: number;
  styleMatch: number;
  wearDiversity: number;
  /** Onboarding style match, plus behavioral affinity when a vector is present. */
  personalization: number;
  /** Wear freshness until Sprint 5 set-level novelty. */
  novelty: number;
  overall: number;
}

export interface RecommendationReason {
  type: RecommendationReasonType;
  text: string;
  score?: number;
  /** 0–1 internal confidence. Not shown in the product UI. */
  confidence?: number;
}

export interface RankedOutfit {
  id: string;
  items: ClothingItem[];
  score: OutfitScoreBreakdown;
  reasons: RecommendationReason[];
  archetype: RecommendationArchetype;
  confidence: number;
}

export interface RecommendationMetadata {
  candidateCount: number;
  filteredCount: number;
  composedCount: number;
  /** Ranked composed outfits before diversity selection. */
  rankedCount: number;
  finalCount: number;
  generatedAt: string;
  engineVersion: string;
  filtersRelaxed: boolean;
  relaxationLevel: RelaxationLevel;
  generationLatencyMs: number;
  averageScore: number;
  /** Caller supplied at least one usable item vector. */
  embeddingsAvailable: boolean;
  /** At least one scored pair used cosine similarity. */
  embeddingsUsed: boolean;
  embeddingModel?: string;
  embeddingVersion?: string;
  diversityApplied: boolean;
  diversityCandidatesConsidered: number;
  diversitySelected: number;
  diversityRejected: number;
  personalizationUsed: boolean;
  coldStart: boolean;
}

/** Lightweight pipeline trace for tests and __DEV__ logs. No wardrobe contents. */
export interface RecommendationTrace {
  engineVersion: string;
  candidateCount: number;
  composedCandidateCount: number;
  rankedCandidateCount: number;
  diversityEnabled: boolean;
  diversityCandidateCount?: number;
  finalRecommendationCount: number;
  personalizationUsed: boolean;
  coldStart: boolean;
}

export function toRecommendationTrace(metadata: RecommendationMetadata): RecommendationTrace {
  return {
    engineVersion: metadata.engineVersion,
    candidateCount: metadata.candidateCount,
    composedCandidateCount: metadata.composedCount,
    rankedCandidateCount: metadata.rankedCount,
    diversityEnabled: metadata.diversityApplied,
    diversityCandidateCount: metadata.diversityApplied
      ? metadata.diversityCandidatesConsidered
      : undefined,
    finalRecommendationCount: metadata.finalCount,
    personalizationUsed: metadata.personalizationUsed,
    coldStart: metadata.coldStart,
  };
}

export type RecommendationResult =
  | {
      ok: true;
      recommendations: RankedOutfit[];
      metadata: RecommendationMetadata;
    }
  | {
      ok: false;
      recommendations: [];
      failure: OutfitGenerationFailure;
      metadata: RecommendationMetadata;
    };

export interface SoftConstraintOptions {
  skipSeason: boolean;
  skipOccasion: boolean;
  skipWeather: boolean;
  skipTimeOfDay: boolean;
}

export interface CandidatePool {
  byCategory: Record<string, ClothingItem[]>;
  /** Retrieval aid only — never use this to prune complete outfit combinations. */
  preliminaryScores: Map<string, number>;
  totalCandidates: number;
}

export const CANONICAL_SLOTS: CanonicalSlot[] = [
  'Tops',
  'Bottoms',
  'Shoes',
  'Outerwear',
  'Accessories',
  'Dresses',
];
