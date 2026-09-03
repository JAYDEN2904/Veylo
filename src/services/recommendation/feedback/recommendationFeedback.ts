import type { ClothingItem } from '../../../types';
import { normalizeCategory } from '../../outfitCategoryNormalize';
import { styleFamiliesForItem } from '../compatibility/styleCompatibility';
import type { RecommendationEventType, UserPreferenceVector } from '../types';

export const FEEDBACK_STRENGTHS: Record<RecommendationEventType, number> = {
  wear: 1,
  save: 0.8,
  like: 0.6,
  try_on: 0.45,
  view: 0.1,
  impression: 0,
  share: 0.15,
  dismiss: -0.2,
  dislike: -0.6,
  swap: -0.5,
  remove: -0.7,
};

export interface FeedbackSignal {
  eventType: RecommendationEventType;
  items: ClothingItem[];
  occasion?: string;
  /** When set, only this garment is updated (swap / remove). */
  itemId?: string;
}

export function emptyPreferenceVector(now: string = new Date().toISOString()): UserPreferenceVector {
  return {
    colors: {},
    categories: {},
    styles: {},
    occasions: {},
    brands: {},
    updatedAt: now,
  };
}

export function normalizePreferenceKey(value: string): string {
  return value.trim().toLowerCase();
}

export function hasBehavioralSignal(vector?: UserPreferenceVector | null): boolean {
  if (!vector) return false;
  return (
    hasNonZero(vector.colors) ||
    hasNonZero(vector.categories) ||
    hasNonZero(vector.styles) ||
    hasNonZero(vector.occasions) ||
    hasNonZero(vector.brands)
  );
}

function hasNonZero(bucket: Record<string, number>): boolean {
  return Object.values(bucket).some((value) => Math.abs(value) > 0.0001);
}

function addToBucket(bucket: Record<string, number>, key: string, delta: number): void {
  if (!key || delta === 0) return;
  const next = (bucket[key] ?? 0) + delta;
  if (Math.abs(next) < 0.0001) {
    delete bucket[key];
    return;
  }
  bucket[key] = next;
}

function applyItemSignals(
  vector: UserPreferenceVector,
  item: ClothingItem,
  strength: number,
  occasion?: string
): void {
  for (const color of item.colors) {
    addToBucket(vector.colors, normalizePreferenceKey(color), strength);
  }
  addToBucket(vector.categories, normalizePreferenceKey(normalizeCategory(item.category)), strength);
  if (item.brand) {
    addToBucket(vector.brands, normalizePreferenceKey(item.brand), strength);
  }
  for (const family of styleFamiliesForItem(item)) {
    addToBucket(vector.styles, family, strength);
  }
  if (occasion) {
    addToBucket(vector.occasions, normalizePreferenceKey(occasion), strength);
  }
}

/**
 * Apply one feedback event to a preference vector. Impression is recorded for
 * sessions only and does not change affinities.
 */
export function applyFeedbackToVector(
  vector: UserPreferenceVector,
  signal: FeedbackSignal
): UserPreferenceVector {
  const strength = FEEDBACK_STRENGTHS[signal.eventType];
  if (strength === 0) {
    return { ...vector, updatedAt: new Date().toISOString() };
  }

  const next: UserPreferenceVector = {
    colors: { ...vector.colors },
    categories: { ...vector.categories },
    styles: { ...vector.styles },
    occasions: { ...vector.occasions },
    brands: { ...vector.brands },
    updatedAt: new Date().toISOString(),
  };

  const targets = signal.itemId
    ? signal.items.filter((item) => item.id === signal.itemId)
    : signal.items;

  for (const item of targets) {
    applyItemSignals(next, item, strength, signal.occasion);
  }
  return next;
}

export function rebuildPreferenceVector(signals: FeedbackSignal[]): UserPreferenceVector {
  return signals.reduce(applyFeedbackToVector, emptyPreferenceVector());
}
