export { ENGINE_VERSION, DEFAULT_CANDIDATE_LIMITS, DEFAULT_RANKING_WEIGHTS } from './types';
export type {
  RecommendationRequest,
  RecommendationResult,
  RankedOutfit,
  OutfitScoreBreakdown,
  RecommendationReason,
  RecommendationMetadata,
  RankingWeights,
} from './types';
export { recommendOutfits } from './recommendationEngine';
export { getCandidateItemsByCategory } from './candidateGenerator';
export { applyHardConstraints, applySoftConstraints, relaxationOptions } from './constraintEngine';
export { composeOutfits, selectCoresStructurally } from './outfitComposer';
export { scoreCompleteOutfit, rankComposedOutfits } from './ranking/outfitRanker';
export { scoreOutfitCompatibility } from './compatibility/compatibilityEngine';
