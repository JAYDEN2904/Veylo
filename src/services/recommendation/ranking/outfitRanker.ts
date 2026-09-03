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
import { resolveRankingWeights, weightedOverall } from '../rankingWeights';
import type {
  OutfitScoreBreakdown,
  RankedOutfit,
  RankingWeights,
  RecommendationReason,
  RecommendationReasonType,
  RecommendationRequest,
} from '../types';

function scoreWearDiversity(items: ClothingItem[]): number {
  if (items.length === 0) return 70;
  const total = items.reduce((sum, item) => {
    return sum + scoreWearDiversityDimension(clothingItemToScoringInput(item));
  }, 0);
  return Math.round(total / items.length);
}

export function scoreCompleteOutfit(
  items: ClothingItem[],
  request: RecommendationRequest,
  weights?: Partial<RankingWeights>
): OutfitScoreBreakdown {
  const occasion = request.occasion ?? 'Casual';
  const styleTerms = buildStyleBoostTerms(request);
  const compat = scoreOutfitCompatibility(items, occasion);
  const occasionFit = scoreOutfitOccasion(items, occasion);
  const weatherFit = scoreOutfitWeather(items, request.weather);
  const styleMatch = scoreOutfitStyleMatch(items, styleTerms);
  const wearDiversity = scoreWearDiversity(items);
  const resolved = resolveRankingWeights(request, weights);

  const breakdown: OutfitScoreBreakdown = {
    compatibility: compat.compatibility,
    colourHarmony: compat.colourHarmony,
    formality: compat.formality,
    occasionFit,
    weatherFit,
    styleMatch,
    wearDiversity,
    // Cold-start only until Sprint 3 behavioral preferences exist.
    personalization: styleMatch,
    // Wear freshness only until Sprint 5 set-level novelty exists.
    novelty: wearDiversity,
    overall: 0,
  };

  breakdown.overall = weightedOverall(
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
  );

  return breakdown;
}

function inferReasonType(text: string): RecommendationReasonType {
  const lower = text.toLowerCase();
  if (lower.includes('weather') || lower.includes('warm') || lower.includes('cold')) {
    return 'weather';
  }
  if (lower.includes('colour') || lower.includes('color')) return 'colour';
  if (lower.includes('formal')) return 'compatibility';
  if (lower.includes('worn') || lower.includes('under-worn')) return 'novelty';
  if (lower.includes('office') || lower.includes('date') || lower.includes('everyday')) {
    return 'occasion';
  }
  if (lower.includes('style') || lower.includes('minimal')) return 'style';
  return 'wardrobe';
}

export function reasonsFromBreakdown(breakdown: OutfitScoreBreakdown): RecommendationReason[] {
  const lines: string[] = [];
  if (breakdown.compatibility >= 80) {
    lines.push('Pieces work together as a complete outfit.');
  } else if (breakdown.formality < 45) {
    lines.push('Formality levels clash across the set.');
  }
  if (breakdown.colourHarmony >= 80) {
    lines.push('Colours sit comfortably next to each other.');
  }
  if (breakdown.occasionFit >= 80) {
    lines.push('The full look fits the occasion, not just one item.');
  }
  if (breakdown.weatherFit >= 80) {
    lines.push('Suited to today’s weather as a complete outfit.');
  }
  if (breakdown.wearDiversity >= 85) {
    lines.push('Gives under-worn pieces a turn.');
  }
  if (lines.length === 0) {
    lines.push('A balanced look pulled from your wardrobe.');
  }

  return lines.slice(0, 4).map((text) => ({
    type: inferReasonType(text),
    text,
    score: breakdown.overall,
  }));
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
      reasons: reasonsFromBreakdown(breakdown),
      archetype: 'balanced' as const,
      confidence: 70,
    };
  });
  ranked.sort((a, b) => b.score.overall - a.score.overall);
  return ranked;
}
