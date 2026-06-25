import type { OnboardingQuizAnswers } from '../types';

/**
 * 9-combination Style DNA matrix.
 *
 * Primary axis: styleArchetype (minimal | bold | eclectic)
 * Secondary axis: lifestyle     (casual | professional | active)
 *
 * Each combination produces a memorable 3–4 word label that captures the
 * intersection of aesthetic sensibility and daily context.
 */
const STYLE_DNA_MATRIX: Record<string, Record<string, string>> = {
  minimal: {
    casual: 'The Quiet Dresser',
    professional: 'The Clean Professional',
    active: 'The Streamlined Mover',
  },
  bold: {
    casual: 'The Weekend Statement',
    professional: 'The Power Player',
    active: 'The Dynamic Force',
  },
  eclectic: {
    casual: 'The Urban Explorer',
    professional: 'The Creative Leader',
    active: 'The Bold Adventurer',
  },
};

const STYLE_DNA_DESCRIPTIONS: Record<string, string> = {
  'The Quiet Dresser': 'Effortless, intentional, and always put-together without trying too hard.',
  'The Clean Professional': 'Sharp lines, neutral palette, and an air of composed authority.',
  'The Streamlined Mover': 'Functional and polished — you look great even on the go.',
  'The Weekend Statement': 'You show up casually dressed but never forgettably so.',
  'The Power Player': 'Bold choices that command the room from the moment you walk in.',
  'The Dynamic Force': 'High energy, standout looks, built for people who move fast.',
  'The Urban Explorer': 'Unexpected combinations that feel intentional and effortlessly cool.',
  'The Creative Leader': 'Rule-bending aesthetics paired with an undeniable professional edge.',
  'The Bold Adventurer': 'No outfit is too interesting — you dress for the thrill of it.',
};

export function deriveStyleDnaLabel(answers: Partial<OnboardingQuizAnswers>): string {
  const archetype = answers.styleArchetype ?? 'minimal';
  const lifestyle = answers.lifestyle ?? 'casual';
  return STYLE_DNA_MATRIX[archetype]?.[lifestyle] ?? 'The Quiet Dresser';
}

export function getStyleDnaDescription(label: string): string {
  return STYLE_DNA_DESCRIPTIONS[label] ?? '';
}

export function getAllStyleDnaLabels(): string[] {
  return Object.values(STYLE_DNA_MATRIX).flatMap((row) => Object.values(row));
}
