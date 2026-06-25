/**
 * Maps messy wardrobe category strings to canonical slots used by the outfit engine.
 */
const ALIAS_TO_CANONICAL: Record<string, string> = {
  top: 'Tops',
  tops: 'Tops',
  shirt: 'Tops',
  shirts: 'Tops',
  tshirt: 'Tops',
  't-shirt': 'Tops',
  tee: 'Tops',
  blouse: 'Tops',
  sweater: 'Tops',
  knitwear: 'Tops',
  tank: 'Tops',
  bottom: 'Bottoms',
  bottoms: 'Bottoms',
  pants: 'Bottoms',
  trousers: 'Bottoms',
  jeans: 'Bottoms',
  shorts: 'Bottoms',
  skirt: 'Bottoms',
  skirts: 'Bottoms',
  leggings: 'Bottoms',
  shoe: 'Shoes',
  shoes: 'Shoes',
  sneakers: 'Shoes',
  boots: 'Shoes',
  footwear: 'Shoes',
  sandals: 'Shoes',
  outerwear: 'Outerwear',
  jacket: 'Outerwear',
  jackets: 'Outerwear',
  coat: 'Outerwear',
  coats: 'Outerwear',
  blazer: 'Outerwear',
  hoodie: 'Outerwear',
  accessory: 'Accessories',
  accessories: 'Accessories',
  bag: 'Accessories',
  bags: 'Accessories',
  belt: 'Accessories',
  hat: 'Accessories',
  jewelry: 'Accessories',
  dress: 'Dresses',
  dresses: 'Dresses',
  jumpsuit: 'Dresses',
  romper: 'Dresses',
};

const CANONICAL = new Set(['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories', 'Dresses']);

export function normalizeCategory(raw: string): string {
  const t = raw.trim();
  if (CANONICAL.has(t)) return t;
  const lower = t.toLowerCase();
  return ALIAS_TO_CANONICAL[lower] ?? t;
}

export function withNormalizedCategories<T extends { category: string }>(
  items: T[]
): (T & { category: string })[] {
  return items.map((item) => ({
    ...item,
    category: normalizeCategory(item.category),
  }));
}
