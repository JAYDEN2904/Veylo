/**
 * Try-on garment slot helpers — clothing chain vs accessory Gemini pass.
 */

export type TryOnSlotKind = 'clothing' | 'accessory' | 'unsupported';

const SHOE_TOKENS = [
  'shoe',
  'shoes',
  'sneaker',
  'sneakers',
  'boot',
  'boots',
  'footwear',
  'heel',
  'heels',
  'loafer',
  'loafers',
  'sandal',
  'sandals',
  'oxford',
  'oxfords',
];

const ACCESSORY_TOKENS = [
  'accessory',
  'accessories',
  'bag',
  'bags',
  'handbag',
  'purse',
  'clutch',
  'hat',
  'belt',
  'scarf',
  'watch',
  'sunglasses',
  'jewelry',
  'jewellery',
];

function categoryBlob(category: string | undefined): string {
  return (category ?? '').toLowerCase();
}

/** Priority for clothing VTO chain (lower = first). Accessories return 50; unsupported 99. */
export function tryOnSlotPriority(category: string | undefined): number {
  const c = categoryBlob(category);
  if (c.includes('dress')) return 0;
  if (c.includes('top') || c.includes('shirt') || c.includes('blouse') || c.includes('sweater'))
    return 1;
  if (c.includes('outerwear') || c.includes('jacket') || c.includes('coat') || c.includes('blazer'))
    return 2;
  if (
    c.includes('bottom') ||
    c.includes('pant') ||
    c.includes('skirt') ||
    c.includes('short') ||
    c.includes('jean')
  ) {
    return 3;
  }
  if (SHOE_TOKENS.some((t) => c.includes(t))) return 4;
  if (ACCESSORY_TOKENS.some((t) => c.includes(t))) return 50;
  return 99;
}

export function classifyTryOnSlot(category: string | undefined): TryOnSlotKind {
  const priority = tryOnSlotPriority(category);
  if (priority < 50) return 'clothing';
  if (priority === 50) return 'accessory';
  return 'unsupported';
}

export function isFootwearCategory(category: string | undefined): boolean {
  return SHOE_TOKENS.some((t) => categoryBlob(category).includes(t));
}

export function isAccessoryCategory(category: string | undefined): boolean {
  return ACCESSORY_TOKENS.some((t) => categoryBlob(category).includes(t));
}
