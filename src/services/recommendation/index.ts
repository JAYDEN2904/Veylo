export { ENGINE_VERSION, DEFAULT_CANDIDATE_LIMITS, DEFAULT_RANKING_WEIGHTS } from './types';
export type {
  RecommendationRequest,
  RecommendationResult,
  RankedOutfit,
  OutfitScoreBreakdown,
  RecommendationReason,
  RecommendationMetadata,
  RankingWeights,
  UserPreferenceVector,
  RecommendationEventType,
} from './types';
export { recommendOutfits } from './recommendationEngine';
export { getCandidateItemsByCategory } from './candidateGenerator';
export { applyHardConstraints, applySoftConstraints, relaxationOptions } from './constraintEngine';
export { composeOutfits, selectCoresStructurally } from './outfitComposer';
export { scoreCompleteOutfit, rankComposedOutfits } from './ranking/outfitRanker';
export { scorePersonalization } from './ranking/personalizationRanker';
export { scoreOutfitCompatibility } from './compatibility/compatibilityEngine';
export {
  applyFeedbackToVector,
  emptyPreferenceVector,
  FEEDBACK_STRENGTHS,
  hasBehavioralSignal,
} from './feedback/recommendationFeedback';
export {
  recordGeneratedRecommendations,
  recordRecommendationEvent,
} from './feedback/sessionRecorder';
