export interface DiversityConfig {
  lambda: number;
  duplicateThreshold: number;
  maxRelevanceDrop: number;
}

export const DIVERSITY_LAMBDA = 0.45;
export const DIVERSITY_DUPLICATE_THRESHOLD = 0.85;
export const MAX_RELEVANCE_DROP = 15;

export const DEFAULT_DIVERSITY_CONFIG: DiversityConfig = {
  lambda: DIVERSITY_LAMBDA,
  duplicateThreshold: DIVERSITY_DUPLICATE_THRESHOLD,
  maxRelevanceDrop: MAX_RELEVANCE_DROP,
};

export function resolveDiversityConfig(overrides?: Partial<DiversityConfig>): DiversityConfig {
  return {
    lambda: overrides?.lambda ?? DEFAULT_DIVERSITY_CONFIG.lambda,
    duplicateThreshold:
      overrides?.duplicateThreshold ?? DEFAULT_DIVERSITY_CONFIG.duplicateThreshold,
    maxRelevanceDrop: overrides?.maxRelevanceDrop ?? DEFAULT_DIVERSITY_CONFIG.maxRelevanceDrop,
  };
}

/** Similarity signal weights. Embedding is weakest and dropped when unavailable. */
export const DIVERSITY_SIMILARITY_WEIGHTS = {
  itemIdentity: 0.45,
  subcategory: 0.2,
  colour: 0.15,
  styleFamily: 0.12,
  embedding: 0.08,
} as const;
