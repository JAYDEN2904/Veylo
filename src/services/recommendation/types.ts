import type { ClothingItem, OutfitGenerationFailure, WeatherData } from '../../types';

export const ENGINE_VERSION = '2.0.1';

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
  | 'compatibility';

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
}

export interface RecommendEngineOptions {
  candidateLimits?: Partial<CandidateLimits>;
  maxComposed?: number;
}

export interface OutfitScoreBreakdown {
  compatibility: number;
  colourHarmony: number;
  formality: number;
  occasionFit: number;
  weatherFit: number;
  styleMatch: number;
  wearDiversity: number;
  personalization: number;
  novelty: number;
  overall: number;
}

export interface RecommendationReason {
  type: RecommendationReasonType;
  text: string;
  score?: number;
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
  finalCount: number;
  generatedAt: string;
  engineVersion: string;
  filtersRelaxed: boolean;
  relaxationLevel: RelaxationLevel;
  generationLatencyMs: number;
  averageScore: number;
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
