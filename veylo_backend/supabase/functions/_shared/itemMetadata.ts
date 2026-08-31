/** Derive gender affinity and occasion tags from Vision / item text signals. */

export type GenderAffinity = 'men' | 'women' | 'unisex';

const WOMEN_TOKENS = [
  'handbag',
  'purse',
  'heel',
  'heels',
  'stiletto',
  'wedge',
  'skirt',
  'blouse',
  'gown',
  'dress',
  'bra',
  'lingerie',
  'women',
  "women's",
  'womens',
  'lady',
  'clutch',
];

const MEN_TOKENS = [
  'oxford',
  'necktie',
  'tie',
  'suit jacket',
  'mens',
  "men's",
  'male',
  'boxer',
  'briefcase',
];

const OCCASION_RULES: Array<{ tag: string; tokens: string[] }> = [
  {
    tag: 'exercise',
    tokens: [
      'gym',
      'athletic',
      'sport',
      'workout',
      'running',
      'training',
      'activewear',
      'yoga',
      'sneaker',
      'active',
    ],
  },
  {
    tag: 'formal',
    tokens: [
      'suit',
      'tuxedo',
      'gown',
      'black-tie',
      'black tie',
      'formal',
      'elegant',
      'dressy',
      'oxford',
      'loafer',
      'blazer',
      'evening wear',
    ],
  },
  {
    tag: 'work',
    tokens: [
      'office',
      'work',
      'business',
      'professional',
      'chino',
      'blazer',
      'button-down',
      'button down',
      'collar',
      'trouser',
    ],
  },
  {
    tag: 'party',
    tokens: ['party', 'cocktail', 'evening', 'club', 'sparkle', 'sequin', 'night out'],
  },
  {
    tag: 'date',
    tokens: ['date', 'romantic', 'date night'],
  },
  {
    tag: 'casual',
    tokens: ['casual', 'everyday', 'weekend', 'jeans', 'tee', 't-shirt', 'hoodie', 'sneaker'],
  },
];

function blobFromParts(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .join(' ')
    .toLowerCase();
}

/**
 * Infer men/women/unisex from category labels and style tags.
 * Handbags, heels, skirts → women; oxfords/ties → men; otherwise unisex.
 */
export function deriveGenderAffinity(options: {
  category?: string | null;
  subCategory?: string | null;
  styleTags?: string[];
  labels?: string[];
}): GenderAffinity {
  const blob = blobFromParts([
    options.category,
    options.subCategory,
    ...(options.styleTags ?? []),
    ...(options.labels ?? []),
  ]);

  const isWomen = WOMEN_TOKENS.some((t) => blob.includes(t));
  const isMen = MEN_TOKENS.some((t) => blob.includes(t));

  if (isWomen && !isMen) return 'women';
  if (isMen && !isWomen) return 'men';
  return 'unisex';
}

/**
 * Infer occasion tags from Vision labels / style tags / formality.
 * Always returns at least one tag.
 */
export function deriveOccasionTags(options: {
  category?: string | null;
  subCategory?: string | null;
  styleTags?: string[];
  labels?: string[];
  formalityScore?: number | null;
}): string[] {
  const blob = blobFromParts([
    options.category,
    options.subCategory,
    ...(options.styleTags ?? []),
    ...(options.labels ?? []),
  ]);

  const found = new Set<string>();
  for (const rule of OCCASION_RULES) {
    if (rule.tokens.some((t) => blob.includes(t))) {
      found.add(rule.tag);
    }
  }

  const formality = options.formalityScore ?? 2;
  if (formality >= 4) found.add('formal');
  else if (formality === 3) found.add('work');
  else if (formality === 1) found.add('exercise');
  else found.add('casual');

  return [...found];
}

/** True when two affinities can appear in the same outfit. */
export function gendersAreCompatible(
  a: GenderAffinity | null | undefined,
  b: GenderAffinity | null | undefined
): boolean {
  const left = a ?? 'unisex';
  const right = b ?? 'unisex';
  if (left === 'unisex' || right === 'unisex') return true;
  return left === right;
}
