import { GOLDEN_SCENARIOS, GOLDEN_SCENARIO_COUNT } from './goldenDataset';
import { formatEvaluationReport, runGoldenEvaluation } from './evaluationRunner';
import { EVALUATION_THRESHOLDS } from './evaluationTypes';

describe('golden recommendation dataset', () => {
  const metrics = runGoldenEvaluation(GOLDEN_SCENARIOS);

  it('contains about 50 deterministic scenarios across occasions and weather', () => {
    expect(GOLDEN_SCENARIO_COUNT).toBeGreaterThanOrEqual(48);
    expect(GOLDEN_SCENARIO_COUNT).toBeLessThanOrEqual(55);
    expect(metrics.scenarioCount).toBe(GOLDEN_SCENARIO_COUNT);

    const occasions = new Set(GOLDEN_SCENARIOS.map((scenario) => scenario.request.occasion));
    expect(occasions.has('Casual')).toBe(true);
    expect(occasions.has('Formal')).toBe(true);
    expect(occasions.has('Date Night')).toBe(true);
    expect(occasions.has('Party')).toBe(true);
    expect(occasions.has('Work')).toBe(true);
    expect(occasions.has('Exercise')).toBe(true);

    const temps = GOLDEN_SCENARIOS.map((scenario) => scenario.request.weather?.temperature).filter(
      (value): value is number => typeof value === 'number'
    );
    expect(Math.min(...temps)).toBeLessThanOrEqual(8);
    expect(Math.max(...temps)).toBeGreaterThanOrEqual(30);

    expect(GOLDEN_SCENARIOS.some((scenario) => scenario.expectations.shouldUsePersonalization)).toBe(
      true
    );
    expect(
      GOLDEN_SCENARIOS.some((scenario) => scenario.expectations.shouldUsePersonalization === false)
    ).toBe(true);
  });

  it('is deterministic across two full runs', () => {
    const second = runGoldenEvaluation(GOLDEN_SCENARIOS);
    expect(second).toEqual(metrics);
  });

  it('meets hard-constraint and duplicate regression thresholds', () => {
    expect(metrics.constraintPassRate).toBeGreaterThanOrEqual(EVALUATION_THRESHOLDS.constraintPassRate);
    expect(metrics.duplicateRate).toBe(EVALUATION_THRESHOLDS.duplicateRate);
  });

  it('meets softer occasion, weather, personalization, and diversity thresholds', () => {
    expect(metrics.occasionFitRate).toBeGreaterThanOrEqual(EVALUATION_THRESHOLDS.occasionFitRate);
    expect(metrics.weatherFitRate).toBeGreaterThanOrEqual(EVALUATION_THRESHOLDS.weatherFitRate);
    expect(metrics.personalizationActivationRate).toBeGreaterThanOrEqual(
      EVALUATION_THRESHOLDS.personalizationActivationRate
    );
    expect(metrics.diversityPassRate).toBeGreaterThanOrEqual(EVALUATION_THRESHOLDS.diversityPassRate);
  });

  it('prints a human-readable evaluation report', () => {
    const report = formatEvaluationReport(metrics);
    expect(report).toContain('Veylo Recommendation Evaluation');
    expect(report).toContain(`Scenarios: ${metrics.scenarioCount}`);
    expect(report).toContain('Constraint pass rate:');
    // eslint-disable-next-line no-console
    console.log(`\n${report}\n`);
  });
});
