import type { ClothingItem } from '../../types';
import { normalizeCategory } from '../outfitCategoryNormalize';
import { getOccasionProfile } from '../../utils/occasionProfiles';
import type { CandidatePool, CanonicalSlot, RecommendationRequest } from './types';

export interface OutfitStructure {
  id: 'standard' | 'dress';
  required: CanonicalSlot[];
  optional: CanonicalSlot[];
}

export const STANDARD_STRUCTURE: OutfitStructure = {
  id: 'standard',
  required: ['Tops', 'Bottoms'],
  optional: ['Shoes', 'Outerwear', 'Accessories'],
};

export const DRESS_STRUCTURE: OutfitStructure = {
  id: 'dress',
  required: ['Dresses'],
  optional: ['Shoes', 'Outerwear', 'Accessories'],
};

export function meetsMinimumCoverage(items: ClothingItem[]): boolean {
  const categories = new Set(items.map((item) => normalizeCategory(item.category)));
  if (categories.has('Dresses')) return true;
  return categories.has('Tops') && categories.has('Bottoms');
}

function groupAnchors(anchors: ClothingItem[]): Record<string, ClothingItem[]> {
  const grouped: Record<string, ClothingItem[]> = {};
  for (const item of anchors) {
    const category = normalizeCategory(item.category);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  }
  return grouped;
}

function prefersDressPath(occasion?: string): boolean {
  if (!occasion) return false;
  return getOccasionProfile(occasion)?.preferDress ?? false;
}

export function selectStructures(
  pool: CandidatePool,
  anchors: ClothingItem[],
  request: RecommendationRequest
): OutfitStructure[] {
  const hasDress = (pool.byCategory['Dresses'] ?? []).length > 0;
  const hasStandard =
    (pool.byCategory['Tops'] ?? []).length > 0 && (pool.byCategory['Bottoms'] ?? []).length > 0;
  const forcedDress = anchors.some((item) => normalizeCategory(item.category) === 'Dresses');
  const forcedTopOrBottom = anchors.some((item) => {
    const category = normalizeCategory(item.category);
    return category === 'Tops' || category === 'Bottoms';
  });

  if (forcedDress && !forcedTopOrBottom) return [DRESS_STRUCTURE];
  if (forcedTopOrBottom && !forcedDress) return [STANDARD_STRUCTURE];
  if (forcedDress && forcedTopOrBottom) return [STANDARD_STRUCTURE, DRESS_STRUCTURE];

  const dressFirst = prefersDressPath(request.occasion) && hasDress;
  const ordered: OutfitStructure[] = [];
  if (dressFirst) {
    ordered.push(DRESS_STRUCTURE);
    if (hasStandard) ordered.push(STANDARD_STRUCTURE);
    return ordered;
  }
  if (hasStandard) ordered.push(STANDARD_STRUCTURE);
  if (hasDress) ordered.push(DRESS_STRUCTURE);
  return ordered;
}

function itemsForSlot(
  slot: CanonicalSlot,
  pool: CandidatePool,
  anchorsByCategory: Record<string, ClothingItem[]>
): ClothingItem[] {
  const anchored = anchorsByCategory[slot];
  if (anchored && anchored.length > 0) return anchored;
  return pool.byCategory[slot] ?? [];
}

function cartesianProduct<T>(lists: T[][]): T[][] {
  if (lists.length === 0) return [[]];
  return lists.reduce<T[][]>(
    (acc, list) => acc.flatMap((combo) => list.map((item) => [...combo, item])),
    [[]]
  );
}

function outfitKey(items: ClothingItem[]): string {
  return items
    .map((item) => item.id)
    .sort()
    .join('|');
}

function uniqueByIdSet(outfits: ClothingItem[][]): ClothingItem[][] {
  const seen = new Set<string>();
  const unique: ClothingItem[][] = [];
  for (const outfit of outfits) {
    const key = outfitKey(outfit);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(outfit);
  }
  return unique;
}

/**
 * Bound an oversized cartesian by item coverage, not individual scores.
 * Every item in every required slot appears in at least one kept core when possible.
 */
export function selectCoresStructurally(cores: ClothingItem[][], limit: number): ClothingItem[][] {
  if (cores.length <= limit) return cores;
  if (limit <= 0) return [];

  const selected: ClothingItem[][] = [];
  const seen = new Set<string>();

  const tryAdd = (core: ClothingItem[]): boolean => {
    const key = outfitKey(core);
    if (seen.has(key) || selected.length >= limit) return false;
    seen.add(key);
    selected.push(core);
    return true;
  };

  const slotCount = cores[0]?.length ?? 0;
  for (let slot = 0; slot < slotCount; slot++) {
    const covered = new Set<string>();
    for (const core of cores) {
      const item = core[slot];
      if (!item || covered.has(item.id)) continue;
      if (tryAdd(core)) covered.add(item.id);
    }
  }

  const stride = Math.max(1, Math.floor(cores.length / Math.max(limit - selected.length, 1)));
  for (let i = 0; i < cores.length && selected.length < limit; i += stride) {
    tryAdd(cores[i]);
  }
  for (const core of cores) {
    if (selected.length >= limit) break;
    tryAdd(core);
  }

  return selected;
}

function enumerateRequiredCores(
  structure: OutfitStructure,
  pool: CandidatePool,
  anchorsByCategory: Record<string, ClothingItem[]>
): ClothingItem[][] {
  const requiredLists = structure.required.map((slot) =>
    itemsForSlot(slot, pool, anchorsByCategory)
  );
  if (requiredLists.some((list) => list.length === 0)) return [];

  return cartesianProduct(requiredLists).filter((combo) => {
    const ids = combo.map((item) => item.id);
    return new Set(ids).size === ids.length;
  });
}

/**
 * Attach a required-if-present slot (shoes) so every core stays representable.
 * Extra pairings are added only while budget remains — no score ranking.
 */
function expandPresentSlot(
  cores: ClothingItem[][],
  layers: ClothingItem[],
  budget: number
): ClothingItem[][] {
  if (layers.length === 0) return cores;
  if (cores.length === 0) return [];

  const fullSize = cores.length * layers.length;
  if (fullSize <= budget) {
    return cores.flatMap((core) => layers.map((layer) => [...core, layer]));
  }

  const expanded = cores.map((core, index) => [...core, layers[index % layers.length]]);
  const remaining = Math.max(0, budget - expanded.length);
  if (remaining === 0) return expanded;

  const extras: ClothingItem[][] = [];
  for (let offset = 1; offset < layers.length && extras.length < remaining; offset++) {
    for (let i = 0; i < cores.length && extras.length < remaining; i++) {
      extras.push([...cores[i], layers[(i + offset) % layers.length]]);
    }
  }
  return [...expanded, ...extras];
}

/**
 * Optional layers become extra outfit variants. The bare core is always kept
 * unless the layer is a must-include anchor.
 */
function expandOptionalSlot(
  bases: ClothingItem[][],
  layers: ClothingItem[],
  budget: number,
  isForced: boolean
): ClothingItem[][] {
  if (layers.length === 0) return bases;
  if (isForced) {
    const forced = layers[0];
    return bases.map((base) =>
      base.some((item) => item.id === forced.id) ? base : [...base, forced]
    );
  }

  const variants = [...bases];
  const remaining = Math.max(0, budget - variants.length);
  if (remaining === 0) return variants;

  let added = 0;
  for (let offset = 0; offset < layers.length && added < remaining; offset++) {
    for (let i = 0; i < bases.length && added < remaining; i++) {
      const layer = layers[(i + offset) % layers.length];
      const next = bases[i].some((item) => item.id === layer.id) ? bases[i] : [...bases[i], layer];
      variants.push(next);
      added += 1;
    }
  }
  return variants;
}

function resolveAnchors(pool: CandidatePool, request: RecommendationRequest): ClothingItem[] {
  const ids = request.mustIncludeItemIds ?? [];
  if (ids.length === 0) return [];
  const all = Object.values(pool.byCategory).flat();
  const byId = new Map(all.map((item) => [item.id, item] as const));
  return ids.map((id) => byId.get(id)).filter((item): item is ClothingItem => item != null);
}

function targetComposedCount(candidateCount: number, maxComposed?: number): number {
  const cap = maxComposed ?? (candidateCount <= 8 ? 12 : candidateCount <= 20 ? 40 : 80);
  return Math.max(1, cap);
}

function mergeAnchors(outfit: ClothingItem[], anchors: ClothingItem[]): ClothingItem[] {
  if (anchors.length === 0) return outfit;
  const ids = new Set(outfit.map((item) => item.id));
  const missing = anchors.filter((item) => !ids.has(item.id));
  return missing.length === 0 ? outfit : [...outfit, ...missing];
}

export function composeOutfits(
  pool: CandidatePool,
  request: RecommendationRequest,
  options: { maxComposed?: number } = {}
): ClothingItem[][] {
  const anchors = resolveAnchors(pool, request);
  const anchorsByCategory = groupAnchors(anchors);
  const structures = selectStructures(pool, anchors, request);
  if (structures.length === 0) return [];

  const maxComposed = targetComposedCount(pool.totalCandidates, options.maxComposed);
  const pairBudget = Math.max(12, maxComposed);
  const outfits: ClothingItem[][] = [];

  for (const structure of structures) {
    const requiredCores = enumerateRequiredCores(structure, pool, anchorsByCategory);
    const cores = selectCoresStructurally(requiredCores, pairBudget);
    const shoes = itemsForSlot('Shoes', pool, anchorsByCategory);
    const withShoes = expandPresentSlot(cores, shoes, maxComposed);
    const withOuter = expandOptionalSlot(
      withShoes,
      itemsForSlot('Outerwear', pool, anchorsByCategory),
      maxComposed,
      (anchorsByCategory['Outerwear']?.length ?? 0) > 0
    );
    const withAccessories = expandOptionalSlot(
      withOuter,
      itemsForSlot('Accessories', pool, anchorsByCategory),
      maxComposed,
      (anchorsByCategory['Accessories']?.length ?? 0) > 0
    );

    for (const outfit of withAccessories) {
      const withAnchors = mergeAnchors(outfit, anchors);
      if (meetsMinimumCoverage(withAnchors)) outfits.push(withAnchors);
    }
  }

  return uniqueByIdSet(outfits).slice(0, maxComposed);
}
