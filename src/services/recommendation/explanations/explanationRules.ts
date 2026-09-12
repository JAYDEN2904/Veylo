import type { OutfitScoreBreakdown } from '../types';
import type { ExplanationCandidate, ExplanationContext } from './explanationTypes';

/** Scores at or above this can support a user-facing claim for that dimension. */
export const EXPLANATION_SCORE_THRESHOLD = {
  occasion: 75,
  weather: 75,
  style: 78,
  colour: 80,
  formality: 80,
  personalizationDelta: 6,
} as const;

/**
 * Lower number = higher priority when scores both qualify.
 * Hard contextual fit (occasion/weather) before learned or aesthetic signals.
 */
export const EXPLANATION_PRIORITY: Record<ExplanationCandidate['type'], number> = {
  occasion: 0,
  weather: 1,
  personalization: 2,
  style: 3,
  colour: 4,
  formality: 5,
  diversity: 6,
  compatibility: 7,
  novelty: 8,
  wardrobe: 9,
};

const FORBIDDEN_PHRASES = [
  'great outfit',
  'perfect choice',
  'this is the best outfit',
  'best outfit',
];

export function isForbiddenExplanationText(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

export function confidenceFromScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, Math.round(((score - 50) / 50) * 100) / 100));
}

function candidate(
  type: ExplanationCandidate['type'],
  text: string,
  score: number
): ExplanationCandidate {
  return {
    type,
    text,
    score,
    confidence: confidenceFromScore(score),
    priority: EXPLANATION_PRIORITY[type],
  };
}

function occasionText(occasion: string): string {
  switch (occasion) {
    case 'Formal':
      return 'Fits a formal occasion.';
    case 'Casual':
      return 'Works well for a casual day.';
    case 'Work':
      return 'Fits a work setting.';
    case 'Date Night':
      return 'Fits a date night.';
    case 'Party':
      return 'Works well for a night out.';
    case 'Exercise':
      return 'Fits an exercise session.';
    default:
      return `Fits a ${occasion.toLowerCase()} occasion.`;
  }
}

function weatherText(context?: ExplanationContext): string {
  const temperature = context?.weather?.temperature;
  if (typeof temperature === 'number') {
    if (temperature >= 24) return "Works well for today's warm weather.";
    if (temperature <= 8) return "Works well for today's cold weather.";
    if (temperature <= 15) return 'Light layers make this suitable for cooler weather.';
  }
  const condition = context?.weather?.condition?.toLowerCase() ?? '';
  if (condition.includes('rain')) return 'Suitable for wet weather.';
  return "Suited to today's weather as a complete outfit.";
}

function requestedStyleLabel(context?: ExplanationContext): string | undefined {
  const raw = [...(context?.stylePreferences ?? []), ...(context?.styleIds ?? [])]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (raw.some((value) => value.includes('minimal'))) return 'minimalist';
  if (raw.some((value) => value.includes('classic'))) return 'classic';
  if (raw.some((value) => value.includes('street'))) return 'streetwear';
  if (raw.some((value) => value.includes('formal') || value.includes('elegant'))) return 'formal';
  if (raw.some((value) => value.includes('athletic') || value.includes('sport'))) return 'athletic';
  if (raw.some((value) => value.includes('bold'))) return 'bold';
  if (raw.some((value) => value.includes('casual') || value.includes('relaxed'))) return 'casual';
  return undefined;
}

function styleText(label: string): string {
  if (label === 'minimalist') return 'Matches your preferred minimalist style.';
  if (label === 'casual') return 'Fits your usual casual style.';
  return `Matches your preferred ${label} style.`;
}

export function collectExplanationCandidates(
  breakdown: OutfitScoreBreakdown,
  context?: ExplanationContext
): ExplanationCandidate[] {
  const candidates: ExplanationCandidate[] = [];
  const occasion = context?.occasion?.trim();

  if (occasion && breakdown.occasionFit >= EXPLANATION_SCORE_THRESHOLD.occasion) {
    candidates.push(candidate('occasion', occasionText(occasion), breakdown.occasionFit));
  }

  const weatherInRequest = Boolean(context?.weather);
  if (weatherInRequest && breakdown.weatherFit >= EXPLANATION_SCORE_THRESHOLD.weather) {
    candidates.push(candidate('weather', weatherText(context), breakdown.weatherFit));
  }

  const coldStart = context?.coldStart === true;
  const personalizationAllowed =
    !coldStart && context?.personalizationUsed !== false;
  if (
    personalizationAllowed &&
    breakdown.personalization >= breakdown.styleMatch + EXPLANATION_SCORE_THRESHOLD.personalizationDelta
  ) {
    candidates.push(
      candidate('personalization', 'Uses colours you tend to choose.', breakdown.personalization)
    );
  }

  const styleLabel = requestedStyleLabel(context);
  if (styleLabel && breakdown.styleMatch >= EXPLANATION_SCORE_THRESHOLD.style) {
    candidates.push(candidate('style', styleText(styleLabel), breakdown.styleMatch));
  }

  if (breakdown.colourHarmony >= EXPLANATION_SCORE_THRESHOLD.colour) {
    candidates.push(
      candidate('colour', 'The colours work well together.', breakdown.colourHarmony)
    );
  }

  if (breakdown.formality >= EXPLANATION_SCORE_THRESHOLD.formality) {
    candidates.push(
      candidate('formality', 'Keeps formality consistent across the look.', breakdown.formality)
    );
  }

  if (context?.diversitySelected) {
    candidates.push(
      candidate(
        'diversity',
        'An alternative combination for the same occasion.',
        breakdown.overall
      )
    );
  }

  return candidates.filter((entry) => !isForbiddenExplanationText(entry.text));
}

export function rankExplanationCandidates(
  candidates: ExplanationCandidate[]
): ExplanationCandidate[] {
  return [...candidates].sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    if (right.score !== left.score) return right.score - left.score;
    return left.type.localeCompare(right.type);
  });
}
