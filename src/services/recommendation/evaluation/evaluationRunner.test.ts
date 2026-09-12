import { item } from '../testFixtures';
import type { ClothingItem } from '../../../types';
import {
  aggregateEvaluations,
  evaluateScenario,
  formatEvaluationReport,
  outfitMatchesPreferredColours,
  outfitMatchesPreferredStyles,
} from './evaluationRunner';
import type { GoldenScenario, ScenarioEvaluation } from './evaluationTypes';

function row(overrides: Partial<ScenarioEvaluation>): ScenarioEvaluation {
  return {
    scenarioId: 's1',
    ok: true,
    hardConstraintPassed: true,
    scoreThresholdPassed: true,
    scenarioPassed: true,
    occasionFit: true,
    weatherFit: true,
    personalizationActivated: true,
    hasDuplicate: false,
    pairwiseSimilarity: 0.4,
    topScore: 80,
    ...overrides,
  };
}

function navyCloset(): ClothingItem[] {
  return [
    item({ id: 'navy-tee', colors: ['Navy'], tags: ['casual', 'minimal'], formalityScore: 2 }),
    item({
      id: 'navy-jeans',
      category: 'Bottoms',
      colors: ['Navy'],
      tags: ['casual', 'denim', 'minimal'],
      formalityScore: 2,
    }),
    item({
      id: 'navy-sneakers',
      category: 'Shoes',
      colors: ['Navy'],
      tags: ['casual', 'minimal'],
      formalityScore: 2,
    }),
  ];
}

function athleticCloset(): ClothingItem[] {
  return [
    item({
      id: 'gym-tee',
      colors: ['Black'],
      tags: ['athletic', 'gym', 'workout'],
      formalityScore: 1,
    }),
    item({
      id: 'gym-shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      colors: ['Black'],
      tags: ['athletic', 'gym'],
      formalityScore: 1,
    }),
    item({
      id: 'gym-sneakers',
      category: 'Shoes',
      colors: ['White'],
      tags: ['athletic', 'running'],
      formalityScore: 1,
    }),
  ];
}

function scenario(
  id: string,
  wardrobe: ClothingItem[],
  expectations: GoldenScenario['expectations'],
  occasion = 'Casual'
): GoldenScenario {
  return {
    id,
    description: id,
    wardrobe,
    request: { occasion, count: 3 },
    expectations,
  };
}

describe('evaluationRunner aggregation', () => {
  it('computes rates from per-scenario outcomes rather than hardcoded numbers', () => {
    const metrics = aggregateEvaluations([
      row({ scenarioId: 'a', topScore: 80 }),
      row({
        scenarioId: 'b',
        hardConstraintPassed: false,
        scenarioPassed: false,
        occasionFit: false,
        topScore: 90,
      }),
      row({
        scenarioId: 'c',
        occasionFit: null,
        weatherFit: null,
        personalizationActivated: null,
        pairwiseSimilarity: null,
        topScore: 70,
      }),
    ]);
    expect(metrics.scenarioCount).toBe(3);
    expect(metrics.hardConstraintPassRate).toBeCloseTo(2 / 3);
    expect(metrics.scoreThresholdPassRate).toBe(1);
    expect(metrics.scenarioPassRate).toBeCloseTo(2 / 3);
    expect(metrics.occasionFitRate).toBeCloseTo(1 / 2);
    expect(metrics.weatherFitRate).toBe(1);
    expect(metrics.personalizationActivationRate).toBe(1);
    expect(metrics.duplicateRate).toBe(0);
    expect(metrics.averageTopScore).toBeCloseTo(80);
  });

  it('treats missing occasion/weather rows as out of the denominator', () => {
    const metrics = aggregateEvaluations([
      row({ occasionFit: null, weatherFit: null, personalizationActivated: null }),
    ]);
    expect(metrics.occasionFitRate).toBe(1);
    expect(metrics.weatherFitRate).toBe(1);
    expect(metrics.personalizationActivationRate).toBe(1);
  });

  it('formats the evaluation banner from computed metrics', () => {
    const report = formatEvaluationReport(
      aggregateEvaluations([row({ topScore: 84.3, pairwiseSimilarity: 0.3 })])
    );
    expect(report).toContain('Scenarios: 1');
    expect(report).toContain('Hard constraint pass rate: 100%');
    expect(report).toContain('Score threshold pass rate: 100%');
    expect(report).toContain('Overall scenario pass rate: 100%');
    expect(report).toContain('Duplicate rate: 0%');
    expect(report).toContain('Average top recommendation score: 84.3');
  });
});

describe('hard constraint vs score threshold semantics', () => {
  it('keeps hardConstraintPassed when a minScore threshold fails', () => {
    const result = evaluateScenario(
      scenario('score-fail', navyCloset(), { minScore: 101 })
    );
    expect(result.ok).toBe(true);
    expect(result.hardConstraintPassed).toBe(true);
    expect(result.scoreThresholdPassed).toBe(false);
    expect(result.scenarioPassed).toBe(false);

    const metrics = aggregateEvaluations([result]);
    expect(metrics.hardConstraintPassRate).toBe(1);
    expect(metrics.scoreThresholdPassRate).toBe(0);
    expect(metrics.scenarioPassRate).toBe(0);
  });

  it('keeps scoreThresholdPassed when a hard category requirement fails', () => {
    const result = evaluateScenario(
      scenario('hard-fail', navyCloset(), {
        requiredCategories: ['Dresses'],
        minScore: 1,
      })
    );
    expect(result.ok).toBe(true);
    expect(result.hardConstraintPassed).toBe(false);
    expect(result.scoreThresholdPassed).toBe(true);
    expect(result.scenarioPassed).toBe(false);

    const metrics = aggregateEvaluations([result]);
    expect(metrics.hardConstraintPassRate).toBe(0);
    expect(metrics.scoreThresholdPassRate).toBe(1);
    expect(metrics.scenarioPassRate).toBe(0);
  });

  it('passes the scenario when hard constraints and score threshold both hold', () => {
    const result = evaluateScenario(
      scenario('both-pass', navyCloset(), { minScore: 1, requiredCategories: ['Tops', 'Bottoms'] })
    );
    expect(result.ok).toBe(true);
    expect(result.hardConstraintPassed).toBe(true);
    expect(result.scoreThresholdPassed).toBe(true);
    expect(result.scenarioPassed).toBe(true);
  });
});

describe('preferred colour and style expectations', () => {
  it('passes preferred colour when at least one navy item is recommended', () => {
    const result = evaluateScenario(
      scenario('colour-pass', navyCloset(), { preferredColours: ['navy'] })
    );
    expect(result.colourPreferencePassed).toBe(true);
    expect(result.hardConstraintPassed).toBe(true);
  });

  it('fails preferred colour without treating it as a hard-constraint miss', () => {
    const result = evaluateScenario(
      scenario('colour-fail', athleticCloset(), { preferredColours: ['navy'] })
    );
    expect(result.ok).toBe(true);
    expect(result.colourPreferencePassed).toBe(false);
    expect(result.hardConstraintPassed).toBe(true);
    expect(result.scenarioPassed).toBe(true);
  });

  it('passes preferred style when an existing style family matches', () => {
    const result = evaluateScenario(
      scenario('style-pass', navyCloset(), { preferredStyles: ['minimal'] })
    );
    expect(result.stylePreferencePassed).toBe(true);
    expect(result.hardConstraintPassed).toBe(true);
  });

  it('fails preferred style without treating it as a hard-constraint miss', () => {
    const result = evaluateScenario(
      scenario('style-fail', athleticCloset(), { preferredStyles: ['minimal'] })
    );
    expect(result.ok).toBe(true);
    expect(result.stylePreferencePassed).toBe(false);
    expect(result.hardConstraintPassed).toBe(true);
    expect(result.scenarioPassed).toBe(true);
  });

  it('matches colours with the same preference-key normalization the engine uses', () => {
    const navyTee = item({ id: 'navy-tee', colors: ['Navy'], tags: ['casual'] });
    const whiteTee = item({ id: 'white-tee', colors: ['White'], tags: ['casual'] });
    expect(outfitMatchesPreferredColours([navyTee], ['Navy'])).toBe(true);
    expect(outfitMatchesPreferredColours([navyTee], ['navy'])).toBe(true);
    expect(outfitMatchesPreferredColours([whiteTee], ['navy'])).toBe(false);
  });

  it('matches styles via existing style families, including streetwear → street', () => {
    const streetTee = item({
      id: 'st-tee',
      colors: ['Black'],
      tags: ['streetwear', 'urban'],
    });
    const gymTee = item({
      id: 'gym-tee',
      colors: ['Black'],
      tags: ['athletic', 'gym'],
    });
    expect(outfitMatchesPreferredStyles([streetTee], ['streetwear'])).toBe(true);
    expect(outfitMatchesPreferredStyles([gymTee], ['minimal'])).toBe(false);
  });
});

describe('evaluation determinism', () => {
  it('repeats the same scenario and expectation results', () => {
    const input = scenario('det', navyCloset(), {
      preferredColours: ['navy'],
      preferredStyles: ['minimal'],
      minScore: 1,
    });
    const first = evaluateScenario(input);
    const second = evaluateScenario(input);
    expect(second).toEqual(first);
    expect(aggregateEvaluations([first])).toEqual(aggregateEvaluations([second]));
  });
});
