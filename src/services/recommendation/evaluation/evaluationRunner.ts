import type { ClothingItem } from '../../../types';
import { normalizeCategory } from '../../outfitCategoryNormalize';
import { normalizePreferenceKey } from '../feedback/recommendationFeedback';
import {
  styleFamiliesForItem,
  styleFamiliesMatchingPreference,
} from '../compatibility/styleCompatibility';
import { recommendOutfits } from '../recommendationEngine';
import { calculateOutfitSimilarity, outfitItemSignature } from '../ranking/diversitySimilarity';
import type { RankedOutfit } from '../types';
import {
  DIVERSITY_SIMILARITY_MAX,
  OCCASION_FIT_SCORE_MIN,
  WEATHER_FIT_SCORE_MIN,
  type EvaluationMetrics,
  type GoldenScenario,
  type ScenarioEvaluation,
} from './evaluationTypes';

function categoriesOf(outfit: RankedOutfit): string[] {
  return outfit.items.map((item) => normalizeCategory(item.category));
}

function colourKeysOf(items: ClothingItem[]): string[] {
  return items.flatMap((item) => item.colors.map((color) => normalizePreferenceKey(color)));
}

/**
 * Hard requirements only: wardrobe membership, coverage, must-include/exclude,
 * required/forbidden categories, forbidden colours. Does not include minScore
 * or preferred colour/style.
 */
function satisfiesHardConstraints(outfit: RankedOutfit, scenario: GoldenScenario): boolean {
  const wardrobeIds = new Set(scenario.wardrobe.map((item) => item.id));
  if (outfit.items.some((item) => !wardrobeIds.has(item.id))) return false;
  if (outfit.items.some((item) => item.status !== 'active')) return false;

  const categories = new Set(categoriesOf(outfit));
  if (!categories.has('Dresses') && !(categories.has('Tops') && categories.has('Bottoms'))) {
    return false;
  }

  const excluded = new Set(scenario.request.excludeItemIds ?? []);
  if (outfit.items.some((item) => excluded.has(item.id))) return false;

  const requiredIds = scenario.request.mustIncludeItemIds ?? [];
  if (requiredIds.some((id) => !outfit.items.some((item) => item.id === id))) return false;

  const requiredCategories = scenario.expectations.requiredCategories ?? [];
  if (requiredCategories.some((category) => !categories.has(category))) return false;

  const forbiddenCategories = scenario.expectations.forbiddenCategories ?? [];
  if (forbiddenCategories.some((category) => categories.has(category))) return false;

  const forbiddenColours = (scenario.expectations.forbiddenColours ?? []).map((color) =>
    normalizePreferenceKey(color)
  );
  if (forbiddenColours.some((color) => colourKeysOf(outfit.items).includes(color))) return false;

  return true;
}

/** Soft: at least one garment uses a colour key from the preference list. */
export function outfitMatchesPreferredColours(
  items: ClothingItem[],
  preferredColours: string[]
): boolean {
  const wanted = new Set(
    preferredColours.map((color) => normalizePreferenceKey(color)).filter(Boolean)
  );
  if (wanted.size === 0) return false;
  return colourKeysOf(items).some((key) => wanted.has(key));
}

/** Soft: at least one garment belongs to a style family matching the preference. */
export function outfitMatchesPreferredStyles(
  items: ClothingItem[],
  preferredStyles: string[]
): boolean {
  const wanted = new Set(preferredStyles.flatMap((style) => styleFamiliesMatchingPreference(style)));
  if (wanted.size === 0) return false;
  return items.some((item) => styleFamiliesForItem(item).some((family) => wanted.has(family)));
}

function meanPairwiseSimilarity(outfits: RankedOutfit[]): number | null {
  if (outfits.length < 2) return null;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < outfits.length; i += 1) {
    for (let j = i + 1; j < outfits.length; j += 1) {
      total += calculateOutfitSimilarity(outfits[i].items, outfits[j].items).overall;
      pairs += 1;
    }
  }
  return pairs === 0 ? null : total / pairs;
}

function hasExactDuplicate(outfits: RankedOutfit[]): boolean {
  const signatures = outfits.map((outfit) => outfitItemSignature(outfit.items));
  return new Set(signatures).size !== signatures.length;
}

function failedScenario(scenario: GoldenScenario): ScenarioEvaluation {
  const minScore = scenario.expectations.minScore;
  const scoreThresholdPassed = minScore === undefined;
  const colourPreferencePassed =
    scenario.expectations.preferredColours !== undefined ? false : undefined;
  const stylePreferencePassed =
    scenario.expectations.preferredStyles !== undefined ? false : undefined;
  return {
    scenarioId: scenario.id,
    ok: false,
    hardConstraintPassed: false,
    scoreThresholdPassed,
    scenarioPassed: false,
    colourPreferencePassed,
    stylePreferencePassed,
    occasionFit: scenario.expectations.shouldRespectOccasion ? false : null,
    weatherFit: scenario.expectations.shouldRespectWeather ? false : null,
    personalizationActivated: scenario.expectations.shouldUsePersonalization ? false : null,
    hasDuplicate: false,
    pairwiseSimilarity: null,
    topScore: null,
  };
}

export function evaluateScenario(scenario: GoldenScenario): ScenarioEvaluation {
  const count = scenario.request.count ?? scenario.expectations.maxResults ?? 3;
  const result = recommendOutfits(scenario.wardrobe, { ...scenario.request, count });
  if (!result.ok || result.recommendations.length === 0) {
    return failedScenario(scenario);
  }

  const outfits = result.recommendations;
  const top = outfits[0];
  const hardConstraintPassed = outfits.every((outfit) => satisfiesHardConstraints(outfit, scenario));
  const minScore = scenario.expectations.minScore;
  const scoreThresholdPassed = minScore === undefined || top.score.overall >= minScore;
  const hasDuplicate = hasExactDuplicate(outfits);
  const colourPreferencePassed =
    scenario.expectations.preferredColours !== undefined
      ? outfitMatchesPreferredColours(top.items, scenario.expectations.preferredColours)
      : undefined;
  const stylePreferencePassed =
    scenario.expectations.preferredStyles !== undefined
      ? outfitMatchesPreferredStyles(top.items, scenario.expectations.preferredStyles)
      : undefined;

  const occasionFit =
    scenario.expectations.shouldRespectOccasion === true
      ? top.score.occasionFit >= OCCASION_FIT_SCORE_MIN
      : null;
  const weatherFit =
    scenario.expectations.shouldRespectWeather === true
      ? top.score.weatherFit >= WEATHER_FIT_SCORE_MIN
      : null;
  const personalizationActivated =
    scenario.expectations.shouldUsePersonalization === true
      ? result.metadata.personalizationUsed === true
      : scenario.expectations.shouldUsePersonalization === false
        ? result.metadata.coldStart === true
        : null;

  return {
    scenarioId: scenario.id,
    ok: true,
    hardConstraintPassed,
    scoreThresholdPassed,
    scenarioPassed: hardConstraintPassed && scoreThresholdPassed && !hasDuplicate,
    colourPreferencePassed,
    stylePreferencePassed,
    occasionFit,
    weatherFit,
    personalizationActivated,
    hasDuplicate,
    pairwiseSimilarity: meanPairwiseSimilarity(outfits),
    topScore: top.score.overall,
  };
}

function rate(passed: number, total: number): number {
  if (total <= 0) return 1;
  return passed / total;
}

export function aggregateEvaluations(rows: ScenarioEvaluation[]): EvaluationMetrics {
  const occasionRows = rows.filter((row) => row.occasionFit !== null);
  const weatherRows = rows.filter((row) => row.weatherFit !== null);
  const personalizationRows = rows.filter((row) => row.personalizationActivated !== null);
  const colourRows = rows.filter((row) => row.colourPreferencePassed !== undefined);
  const styleRows = rows.filter((row) => row.stylePreferencePassed !== undefined);
  const similarityRows = rows.filter((row) => row.pairwiseSimilarity !== null);
  const successful = rows.filter((row) => row.ok);
  const topScores = successful
    .map((row) => row.topScore)
    .filter((score): score is number => typeof score === 'number');

  return {
    scenarioCount: rows.length,
    successfulCount: successful.length,
    hardConstraintPassRate: rate(rows.filter((row) => row.hardConstraintPassed).length, rows.length),
    scoreThresholdPassRate: rate(rows.filter((row) => row.scoreThresholdPassed).length, rows.length),
    scenarioPassRate: rate(rows.filter((row) => row.scenarioPassed).length, rows.length),
    occasionFitRate: rate(occasionRows.filter((row) => row.occasionFit).length, occasionRows.length),
    weatherFitRate: rate(weatherRows.filter((row) => row.weatherFit).length, weatherRows.length),
    personalizationActivationRate: rate(
      personalizationRows.filter((row) => row.personalizationActivated).length,
      personalizationRows.length
    ),
    colourPreferenceRate: rate(
      colourRows.filter((row) => row.colourPreferencePassed).length,
      colourRows.length
    ),
    stylePreferenceRate: rate(
      styleRows.filter((row) => row.stylePreferencePassed).length,
      styleRows.length
    ),
    duplicateRate: rate(rows.filter((row) => row.hasDuplicate).length, Math.max(successful.length, 1)),
    averagePairwiseSimilarity:
      similarityRows.length === 0
        ? 0
        : similarityRows.reduce((sum, row) => sum + (row.pairwiseSimilarity ?? 0), 0) /
          similarityRows.length,
    diversityPassRate: rate(
      similarityRows.filter((row) => (row.pairwiseSimilarity ?? 1) < DIVERSITY_SIMILARITY_MAX).length,
      similarityRows.length
    ),
    averageTopScore:
      topScores.length === 0
        ? 0
        : topScores.reduce((sum, score) => sum + score, 0) / topScores.length,
  };
}

export function runGoldenEvaluation(scenarios: GoldenScenario[]): EvaluationMetrics {
  return aggregateEvaluations(scenarios.map(evaluateScenario));
}

export function formatEvaluationReport(metrics: EvaluationMetrics): string {
  const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
  return [
    'Veylo Recommendation Evaluation',
    '',
    `Scenarios: ${metrics.scenarioCount}`,
    '',
    `Hard constraint pass rate: ${pct(metrics.hardConstraintPassRate)}`,
    `Score threshold pass rate: ${pct(metrics.scoreThresholdPassRate)}`,
    `Overall scenario pass rate: ${pct(metrics.scenarioPassRate)}`,
    '',
    `Occasion fit rate: ${pct(metrics.occasionFitRate)}`,
    `Weather fit rate: ${pct(metrics.weatherFitRate)}`,
    `Personalization activation: ${pct(metrics.personalizationActivationRate)}`,
    `Colour preference rate: ${pct(metrics.colourPreferenceRate)}`,
    `Style preference rate: ${pct(metrics.stylePreferenceRate)}`,
    '',
    `Duplicate rate: ${pct(metrics.duplicateRate)}`,
    `Diversity pass rate: ${pct(metrics.diversityPassRate)}`,
    '',
    `Average top recommendation score: ${metrics.averageTopScore.toFixed(1)}`,
  ].join('\n');
}
