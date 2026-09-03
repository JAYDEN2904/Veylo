import type { ClothingItem } from '../../../types';
import { normalizeCategory } from '../../outfitCategoryNormalize';
import type { CanonicalSlot } from '../types';

export interface ItemPair {
  left: ClothingItem;
  right: ClothingItem;
  slots: [CanonicalSlot, CanonicalSlot];
}

const PAIR_RULES: Array<[CanonicalSlot, CanonicalSlot]> = [
  ['Tops', 'Bottoms'],
  ['Tops', 'Shoes'],
  ['Bottoms', 'Shoes'],
  ['Tops', 'Outerwear'],
  ['Bottoms', 'Outerwear'],
  ['Shoes', 'Accessories'],
  ['Dresses', 'Shoes'],
  ['Dresses', 'Outerwear'],
];

function firstInSlot(
  grouped: Record<string, ClothingItem[]>,
  slot: CanonicalSlot
): ClothingItem | undefined {
  return grouped[slot]?.[0];
}

export function groupItemsBySlot(items: ClothingItem[]): Record<string, ClothingItem[]> {
  const grouped: Record<string, ClothingItem[]> = {};
  for (const item of items) {
    const slot = normalizeCategory(item.category);
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(item);
  }
  return grouped;
}

/** Relevant pairs present in this outfit. Missing slots are skipped. */
export function relevantPairs(items: ClothingItem[]): ItemPair[] {
  const grouped = groupItemsBySlot(items);
  const pairs: ItemPair[] = [];
  for (const [leftSlot, rightSlot] of PAIR_RULES) {
    const left = firstInSlot(grouped, leftSlot);
    const right = firstInSlot(grouped, rightSlot);
    if (!left || !right || left.id === right.id) continue;
    pairs.push({ left, right, slots: [leftSlot, rightSlot] });
  }
  return pairs;
}
