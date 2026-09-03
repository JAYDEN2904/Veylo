export { ENGINE_VERSION, DEFAULT_CANDIDATE_LIMITS } from './types';
export type {
  RecommendationRequest,
  RecommendationResult,
  RankedOutfit,
  OutfitScoreBreakdown,
  RecommendationReason,
  RecommendationMetadata,
} from './types';
export { recommendOutfits } from './recommendationEngine';
export { getCandidateItemsByCategory } from './candidateGenerator';
export { applyHardConstraints, applySoftConstraints, relaxationOptions } from './constraintEngine';
export { composeOutfits, selectCoresStructurally } from './outfitComposer';
