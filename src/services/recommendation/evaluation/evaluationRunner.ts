import { normalizeCategory } from '../../outfitCategoryNormalize';
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

function coloursOf(outfit: RankedOutfit): string[] {
  return outfit.items.flatMap((item) => item.colors.map((color) => color.trim().toLowerCase()));
}

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
    color.trim().toLowerCase()
  );
  if (forbiddenColours.some((color) => coloursOf(outfit).includes(color))) return false;

  return true;
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

export function evaluateScenario(scenario: GoldenScenario): ScenarioEvaluation {
  const count = scenario.request.count ?? scenario.expectations.maxResults ?? 3;
  const result = recommendOutfits(scenario.wardrobe, { ...scenario.request, count });
  if (!result.ok || result.recommendations.length === 0) {
    return {
      scenarioId: scenario.id,
      ok: false,
      constraintPassed: false,
      occasionFit: scenario.expectations.shouldRespectOccasion ? false : null,
      weatherFit: scenario.expectations.shouldRespectWeather ? false : null,
      personalizationActivated: scenario.expectations.shouldUsePersonalization ? false : null,
      hasDuplicate: false,
      pairwiseSimilarity: null,
      topScore: null,
    };
  }

  const outfits = result.recommendations;
  const top = outfits[0];
  const constraintPassed = outfits.every((outfit) => satisfiesHardConstraints(outfit, scenario));
  const minScore = scenario.expectations.minScore;
  const scorePassed = minScore === undefined || top.score.overall >= minScore;

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
    constraintPassed: constraintPassed && scorePassed,
    occasionFit,
    weatherFit,
    personalizationActivated,
    hasDuplicate: hasExactDuplicate(outfits),
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
  const similarityRows = rows.filter((row) => row.pairwiseSimilarity !== null);
  const successful = rows.filter((row) => row.ok);
  const topScores = successful
    .map((row) => row.topScore)
    .filter((score): score is number => typeof score === 'number');

  return {
    scenarioCount: rows.length,
    successfulCount: successful.length,
    constraintPassRate: rate(rows.filter((row) => row.constraintPassed).length, rows.length),
    occasionFitRate: rate(occasionRows.filter((row) => row.occasionFit).length, occasionRows.length),
    weatherFitRate: rate(weatherRows.filter((row) => row.weatherFit).length, weatherRows.length),
    personalizationActivationRate: rate(
      personalizationRows.filter((row) => row.personalizationActivated).length,
      personalizationRows.length
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
    `Constraint pass rate: ${pct(metrics.constraintPassRate)}`,
    `Occasion fit rate: ${pct(metrics.occasionFitRate)}`,
    `Weather fit rate: ${pct(metrics.weatherFitRate)}`,
    `Personalization activation: ${pct(metrics.personalizationActivationRate)}`,
    `Duplicate rate: ${pct(metrics.duplicateRate)}`,
    `Diversity pass rate: ${pct(metrics.diversityPassRate)}`,
    `Average top recommendation score: ${metrics.averageTopScore.toFixed(1)}`,
  ].join('\n');
}
