import type { ClothingItem, OutfitGenerationFailure } from '../../types';
import { withNormalizedCategories } from '../outfitCategoryNormalize';
import { getCandidateItemsByCategory, mergeCandidateLimits } from './candidateGenerator';
import { composeOutfits, meetsMinimumCoverage } from './outfitComposer';
import {
  RELAXATION_LEVELS,
  applyHardConstraints,
  applySoftConstraints,
  canFormOutfit,
  missingOutfitCategories,
  reinjectAnchors,
  relaxationOptions,
} from './constraintEngine';
import { rankComposedOutfits } from './ranking/outfitRanker';
import { hasItemEmbeddings, scoreOutfitEmbeddingCompatibility } from './compatibility/embeddingCompatibility';
import {
  ENGINE_VERSION,
  type OutfitScoreBreakdown,
  type RankedOutfit,
  type RecommendationArchetype,
  type RecommendationMetadata,
  type RecommendationRequest,
  type RecommendationResult,
  type RecommendEngineOptions,
  type RelaxationLevel,
} from './types';

function emptyMetadata(partial: Partial<RecommendationMetadata> = {}): RecommendationMetadata {
  return {
    candidateCount: 0,
    filteredCount: 0,
    composedCount: 0,
    finalCount: 0,
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    filtersRelaxed: false,
    relaxationLevel: 0,
    generationLatencyMs: 0,
    averageScore: 0,
    embeddingsAvailable: false,
    embeddingsUsed: false,
    ...partial,
  };
}

function failureResult(
  reason: OutfitGenerationFailure['reason'],
  message: string,
  metadata: RecommendationMetadata,
  missingCategories?: string[]
): RecommendationResult {
  return {
    ok: false,
    recommendations: [],
    failure: { reason, message, missingCategories },
    metadata,
  };
}

function classifyArchetype(
  breakdown: OutfitScoreBreakdown,
  itemCount: number
): RecommendationArchetype {
  if (breakdown.styleMatch >= 80 && breakdown.novelty < 55) return 'safe';
  if (breakdown.novelty >= 80 && breakdown.compatibility >= 70) return 'bold';
  if (itemCount <= 3 && breakdown.colourHarmony >= 80) return 'minimal';
  if (breakdown.novelty >= 75 && breakdown.compatibility < 70) return 'experimental';
  return 'balanced';
}

function computeConfidence(input: {
  composedCount: number;
  relaxationLevel: RelaxationLevel;
  poolSize: number;
  scoreSpread: number;
}): number {
  let score = 72;
  if (input.composedCount <= 1) score -= 22;
  else if (input.composedCount < 4) score -= 12;
  else if (input.composedCount >= 10) score += 8;

  if (input.relaxationLevel >= 3) score -= 18;
  else if (input.relaxationLevel >= 1) score -= 8;

  if (input.poolSize < 6) score -= 14;
  else if (input.poolSize >= 20) score += 6;

  if (input.scoreSpread >= 12) score += 5;
  else if (input.scoreSpread < 4) score -= 6;

  return Math.max(15, Math.min(95, score));
}

function rankOutfits(
  outfits: ClothingItem[][],
  request: RecommendationRequest,
  weights?: RecommendEngineOptions['weights']
): RankedOutfit[] {
  return rankComposedOutfits(outfits, request, weights).map((outfit) => ({
    ...outfit,
    archetype: classifyArchetype(outfit.score, outfit.items.length),
  }));
}

interface FeasiblePool {
  pool: ClothingItem[];
  level: RelaxationLevel;
  filtersRelaxed: boolean;
}

function findFeasiblePool(
  hardPool: ClothingItem[],
  request: RecommendationRequest,
  anchorIds: string[]
): FeasiblePool {
  let lastPool = hardPool;
  let lastLevel: RelaxationLevel = 0;

  for (const level of RELAXATION_LEVELS) {
    const soft = applySoftConstraints(hardPool, request, relaxationOptions(level));
    const pool = reinjectAnchors(soft, hardPool, anchorIds);
    lastPool = pool;
    lastLevel = level;
    if (pool.length > 0 && canFormOutfit(pool)) {
      return { pool, level, filtersRelaxed: level > 0 || pool.length > soft.length };
    }
  }

  return { pool: lastPool, level: lastLevel, filtersRelaxed: lastLevel > 0 };
}

function desiredCount(request: RecommendationRequest): number {
  const count = request.count ?? 5;
  return Math.min(Math.max(count, 1), 5);
}

export function recommendOutfits(
  items: ClothingItem[],
  request: RecommendationRequest,
  options: RecommendEngineOptions = {}
): RecommendationResult {
  const startedAt = Date.now();
  const count = desiredCount(request);
  const anchorIds = request.mustIncludeItemIds ?? [];

  const active = items.filter((item) => item.status === 'active');
  if (active.length === 0) {
    return failureResult(
      'empty_wardrobe',
      'Add items to your closet to generate an outfit.',
      emptyMetadata({ generationLatencyMs: Date.now() - startedAt })
    );
  }

  const normalized = withNormalizedCategories(active);
  if (anchorIds.length > 0) {
    const missing = anchorIds.filter((id) => !normalized.some((item) => item.id === id));
    if (missing.length > 0) {
      return failureResult(
        'filters_too_strict',
        'Some selected items are no longer in your active wardrobe. Pull to refresh and try again.',
        emptyMetadata({
          filteredCount: normalized.length,
          generationLatencyMs: Date.now() - startedAt,
        })
      );
    }
  }

  const hardPool = applyHardConstraints(normalized, request);
  if (hardPool.length === 0) {
    return failureResult(
      'filters_too_strict',
      'No items match the weather, season, and occasion. Try a different occasion or add more versatile pieces.',
      emptyMetadata({
        filteredCount: 0,
        generationLatencyMs: Date.now() - startedAt,
      })
    );
  }

  let feasible = findFeasiblePool(hardPool, request, anchorIds);
  const limits = mergeCandidateLimits(options.candidateLimits);
  let candidates = getCandidateItemsByCategory(feasible.pool, request, limits);
  let composed = composeOutfits(candidates, request, { maxComposed: options.maxComposed });

  if (composed.length === 0) {
    for (const level of RELAXATION_LEVELS) {
      if (level <= feasible.level) continue;
      const soft = applySoftConstraints(hardPool, request, relaxationOptions(level));
      const pool = reinjectAnchors(soft, hardPool, anchorIds);
      candidates = getCandidateItemsByCategory(pool, request, limits);
      composed = composeOutfits(candidates, request, { maxComposed: options.maxComposed });
      feasible = { pool, level, filtersRelaxed: true };
      if (composed.length > 0) break;
    }
  }

  composed = composed.filter(meetsMinimumCoverage);

  if (composed.length === 0) {
    const missing = missingOutfitCategories(feasible.pool);
    const latency = Date.now() - startedAt;
    if (missing.length > 0) {
      return failureResult(
        'insufficient_categories',
        'You need at least a top and bottom, or a dress, to build an outfit. Add those categories or relax filters.',
        emptyMetadata({
          candidateCount: candidates.totalCandidates,
          filteredCount: feasible.pool.length,
          filtersRelaxed: feasible.filtersRelaxed,
          relaxationLevel: feasible.level,
          generationLatencyMs: latency,
        }),
        missing
      );
    }
    return failureResult(
      'filters_too_strict',
      'No items match the weather, season, and occasion. Try a different occasion or add more versatile pieces.',
      emptyMetadata({
        candidateCount: candidates.totalCandidates,
        filteredCount: feasible.pool.length,
        filtersRelaxed: feasible.filtersRelaxed,
        relaxationLevel: feasible.level,
        generationLatencyMs: latency,
      })
    );
  }

  const rankedAll = rankOutfits(composed, request, options.weights);
  const topScore = rankedAll[0]?.score.overall ?? 0;
  const secondScore = rankedAll[1]?.score.overall ?? topScore;
  const confidence = computeConfidence({
    composedCount: composed.length,
    relaxationLevel: feasible.level,
    poolSize: feasible.pool.length,
    scoreSpread: topScore - secondScore,
  });

  const ranked = rankedAll.slice(0, count).map((outfit) => ({ ...outfit, confidence }));
  const averageScore =
    ranked.length === 0
      ? 0
      : Math.round(ranked.reduce((sum, outfit) => sum + outfit.score.overall, 0) / ranked.length);
  const embeddingsAvailable = hasItemEmbeddings(request.itemEmbeddings);
  const embeddingsUsed =
    embeddingsAvailable &&
    composed.some((outfit) => scoreOutfitEmbeddingCompatibility(outfit, request.itemEmbeddings).used);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const personalized = ranked.some(
      (outfit) => outfit.score.personalization !== outfit.score.styleMatch
    );
    console.log('[recommendation]', {
      engineVersion: ENGINE_VERSION,
      candidates: candidates.totalCandidates,
      composed: composed.length,
      ranked: ranked.length,
      personalization: personalized ? 'behavioral' : 'cold-start',
      embeddings: embeddingsUsed ? 'used' : embeddingsAvailable ? 'available' : 'none',
    });
  }

  return {
    ok: true,
    recommendations: ranked,
    metadata: emptyMetadata({
      candidateCount: candidates.totalCandidates,
      filteredCount: feasible.pool.length,
      composedCount: composed.length,
      finalCount: ranked.length,
      filtersRelaxed: feasible.filtersRelaxed,
      relaxationLevel: feasible.level,
      generationLatencyMs: Date.now() - startedAt,
      averageScore,
      embeddingsAvailable,
      embeddingsUsed,
    }),
  };
}
