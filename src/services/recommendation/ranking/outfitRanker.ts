import type { ClothingItem } from '../../../types';
import {
  clothingItemToScoringInput,
  scoreWearDiversityDimension,
} from '../../outfitDimensionScoring';
import { buildStyleBoostTerms } from '../styleTerms';
import { scoreOutfitCompatibility } from '../compatibility/compatibilityEngine';
import { scoreOutfitOccasion } from '../compatibility/occasionCompatibility';
import { scoreOutfitWeather } from '../compatibility/weatherCompatibility';
import { scoreOutfitStyleMatch } from '../compatibility/styleCompatibility';
import { scorePersonalization } from './personalizationRanker';
import { resolveRankingWeights, weightedOverall } from '../rankingWeights';
import { hasBehavioralSignal } from '../feedback/recommendationFeedback';
import { generateExplanations } from '../explanations/explanationGenerator';
import type {
  OutfitScoreBreakdown,
  RankedOutfit,
  RankingWeights,
  RecommendationReason,
  RecommendationRequest,
} from '../types';

function scoreWearDiversity(items: ClothingItem[]): number {
  if (items.length === 0) return 70;
  const total = items.reduce((sum, item) => {
    return sum + scoreWearDiversityDimension(clothingItemToScoringInput(item));
  }, 0);
  return Math.round(total / items.length);
}

/** Ranking values must stay in 0–100. NaN would make sort order undefined. */
function finiteUnitScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function scoreCompleteOutfit(
  items: ClothingItem[],
  request: RecommendationRequest,
  weights?: Partial<RankingWeights>
): OutfitScoreBreakdown {
  const occasion = request.occasion ?? 'Casual';
  const styleTerms = buildStyleBoostTerms(request);
  const compat = scoreOutfitCompatibility(items, occasion, request.itemEmbeddings);
  const occasionFit = scoreOutfitOccasion(items, occasion);
  const weatherFit = scoreOutfitWeather(items, request.weather);
  const styleMatch = scoreOutfitStyleMatch(items, styleTerms);
  const wearDiversity = scoreWearDiversity(items);
  const resolved = resolveRankingWeights(request, weights);

  const breakdown: OutfitScoreBreakdown = {
    compatibility: finiteUnitScore(compat.compatibility),
    colourHarmony: finiteUnitScore(compat.colourHarmony),
    formality: finiteUnitScore(compat.formality),
    occasionFit: finiteUnitScore(occasionFit),
    weatherFit: finiteUnitScore(weatherFit),
    styleMatch: finiteUnitScore(styleMatch),
    wearDiversity: finiteUnitScore(wearDiversity),
    personalization: finiteUnitScore(scorePersonalization(items, request)),
    // Wear freshness only until Sprint 5 set-level novelty exists.
    novelty: finiteUnitScore(wearDiversity),
    overall: 0,
  };

  breakdown.overall = finiteUnitScore(
    weightedOverall(
      {
        compatibility: breakdown.compatibility,
        personalization: breakdown.personalization,
        occasionFit: breakdown.occasionFit,
        weatherFit: breakdown.weatherFit,
        colourHarmony: breakdown.colourHarmony,
        formality: breakdown.formality,
        wearDiversity: breakdown.wearDiversity,
        novelty: breakdown.novelty,
      },
      resolved,
      { includeWeather: Boolean(request.weather) }
    )
  );

  return breakdown;
}

export function reasonsFromBreakdown(
  breakdown: OutfitScoreBreakdown,
  request: RecommendationRequest = {}
): RecommendationReason[] {
  const personalizationUsed = hasBehavioralSignal(request.preferenceVector);
  return generateExplanations(breakdown, {
    occasion: request.occasion,
    weather: request.weather,
    stylePreferences: request.stylePreferences,
    styleIds: request.styleIds,
    personalizationUsed,
    coldStart: !personalizationUsed,
  });
}

function createOutfitId(index: number): string {
  return `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${index}`;
}

export function rankComposedOutfits(
  outfits: ClothingItem[][],
  request: RecommendationRequest,
  weights?: Partial<RankingWeights>
): RankedOutfit[] {
  const ranked = outfits.map((items, index) => {
    const breakdown = scoreCompleteOutfit(items, request, weights);
    return {
      id: createOutfitId(index),
      items,
      score: breakdown,
      reasons: reasonsFromBreakdown(breakdown, request),
      archetype: 'balanced' as const,
      confidence: 70,
    };
  });
  ranked.sort((a, b) => b.score.overall - a.score.overall);
  return ranked;
}
