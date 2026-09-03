import type { ClothingItem } from '../../types';
import { normalizeCategory } from '../outfitCategoryNormalize';
import { scoreItemForSlot, type ScoreContext } from '../outfitScoring';
import {
  CANONICAL_SLOTS,
  DEFAULT_CANDIDATE_LIMITS,
  type CandidateLimits,
  type CandidatePool,
  type RecommendationRequest,
} from './types';
import { occasionTagKeywords, buildStyleBoostTerms } from './styleTerms';

export function buildScoreContext(request: RecommendationRequest): ScoreContext {
  const occasionKey = request.occasion ?? 'Casual';
  return {
    occasionTagKeywords: occasionTagKeywords(occasionKey),
    styleBoostTerms: buildStyleBoostTerms(request),
    weather: request.weather,
    paletteId: request.paletteId,
    occasionKey,
  };
}

function groupByCategory(items: ClothingItem[]): Record<string, ClothingItem[]> {
  const grouped: Record<string, ClothingItem[]> = {};
  for (const item of items) {
    const category = normalizeCategory(item.category);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ ...item, category });
  }
  return grouped;
}

function sortByPreliminaryScore(
  items: ClothingItem[],
  scores: Map<string, number>
): ClothingItem[] {
  return [...items].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
}

function ensureAnchors(
  selected: ClothingItem[],
  categoryItems: ClothingItem[],
  anchorIds: Set<string>
): ClothingItem[] {
  const selectedIds = new Set(selected.map((item) => item.id));
  const missingAnchors = categoryItems.filter(
    (item) => anchorIds.has(item.id) && !selectedIds.has(item.id)
  );
  if (missingAnchors.length === 0) return selected;
  return [...missingAnchors, ...selected.filter((item) => !anchorIds.has(item.id))];
}

function itemColors(items: ClothingItem[]): Set<string> {
  return new Set(
    items.flatMap((entry) => (entry.colors ?? []).map((color) => color.toLowerCase()))
  );
}

function isStructurallyDifferent(item: ClothingItem, selected: ClothingItem[]): boolean {
  const selectedColors = itemColors(selected);
  const selectedSubs = new Set(
    selected.map((entry) => (entry.subCategory ?? '').trim().toLowerCase()).filter(Boolean)
  );
  const hasNewColor = (item.colors ?? []).some((color) => !selectedColors.has(color.toLowerCase()));
  const sub = (item.subCategory ?? '').trim().toLowerCase();
  const hasNewSub = sub.length > 0 && !selectedSubs.has(sub);
  return hasNewColor || hasNewSub;
}

function pickStructuralExtras(
  remaining: ClothingItem[],
  primary: ClothingItem[],
  count: number
): ClothingItem[] {
  const extras: ClothingItem[] = [];
  const taken = new Set<string>();

  for (const item of remaining) {
    if (extras.length >= count) break;
    if (!isStructurallyDifferent(item, primary)) continue;
    extras.push(item);
    taken.add(item.id);
  }

  for (const item of remaining) {
    if (extras.length >= count) break;
    if (taken.has(item.id)) continue;
    extras.push(item);
  }
  return extras;
}

/**
 * Retrieval window only. Preliminary scores bound how many items we compose
 * with; they must not decide which complete outfits are good.
 */
function selectRetrievalWindow(
  categoryItems: ClothingItem[],
  limit: number,
  scores: Map<string, number>,
  anchorIds: Set<string>
): ClothingItem[] {
  if (categoryItems.length === 0) return [];
  if (categoryItems.length <= limit) {
    return ensureAnchors(categoryItems, categoryItems, anchorIds);
  }

  const ranked = sortByPreliminaryScore(categoryItems, scores);
  const reserved = Math.min(2, Math.max(1, Math.floor(limit / 3)));
  const primaryCount = Math.max(1, limit - reserved);
  const primary = ranked.slice(0, primaryCount);
  const extras = pickStructuralExtras(ranked.slice(primaryCount), primary, reserved);
  const combined = [...primary, ...extras];
  const withAnchors = ensureAnchors(combined, categoryItems, anchorIds);
  const categoryAnchorCount = categoryItems.filter((item) => anchorIds.has(item.id)).length;
  return withAnchors.slice(0, Math.max(limit, categoryAnchorCount));
}

export function getCandidateItemsByCategory(
  pool: ClothingItem[],
  request: RecommendationRequest,
  limits: CandidateLimits = DEFAULT_CANDIDATE_LIMITS
): CandidatePool {
  const grouped = groupByCategory(pool);
  const scoreCtx = buildScoreContext(request);
  const anchorIds = new Set(request.mustIncludeItemIds ?? []);
  const preliminaryScores = new Map<string, number>();

  for (const item of pool) {
    preliminaryScores.set(item.id, scoreItemForSlot(item, scoreCtx, []));
  }

  const byCategory: Record<string, ClothingItem[]> = {};
  for (const slot of CANONICAL_SLOTS) {
    const items = grouped[slot] ?? [];
    byCategory[slot] = selectRetrievalWindow(items, limits[slot], preliminaryScores, anchorIds);
  }

  for (const [category, items] of Object.entries(grouped)) {
    if (byCategory[category]) continue;
    byCategory[category] = items;
  }

  const totalCandidates = Object.values(byCategory).reduce((sum, list) => sum + list.length, 0);
  return { byCategory, preliminaryScores, totalCandidates };
}

export function mergeCandidateLimits(overrides?: Partial<CandidateLimits>): CandidateLimits {
  if (!overrides) return DEFAULT_CANDIDATE_LIMITS;
  return { ...DEFAULT_CANDIDATE_LIMITS, ...overrides };
}
