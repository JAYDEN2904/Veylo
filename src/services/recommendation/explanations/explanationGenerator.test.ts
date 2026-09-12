import { generateExplanations } from './explanationGenerator';
import { isForbiddenExplanationText } from './explanationRules';
import type { OutfitScoreBreakdown } from '../types';

function breakdown(overrides: Partial<OutfitScoreBreakdown> = {}): OutfitScoreBreakdown {
  return {
    compatibility: 70,
    colourHarmony: 70,
    formality: 70,
    occasionFit: 70,
    weatherFit: 70,
    styleMatch: 70,
    wearDiversity: 70,
    personalization: 70,
    novelty: 70,
    overall: 70,
    ...overrides,
  };
}

describe('generateExplanations', () => {
  it('does not claim personalization during cold start', () => {
    const reasons = generateExplanations(breakdown({ personalization: 92, styleMatch: 70 }), {
      coldStart: true,
      personalizationUsed: false,
      occasion: 'Casual',
    });
    expect(reasons.some((reason) => reason.type === 'personalization')).toBe(false);
    expect(reasons.some((reason) => /you tend to choose|engaging with/i.test(reason.text))).toBe(
      false
    );
  });

  it('requires weather evidence for a weather reason', () => {
    const withoutWeather = generateExplanations(breakdown({ weatherFit: 92 }), {
      occasion: 'Casual',
    });
    expect(withoutWeather.some((reason) => reason.type === 'weather')).toBe(false);

    const withWeather = generateExplanations(breakdown({ weatherFit: 92 }), {
      occasion: 'Casual',
      weather: { temperature: 26, condition: 'Clear' },
    });
    expect(withWeather.some((reason) => reason.type === 'weather')).toBe(true);
    expect(withWeather.find((reason) => reason.type === 'weather')?.text).toMatch(/warm weather/i);
  });

  it('requires occasion evidence for an occasion reason', () => {
    const withoutOccasion = generateExplanations(breakdown({ occasionFit: 90 }));
    expect(withoutOccasion.some((reason) => reason.type === 'occasion')).toBe(false);

    const withOccasion = generateExplanations(breakdown({ occasionFit: 90 }), {
      occasion: 'Formal',
    });
    expect(withOccasion.some((reason) => reason.type === 'occasion')).toBe(true);
    expect(withOccasion[0].text).toBe('Fits a formal occasion.');
  });

  it('requires a behavioral signal for personalization', () => {
    const reasons = generateExplanations(breakdown({ personalization: 88, styleMatch: 70 }), {
      personalizationUsed: true,
      coldStart: false,
      occasion: 'Casual',
    });
    expect(reasons.some((reason) => reason.type === 'personalization')).toBe(true);
  });

  it('requires colour compatibility for a colour reason', () => {
    const weak = generateExplanations(breakdown({ colourHarmony: 60 }), { occasion: 'Casual' });
    expect(weak.some((reason) => reason.type === 'colour')).toBe(false);

    const strong = generateExplanations(breakdown({ colourHarmony: 88 }), { occasion: 'Casual' });
    expect(strong.some((reason) => reason.type === 'colour')).toBe(true);
  });

  it('returns at most 3 reasons', () => {
    const reasons = generateExplanations(
      breakdown({
        occasionFit: 90,
        weatherFit: 90,
        colourHarmony: 90,
        formality: 90,
        styleMatch: 90,
        personalization: 96,
      }),
      {
        occasion: 'Work',
        weather: { temperature: 12, condition: 'Clouds' },
        styleIds: ['classic'],
        personalizationUsed: true,
        coldStart: false,
      }
    );
    expect(reasons.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic', () => {
    const input = breakdown({ occasionFit: 86, colourHarmony: 84, weatherFit: 80 });
    const context = {
      occasion: 'Casual' as const,
      weather: { temperature: 22, condition: 'Clear' },
    };
    expect(generateExplanations(input, context)).toEqual(generateExplanations(input, context));
  });

  it('does not contradict weak score data', () => {
    const reasons = generateExplanations(
      breakdown({ occasionFit: 40, weatherFit: 30, colourHarmony: 20, personalization: 50 }),
      {
        occasion: 'Formal',
        weather: { temperature: 2, condition: 'Snow' },
        personalizationUsed: true,
        coldStart: false,
      }
    );
    expect(reasons.some((reason) => reason.type === 'occasion')).toBe(false);
    expect(reasons.some((reason) => reason.type === 'weather')).toBe(false);
    expect(reasons.some((reason) => reason.type === 'colour')).toBe(false);
    expect(reasons.some((reason) => reason.type === 'personalization')).toBe(false);
  });

  it('adds a diversity reason only when diversity actually selected the look', () => {
    const without = generateExplanations(breakdown({ overall: 80 }), { occasion: 'Casual' });
    expect(without.some((reason) => reason.type === 'diversity')).toBe(false);

    const withDiversity = generateExplanations(breakdown({ overall: 80, occasionFit: 40 }), {
      occasion: 'Casual',
      diversitySelected: true,
    });
    expect(withDiversity.some((reason) => reason.type === 'diversity')).toBe(true);
    expect(withDiversity.some((reason) => /alternative combination/i.test(reason.text))).toBe(true);
  });

  it('never uses empty praise copy', () => {
    const reasons = generateExplanations(breakdown(), { occasion: 'Casual' });
    for (const reason of reasons) {
      expect(isForbiddenExplanationText(reason.text)).toBe(false);
    }
  });

  it('does not claim a preferred style unless one was requested', () => {
    const reasons = generateExplanations(breakdown({ styleMatch: 90 }), { occasion: 'Casual' });
    expect(reasons.some((reason) => reason.type === 'style')).toBe(false);
  });
});
