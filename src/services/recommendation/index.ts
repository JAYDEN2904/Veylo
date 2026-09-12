export { ENGINE_VERSION, DEFAULT_CANDIDATE_LIMITS, DEFAULT_RANKING_WEIGHTS, PREFERENCE_VECTOR_VERSION, toRecommendationTrace } from './types';
export type {
  RecommendationRequest,
  RecommendationResult,
  RankedOutfit,
  OutfitScoreBreakdown,
  RecommendationReason,
  RecommendationMetadata,
  RecommendationTrace,
  RankingWeights,
  UserPreferenceVector,
  ItemEmbeddingMap,
  RecommendationEventType,
  GenerationSource,
} from './types';
export { recommendOutfits } from './recommendationEngine';
export { shouldAttemptEdgeFallback } from './generationPolicy';
export { getCandidateItemsByCategory } from './candidateGenerator';
export { applyHardConstraints, applySoftConstraints, relaxationOptions } from './constraintEngine';
export { composeOutfits, selectCoresStructurally } from './outfitComposer';
export { scoreCompleteOutfit, rankComposedOutfits } from './ranking/outfitRanker';
export { scorePersonalization } from './ranking/personalizationRanker';
export { scoreOutfitCompatibility } from './compatibility/compatibilityEngine';
export {
  scoreOutfitEmbeddingCompatibility,
  scoreEmbeddingPair,
  hasItemEmbeddings,
} from './compatibility/embeddingCompatibility';
export { fetchItemEmbeddings, parseEmbedding, resolveItemEmbeddings } from './itemEmbeddings';
export { rerankForDiversity } from './ranking/diversityRanker';
export { calculateOutfitSimilarity } from './ranking/diversitySimilarity';
export { isEmbeddingFresh } from './embeddings/embeddingFreshness';
export { getEmbeddingObservability } from './embeddings/resolveItemEmbeddings';
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
export { generateExplanations } from './explanations/explanationGenerator';
export {
  calculateRecommendationFunnel,
  aggregateEventsByPosition,
  aggregateEventsByContext,
  buildRecommendationAnalyticsMetadata,
} from './analytics/recommendationAnalytics';

