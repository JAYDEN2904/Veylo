import { aggregateEvaluations, formatEvaluationReport } from './evaluationRunner';
import type { ScenarioEvaluation } from './evaluationTypes';

function row(overrides: Partial<ScenarioEvaluation>): ScenarioEvaluation {
  return {
    scenarioId: 's1',
    ok: true,
    constraintPassed: true,
    occasionFit: true,
    weatherFit: true,
    personalizationActivated: true,
    hasDuplicate: false,
    pairwiseSimilarity: 0.4,
    topScore: 80,
    ...overrides,
  };
}

describe('evaluationRunner aggregation', () => {
  it('computes rates from per-scenario outcomes rather than hardcoded numbers', () => {
    const metrics = aggregateEvaluations([
      row({ scenarioId: 'a', topScore: 80 }),
      row({ scenarioId: 'b', constraintPassed: false, occasionFit: false, topScore: 90 }),
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
    expect(metrics.constraintPassRate).toBeCloseTo(2 / 3);
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
    expect(report).toContain('Constraint pass rate: 100%');
    expect(report).toContain('Duplicate rate: 0%');
    expect(report).toContain('Average top recommendation score: 84.3');
  });
});
