/**
 * Occasion profiles for Today pills — target formality, boost/ban keywords, structure prefs.
 */

import { gendersAreCompatible, type GenderAffinity } from './itemMetadata.ts';

export type OccasionKey = 'Casual' | 'Work' | 'Date Night' | 'Party' | 'Formal' | 'Exercise';

export interface OccasionProfile {
  key: OccasionKey;
  /** Inclusive formality_score range (1–4). */
  formalityMin: number;
  formalityMax: number;
  /** Soft boost when item tags / occasion_tags hit these. */
  boostKeywords: string[];
  /** Hard-ban tokens (unless wardrobe too small and filters relax). */
  banKeywords: string[];
  preferDress: boolean;
}

export const OCCASION_PROFILES: Record<OccasionKey, OccasionProfile> = {
  Casual: {
    key: 'Casual',
    formalityMin: 1,
    formalityMax: 3,
    boostKeywords: ['casual', 'everyday', 'weekend', 'comfort', 'relaxed', 'jeans'],
    banKeywords: ['tuxedo', 'black-tie', 'black tie', 'gown', 'stiletto'],
    preferDress: false,
  },
  Work: {
    key: 'Work',
    formalityMin: 2,
    formalityMax: 4,
    boostKeywords: ['work', 'business', 'professional', 'office', 'blazer', 'chino', 'collar'],
    banKeywords: [
      'gym',
      'athletic',
      'workout',
      'running',
      'party',
      'sequin',
      'flip-flop',
      'flip flop',
      'swimsuit',
    ],
    preferDress: false,
  },
  'Date Night': {
    key: 'Date Night',
    formalityMin: 2,
    formalityMax: 4,
    boostKeywords: ['date', 'romantic', 'evening', 'elegant', 'dressy', 'night'],
    banKeywords: ['gym', 'athletic', 'workout', 'hoodie', 'sweatpants'],
    preferDress: true,
  },
  Party: {
    key: 'Party',
    formalityMin: 2,
    formalityMax: 4,
    boostKeywords: ['party', 'evening', 'cocktail', 'celebration', 'sparkle', 'sequin'],
    banKeywords: ['gym', 'athletic', 'workout', 'office', 'chino'],
    preferDress: true,
  },
  Formal: {
    key: 'Formal',
    formalityMin: 3,
    formalityMax: 4,
    boostKeywords: ['formal', 'elegant', 'dressy', 'suit', 'blazer', 'oxford', 'loafer', 'gown'],
    banKeywords: [
      'gym',
      'athletic',
      'sport',
      'workout',
      'sneaker',
      'sneakers',
      'hoodie',
      'jeans',
      'shorts',
      'flip-flop',
      'flip flop',
      'tee',
      't-shirt',
    ],
    preferDress: true,
  },
  Exercise: {
    key: 'Exercise',
    formalityMin: 1,
    formalityMax: 2,
    boostKeywords: ['sport', 'athletic', 'gym', 'workout', 'active', 'running', 'training'],
    banKeywords: ['suit', 'tuxedo', 'gown', 'blazer', 'oxford', 'heel', 'heels', 'formal'],
    preferDress: false,
  },
};

export function normalizeOccasionKey(raw?: string): OccasionKey | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  const map: Record<string, OccasionKey> = {
    casual: 'Casual',
    work: 'Work',
    formal: 'Formal',
    exercise: 'Exercise',
    sport: 'Exercise',
    date: 'Date Night',
    'date night': 'Date Night',
    party: 'Party',
    evening: 'Party',
  };
  return map[key];
}

export function getOccasionProfile(occasion?: string): OccasionProfile | null {
  const key =
    normalizeOccasionKey(occasion) ??
    (OCCASION_PROFILES[occasion as OccasionKey] ? (occasion as OccasionKey) : undefined);
  if (!key) return null;
  return OCCASION_PROFILES[key] ?? null;
}

export interface OccasionScoredItem {
  id: string;
  category: string;
  sub_category?: string | null;
  colors?: string[];
  tags?: string[];
  occasion_tags?: string[] | null;
  formality_score?: number | null;
  gender_affinity?: GenderAffinity | null;
}

function itemBlob(item: OccasionScoredItem): string {
  return [
    item.category,
    item.sub_category ?? '',
    ...(item.tags ?? []),
    ...(item.occasion_tags ?? []),
    ...(item.colors ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

/** True when ban keywords appear on the item for this occasion. */
export function isBannedForOccasion(item: OccasionScoredItem, profile: OccasionProfile): boolean {
  const blob = itemBlob(item);
  return profile.banKeywords.some((kw) => blob.includes(kw.toLowerCase()));
}

/**
 * Soft occasion fit 0–100: formality range + boost keyword hits + occasion_tags overlap.
 */
export function scoreOccasionFit(item: OccasionScoredItem, profile: OccasionProfile): number {
  let score = 55;
  const formality = item.formality_score ?? 2;

  if (formality >= profile.formalityMin && formality <= profile.formalityMax) {
    score += 30;
  } else if (formality === profile.formalityMin - 1 || formality === profile.formalityMax + 1) {
    score += 5;
  } else {
    score -= 25;
  }

  const blob = itemBlob(item);
  const boostHits = profile.boostKeywords.filter((kw) => blob.includes(kw.toLowerCase())).length;
  score += Math.min(25, boostHits * 8);

  const occasionTags = (item.occasion_tags ?? []).map((t) => t.toLowerCase());
  const profileKeys = [profile.key.toLowerCase(), ...profile.key.toLowerCase().split(' ')];
  if (occasionTags.some((t) => profileKeys.some((k) => t.includes(k) || k.includes(t)))) {
    score += 15;
  }

  if (isBannedForOccasion(item, profile)) {
    score = Math.min(score, 15);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Filter candidates: drop banned + formality outliers. Returns filtered list;
 * if too few remain for a viable outfit, caller should relax.
 */
export function filterItemsForOccasion<T extends OccasionScoredItem>(
  items: T[],
  profile: OccasionProfile,
  options: { hardBan: boolean } = { hardBan: true }
): T[] {
  return items.filter((item) => {
    if (options.hardBan && isBannedForOccasion(item, profile)) return false;
    const formality = item.formality_score ?? 2;
    // Allow ±1 outside target range when hardBan (soft formality); ban only extremes of ±2+
    if (formality < profile.formalityMin - 1 || formality > profile.formalityMax + 1) {
      return false;
    }
    return true;
  });
}

/** Gender coherence: candidate must not conflict with any already-picked affinity. */
export function isGenderCoherentWithPicked(
  candidate: OccasionScoredItem,
  picked: OccasionScoredItem[]
): boolean {
  for (const p of picked) {
    if (!gendersAreCompatible(candidate.gender_affinity, p.gender_affinity)) {
      return false;
    }
  }
  return true;
}

/** Occasion-specific fallback reasoning when AI refinement is unavailable. */
export function buildOccasionAwareReasoning(
  items: OccasionScoredItem[],
  profile: OccasionProfile | null,
  extras: { colourOk?: boolean; weatherOk?: boolean; wearFresh?: boolean } = {}
): string[] {
  const lines: string[] = [];
  if (!profile) {
    lines.push('A balanced look pulled from your wardrobe.');
    return lines;
  }

  const categories = items.map((i) => i.category.toLowerCase());
  const hasShoes = categories.some(
    (c) => c.includes('shoe') || c.includes('sneaker') || c.includes('boot')
  );
  const hasOuter = categories.some(
    (c) => c.includes('outer') || c.includes('jacket') || c.includes('coat')
  );

  switch (profile.key) {
    case 'Work':
      lines.push(
        hasOuter
          ? 'Smart pieces that read office-ready without feeling stiff.'
          : 'Clean lines and work-appropriate formality across the set.'
      );
      break;
    case 'Formal':
      lines.push(
        hasShoes
          ? 'Elevated formality with shoes that finish a polished look.'
          : 'Tailored pieces chosen for a formal occasion.'
      );
      break;
    case 'Date Night':
      lines.push('A date-night mix — intentional, put-together, and a little elevated.');
      break;
    case 'Party':
      lines.push('Evening energy with pieces that hold up past sunset.');
      break;
    case 'Exercise':
      lines.push('Built for movement — athletic pieces that actually belong together.');
      break;
    default:
      lines.push('Easy everyday pieces that feel natural together.');
  }

  if (extras.colourOk) lines.push('Colours sit comfortably next to each other.');
  if (extras.weatherOk) lines.push('Suited to today’s weather.');
  if (extras.wearFresh) lines.push('Gives under-worn pieces a turn.');

  return lines.slice(0, 3);
}
