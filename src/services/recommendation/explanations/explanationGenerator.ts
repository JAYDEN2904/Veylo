import type { OutfitScoreBreakdown, RecommendationReason } from '../types';
import {
  collectExplanationCandidates,
  rankExplanationCandidates,
} from './explanationRules';
import { MAX_EXPLANATION_REASONS, type ExplanationContext } from './explanationTypes';

export { MAX_EXPLANATION_REASONS } from './explanationTypes';
export type { ExplanationContext } from './explanationTypes';

const FALLBACK_REASON: RecommendationReason = {
  type: 'wardrobe',
  text: 'Built from pieces in your wardrobe that fit this request.',
};

/**
 * Deterministic, score-grounded reasons. No LLM. At most three reasons.
 * Claims are omitted unless the matching score dimension supports them.
 */
export function generateExplanations(
  breakdown: OutfitScoreBreakdown,
  context: ExplanationContext = {}
): RecommendationReason[] {
  const ranked = rankExplanationCandidates(collectExplanationCandidates(breakdown, context));
  const selected = ranked.slice(0, MAX_EXPLANATION_REASONS).map((candidate) => ({
    type: candidate.type,
    text: candidate.text,
    score: candidate.score,
    confidence: candidate.confidence,
  }));

  if (selected.length > 0) return selected;
  return [
    {
      ...FALLBACK_REASON,
      score: breakdown.overall,
      confidence: 0.2,
    },
  ];
}

/** Adapter used by the ranker. Same contract as the previous helper. */
export function reasonsFromBreakdown(
  breakdown: OutfitScoreBreakdown,
  context: ExplanationContext = {}
): RecommendationReason[] {
  return generateExplanations(breakdown, context);
}
