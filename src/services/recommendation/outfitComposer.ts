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

function coreScore(items: ClothingItem[], scores: Map<string, number>): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (scores.get(item.id) ?? 0), 0) / items.length;
}

function uniqueByIdSet(outfits: ClothingItem[][]): ClothingItem[][] {
  const seen = new Set<string>();
  const unique: ClothingItem[][] = [];
  for (const outfit of outfits) {
    const key = outfit
      .map((item) => item.id)
      .sort()
      .join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(outfit);
  }
  return unique;
}

function takeTopCores(
  cores: ClothingItem[][],
  scores: Map<string, number>,
  limit: number
): ClothingItem[][] {
  return [...cores]
    .sort((a, b) => coreScore(b, scores) - coreScore(a, scores))
    .slice(0, Math.max(limit, 0));
}

function enumerateCores(
  structure: OutfitStructure,
  pool: CandidatePool,
  anchorsByCategory: Record<string, ClothingItem[]>,
  coreBudget: number
): ClothingItem[][] {
  const requiredLists = structure.required.map((slot) =>
    itemsForSlot(slot, pool, anchorsByCategory)
  );
  if (requiredLists.some((list) => list.length === 0)) return [];

  const shoeList = itemsForSlot('Shoes', pool, anchorsByCategory);
  const slotLists = shoeList.length > 0 ? [...requiredLists, shoeList] : requiredLists;
  const cores = cartesianProduct(slotLists).filter((combo) => {
    const ids = combo.map((item) => item.id);
    return new Set(ids).size === ids.length;
  });

  return takeTopCores(cores, pool.preliminaryScores, coreBudget);
}

function attachOptionalLayers(
  cores: ClothingItem[][],
  pool: CandidatePool,
  anchorsByCategory: Record<string, ClothingItem[]>
): ClothingItem[][] {
  const outerwear = itemsForSlot('Outerwear', pool, anchorsByCategory);
  const accessories = itemsForSlot('Accessories', pool, anchorsByCategory);
  const forcedOuter = (anchorsByCategory['Outerwear'] ?? [])[0];
  const forcedAccessory = (anchorsByCategory['Accessories'] ?? [])[0];

  return cores.map((core, index) => {
    const next = [...core];
    const outer =
      forcedOuter ?? (outerwear.length > 0 ? outerwear[index % outerwear.length] : null);
    const accessory =
      forcedAccessory ?? (accessories.length > 0 ? accessories[index % accessories.length] : null);
    if (outer && !next.some((item) => item.id === outer.id)) next.push(outer);
    if (accessory && !next.some((item) => item.id === accessory.id)) next.push(accessory);
    return next;
  });
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
  const coreBudget = Math.max(6, Math.ceil(maxComposed / Math.max(structures.length, 1)));
  const outfits: ClothingItem[][] = [];

  for (const structure of structures) {
    const cores = enumerateCores(structure, pool, anchorsByCategory, coreBudget);
    const layered = attachOptionalLayers(cores, pool, anchorsByCategory);
    for (const outfit of layered) {
      const withAnchors = mergeAnchors(outfit, anchors);
      if (meetsMinimumCoverage(withAnchors)) outfits.push(withAnchors);
    }
  }

  return uniqueByIdSet(outfits).slice(0, maxComposed);
}
