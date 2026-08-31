/**
 * Client mirror of edge occasionProfiles — used by local outfit generation fallback.
 */

import { gendersAreCompatible, type GenderAffinity } from './itemMetadata';

export type OccasionKey = 'Casual' | 'Work' | 'Date Night' | 'Party' | 'Formal' | 'Exercise';

export interface OccasionProfile {
  key: OccasionKey;
  formalityMin: number;
  formalityMax: number;
  boostKeywords: string[];
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

export function getOccasionProfile(occasion?: string): OccasionProfile | null {
  if (!occasion) return null;
  if (OCCASION_PROFILES[occasion as OccasionKey]) {
    return OCCASION_PROFILES[occasion as OccasionKey];
  }
  return null;
}

export interface OccasionScoredItem {
  id: string;
  category: string;
  subCategory?: string | null;
  colors?: string[];
  tags?: string[];
  occasionTags?: string[] | null;
  formalityScore?: number | null;
  genderAffinity?: GenderAffinity | null;
}

function itemBlob(item: OccasionScoredItem): string {
  return [
    item.category,
    item.subCategory ?? '',
    ...(item.tags ?? []),
    ...(item.occasionTags ?? []),
    ...(item.colors ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

export function isBannedForOccasion(item: OccasionScoredItem, profile: OccasionProfile): boolean {
  const blob = itemBlob(item);
  return profile.banKeywords.some((kw) => blob.includes(kw.toLowerCase()));
}

export function scoreOccasionFit(item: OccasionScoredItem, profile: OccasionProfile): number {
  let score = 55;
  const formality = item.formalityScore ?? 2;

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

  const occasionTags = (item.occasionTags ?? []).map((t) => t.toLowerCase());
  const profileKeys = [profile.key.toLowerCase(), ...profile.key.toLowerCase().split(' ')];
  if (occasionTags.some((t) => profileKeys.some((k) => t.includes(k) || k.includes(t)))) {
    score += 15;
  }

  if (isBannedForOccasion(item, profile)) {
    score = Math.min(score, 15);
  }

  return Math.max(0, Math.min(100, score));
}

export function filterItemsForOccasion<T extends OccasionScoredItem>(
  items: T[],
  profile: OccasionProfile,
  options: { hardBan: boolean } = { hardBan: true }
): T[] {
  return items.filter((item) => {
    if (options.hardBan && isBannedForOccasion(item, profile)) return false;
    const formality = item.formalityScore ?? 2;
    if (formality < profile.formalityMin - 1 || formality > profile.formalityMax + 1) {
      return false;
    }
    return true;
  });
}

export function isGenderCoherentWithPicked(
  candidate: OccasionScoredItem,
  picked: OccasionScoredItem[]
): boolean {
  for (const p of picked) {
    if (!gendersAreCompatible(candidate.genderAffinity, p.genderAffinity)) {
      return false;
    }
  }
  return true;
}

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
