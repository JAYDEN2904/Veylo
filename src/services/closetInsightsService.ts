/**
 * Closet utilization + insight card builders for the Insights feed.
 *
 * CUR (Closet Utilization Rate) — thesis metric:
 *   active items worn ≥1× in the rolling 30-day window ÷ active wardrobe × 100%
 * Membership uses `lastWorn` (client-available). Prefer `outfit_events` when
 * a remote aggregation is wired later.
 */
import type { ClothingItem } from '../types';

export const CUR_WINDOW_DAYS = 30;

export type InsightCardKind = 'challenge' | 'hidden_gem' | 'neglected' | 'rotation' | 'milestone';

export interface InsightCard {
  id: string;
  kind: InsightCardKind;
  title: string;
  body: string;
  /** Item to force into generation when user taps Style this */
  anchorItemId: string | null;
  imageUrl?: string;
  showStyleCta: boolean;
}

export interface ClosetUtilization {
  /** null when wardrobe is empty — do not show 0% or 100% */
  ratePercent: number | null;
  usedCount: number;
  activeCount: number;
  windowDays: typeof CUR_WINDOW_DAYS;
  /** Unused item that would raise CUR if worn once */
  challengeItem: ClothingItem | null;
  nextTargetPercent: number | null;
}

export interface ClosetInsightsModel {
  utilization: ClosetUtilization;
  cards: InsightCard[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NEGLECTED_DAYS = 45;
const MAX_FEED_CARDS = 10;

/** Human-readable label for feed copy (no dedicated name field on items). */
export function itemDisplayName(item: ClothingItem): string {
  const color = item.colors?.[0];
  const kind = item.subCategory || item.category;
  if (color && kind) return `${color} ${kind}`;
  if (item.brand && kind) return `${item.brand} ${kind}`;
  return kind || item.brand || 'Item';
}

export function daysSinceWorn(item: ClothingItem, nowMs: number = Date.now()): number | null {
  if (!item.lastWorn) return null;
  const wornAt = Date.parse(item.lastWorn);
  if (Number.isNaN(wornAt)) return null;
  return Math.max(0, Math.floor((nowMs - wornAt) / MS_PER_DAY));
}

function windowStartMs(nowMs: number): number {
  return nowMs - CUR_WINDOW_DAYS * MS_PER_DAY;
}

/** True if the item was worn at least once inside the rolling window. */
export function wasWornInWindow(item: ClothingItem, nowMs: number = Date.now()): boolean {
  if (!item.lastWorn) return false;
  const wornAt = Date.parse(item.lastWorn);
  if (Number.isNaN(wornAt)) return false;
  return wornAt >= windowStartMs(nowMs);
}

export function computeClosetUtilization(
  items: ClothingItem[],
  nowMs: number = Date.now()
): ClosetUtilization {
  const active = items.filter((item) => item.status === 'active');
  if (active.length === 0) {
    return {
      ratePercent: null,
      usedCount: 0,
      activeCount: 0,
      windowDays: CUR_WINDOW_DAYS,
      challengeItem: null,
      nextTargetPercent: null,
    };
  }

  const used = active.filter((item) => wasWornInWindow(item, nowMs));
  const unused = active.filter((item) => !wasWornInWindow(item, nowMs));
  const ratePercent = Math.round((used.length / active.length) * 100);

  const challengeItem =
    unused.sort((a, b) => {
      const aNever = a.wornCount == null || a.wornCount === 0 ? 0 : 1;
      const bNever = b.wornCount == null || b.wornCount === 0 ? 0 : 1;
      if (aNever !== bNever) return aNever - bNever;
      const aDays = daysSinceWorn(a, nowMs) ?? 9999;
      const bDays = daysSinceWorn(b, nowMs) ?? 9999;
      return bDays - aDays;
    })[0] ?? null;

  const nextUsed = used.length + (challengeItem ? 1 : 0);
  const nextTargetPercent =
    challengeItem && nextUsed <= active.length
      ? Math.round((nextUsed / active.length) * 100)
      : null;

  return {
    ratePercent,
    usedCount: used.length,
    activeCount: active.length,
    windowDays: CUR_WINDOW_DAYS,
    challengeItem,
    nextTargetPercent,
  };
}

function buildChallengeCard(utilization: ClosetUtilization): InsightCard | null {
  const item = utilization.challengeItem;
  if (!item || utilization.ratePercent == null || utilization.nextTargetPercent == null) {
    return null;
  }
  if (utilization.nextTargetPercent <= utilization.ratePercent) return null;

  const name = itemDisplayName(item);
  return {
    id: `challenge-${item.id}`,
    kind: 'challenge',
    title: 'Utilization challenge',
    body: `You've used ${utilization.ratePercent}% of your closet in the last ${CUR_WINDOW_DAYS} days — style your ${name} to reach ${utilization.nextTargetPercent}%.`,
    anchorItemId: item.id,
    imageUrl: item.imageUrl,
    showStyleCta: true,
  };
}

function buildHiddenGemCards(active: ClothingItem[], limit: number): InsightCard[] {
  const gems = active.filter((item) => (item.wornCount ?? 0) === 0).slice(0, limit);

  return gems.map((item) => ({
    id: `gem-${item.id}`,
    kind: 'hidden_gem' as const,
    title: 'Hidden gem',
    body: `${itemDisplayName(item)} · 0 wears — still waiting for a first outing.`,
    anchorItemId: item.id,
    imageUrl: item.imageUrl,
    showStyleCta: true,
  }));
}

function buildNeglectedCards(active: ClothingItem[], nowMs: number, limit: number): InsightCard[] {
  const neglected = active
    .map((item) => ({ item, days: daysSinceWorn(item, nowMs) }))
    .filter(({ item, days }) => {
      if ((item.wornCount ?? 0) === 0) return false;
      return days == null || days >= NEGLECTED_DAYS;
    })
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))
    .slice(0, limit);

  return neglected.map(({ item, days }) => ({
    id: `neglected-${item.id}`,
    kind: 'neglected' as const,
    title: 'Neglected piece',
    body:
      days == null
        ? `${itemDisplayName(item)} hasn't been logged as worn recently.`
        : `${itemDisplayName(item)} · last worn ${days} days ago.`,
    anchorItemId: item.id,
    imageUrl: item.imageUrl,
    showStyleCta: true,
  }));
}

function buildRotationCard(active: ClothingItem[], nowMs: number): InsightCard | null {
  const inWindow = active.filter((item) => wasWornInWindow(item, nowMs));
  if (inWindow.length === 0) return null;

  const mostWorn = [...inWindow].sort((a, b) => (b.wornCount ?? 0) - (a.wornCount ?? 0))[0];
  if (!mostWorn || (mostWorn.wornCount ?? 0) < 2) return null;

  const peer = active
    .filter(
      (item) =>
        item.id !== mostWorn.id &&
        normalizeLooseCategory(item.category) === normalizeLooseCategory(mostWorn.category) &&
        (item.wornCount ?? 0) < (mostWorn.wornCount ?? 0)
    )
    .sort((a, b) => (a.wornCount ?? 0) - (b.wornCount ?? 0))[0];

  if (!peer) return null;

  return {
    id: `rotation-${mostWorn.id}-${peer.id}`,
    kind: 'rotation',
    title: 'Rotate your wardrobe',
    body: `${itemDisplayName(mostWorn)} · ${mostWorn.wornCount ?? 0}× worn — give your ${itemDisplayName(peer)} a turn?`,
    anchorItemId: peer.id,
    imageUrl: peer.imageUrl,
    showStyleCta: true,
  };
}

function buildMilestoneCard(
  active: ClothingItem[],
  utilization: ClosetUtilization,
  nowMs: number
): InsightCard | null {
  const distinctThisWeek = active.filter((item) => {
    const days = daysSinceWorn(item, nowMs);
    return days != null && days <= 7;
  }).length;

  if (distinctThisWeek >= 5) {
    return {
      id: `milestone-week-${distinctThisWeek}`,
      kind: 'milestone',
      title: 'Week in rotation',
      body: `You've worn ${distinctThisWeek} distinct pieces in the last 7 days. Keep logging wears to sharpen insights.`,
      anchorItemId: null,
      showStyleCta: false,
    };
  }

  if (utilization.ratePercent != null && utilization.ratePercent >= 80) {
    return {
      id: 'milestone-high-cur',
      kind: 'milestone',
      title: 'Strong utilization',
      body: `You're using ${utilization.ratePercent}% of your closet — focus on rotating favourites next.`,
      anchorItemId: null,
      showStyleCta: false,
    };
  }

  return null;
}

function normalizeLooseCategory(category: string): string {
  return category.trim().toLowerCase();
}

/**
 * Build the interleaved Insights feed model from the local wardrobe.
 */
export function buildClosetInsights(
  items: ClothingItem[],
  nowMs: number = Date.now()
): ClosetInsightsModel {
  const active = items.filter((item) => item.status === 'active');
  const utilization = computeClosetUtilization(items, nowMs);
  const cards: InsightCard[] = [];
  const seenAnchors = new Set<string>();

  const pushCard = (card: InsightCard | null) => {
    if (!card) return;
    if (cards.length >= MAX_FEED_CARDS) return;
    if (card.anchorItemId) {
      if (seenAnchors.has(card.anchorItemId)) return;
      seenAnchors.add(card.anchorItemId);
    }
    cards.push(card);
  };

  pushCard(buildChallengeCard(utilization));

  for (const card of buildHiddenGemCards(active, 3)) {
    pushCard(card);
  }

  for (const card of buildNeglectedCards(active, nowMs, 3)) {
    pushCard(card);
  }

  pushCard(buildRotationCard(active, nowMs));
  pushCard(buildMilestoneCard(active, utilization, nowMs));

  return { utilization, cards };
}
