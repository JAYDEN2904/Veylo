import type { ItemEmbeddingMap, RankedOutfit, RecommendationReason } from '../types';
import { resolveDiversityConfig, type DiversityConfig } from './diversityConfig';
import { calculateOutfitSimilarity, outfitItemSignature } from './diversitySimilarity';

export interface DiversityScore {
  relevance: number;
  maxSimilarity: number;
  mmr: number;
}

export interface DiversityRerankStats {
  diversityCandidatesConsidered: number;
  diversitySelected: number;
  diversityRejected: number;
  diversityApplied: boolean;
}

export interface DiversityRerankResult {
  outfits: RankedOutfit[];
  stats: DiversityRerankStats;
}

const DIVERSITY_REASON: RecommendationReason = {
  type: 'diversity',
  text: 'An alternative combination for the same occasion.',
};

function withAlternativeReason(outfit: RankedOutfit, maxSimilarity: number): RankedOutfit {
  if (maxSimilarity >= 0.55) return outfit;
  if (outfit.reasons.some((reason) => reason.type === 'diversity')) return outfit;
  const withoutFallback = outfit.reasons.filter((reason) => reason.type !== 'wardrobe');
  const kept = withoutFallback.slice(0, 2);
  return {
    ...outfit,
    reasons: [
      ...kept,
      {
        ...DIVERSITY_REASON,
        score: outfit.score.overall,
        confidence: 0.45,
      },
    ],
  };
}

function compareMmr(
  left: { mmr: number; relevance: number; maxSimilarity: number; signature: string },
  right: { mmr: number; relevance: number; maxSimilarity: number; signature: string }
): number {
  if (right.mmr !== left.mmr) return right.mmr - left.mmr;
  if (right.relevance !== left.relevance) return right.relevance - left.relevance;
  if (left.maxSimilarity !== right.maxSimilarity) return left.maxSimilarity - right.maxSimilarity;
  return left.signature.localeCompare(right.signature);
}

/**
 * MMR-style selection after relevance ranking. Does not mutate overall scores.
 */
export function rerankForDiversity(
  ranked: RankedOutfit[],
  count: number,
  embeddings?: ItemEmbeddingMap,
  config?: Partial<DiversityConfig>
): DiversityRerankResult {
  const resolved = resolveDiversityConfig(config);
  const emptyStats: DiversityRerankStats = {
    diversityCandidatesConsidered: ranked.length,
    diversitySelected: Math.min(count, ranked.length),
    diversityRejected: 0,
    diversityApplied: false,
  };

  if (ranked.length === 0 || count <= 0) {
    return { outfits: [], stats: { ...emptyStats, diversitySelected: 0 } };
  }
  if (ranked.length <= 2 || count === 1) {
    return {
      outfits: ranked.slice(0, count),
      stats: { ...emptyStats, diversitySelected: Math.min(count, ranked.length) },
    };
  }

  const topScore = ranked[0].score.overall;
  const eligible = ranked.filter(
    (outfit) => outfit.score.overall >= topScore - resolved.maxRelevanceDrop
  );
  const selected: RankedOutfit[] = [ranked[0]];
  const remaining = eligible.filter((outfit) => outfit !== ranked[0]);
  let rejected = 0;

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = -1;
    let best = {
      mmr: Number.NEGATIVE_INFINITY,
      relevance: -1,
      maxSimilarity: 1,
      signature: '',
    };

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const signature = outfitItemSignature(candidate.items);
      const alreadyExact = selected.some(
        (chosen) => outfitItemSignature(chosen.items) === signature
      );
      if (alreadyExact) continue;

      const maxSimilarity = Math.max(
        ...selected.map(
          (chosen) => calculateOutfitSimilarity(candidate.items, chosen.items, embeddings).overall
        )
      );
      const duplicatePenalty = maxSimilarity >= resolved.duplicateThreshold ? 1 : 0;
      const mmr =
        candidate.score.overall / 100 - resolved.lambda * maxSimilarity - duplicatePenalty;
      const rankedCandidate = {
        mmr,
        relevance: candidate.score.overall,
        maxSimilarity,
        signature,
      };
      if (bestIndex === -1 || compareMmr(rankedCandidate, best) < 0) {
        bestIndex = index;
        best = rankedCandidate;
      }
    }

    if (bestIndex < 0) break;
    const picked = remaining.splice(bestIndex, 1)[0];
    if (best.maxSimilarity >= resolved.duplicateThreshold) {
      const hasAlternative = remaining.some((candidate) => {
        const maxSimilarity = Math.max(
          ...[...selected, picked].map(
            (chosen) => calculateOutfitSimilarity(candidate.items, chosen.items, embeddings).overall
          )
        );
        return maxSimilarity < resolved.duplicateThreshold;
      });
      if (hasAlternative) {
        rejected += 1;
        continue;
      }
    }
    selected.push(
      selected.length > 0 ? withAlternativeReason(picked, best.maxSimilarity) : picked
    );
  }

  return {
    outfits: selected.slice(0, count),
    stats: {
      diversityCandidatesConsidered: eligible.length,
      diversitySelected: selected.length,
      diversityRejected: rejected + Math.max(0, eligible.length - selected.length),
      diversityApplied: true,
    },
  };
}
