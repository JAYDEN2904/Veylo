import type { ClothingItem } from '../types';
import { namedColorsToHsl } from '../utils/hslColor';
import {
  buildClosetInsights,
  computeClosetUtilization,
  CUR_WINDOW_DAYS,
  itemDisplayName,
  wasWornInWindow,
} from './closetInsightsService';

const dayMs = 24 * 60 * 60 * 1000;

const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['Navy'];
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: overrides.colorsHsl ?? namedColorsToHsl(colors),
    tags: ['casual'],
    createdAt: new Date().toISOString(),
    status: 'active',
    wornCount: 0,
    ...overrides,
  };
};

describe('closetInsightsService', () => {
  const now = Date.parse('2026-07-20T12:00:00.000Z');

  it('itemDisplayName prefers color + subCategory', () => {
    expect(
      itemDisplayName(item({ colors: ['Blue'], subCategory: 'Blazer', category: 'Outerwear' }))
    ).toBe('Blue Blazer');
  });

  it('returns null CUR for empty wardrobe', () => {
    const cur = computeClosetUtilization([], now);
    expect(cur.ratePercent).toBeNull();
    expect(cur.activeCount).toBe(0);
  });

  it('computes CUR over rolling 30 days via lastWorn', () => {
    const items = [
      item({ id: 'a', lastWorn: new Date(now - 5 * dayMs).toISOString(), wornCount: 2 }),
      item({ id: 'b', lastWorn: new Date(now - 40 * dayMs).toISOString(), wornCount: 5 }),
      item({ id: 'c', wornCount: 0 }),
      item({ id: 'd', status: 'archived', lastWorn: new Date(now - 1 * dayMs).toISOString() }),
    ];
    const cur = computeClosetUtilization(items, now);
    expect(cur.windowDays).toBe(CUR_WINDOW_DAYS);
    expect(cur.activeCount).toBe(3);
    expect(cur.usedCount).toBe(1);
    expect(cur.ratePercent).toBe(33);
    expect(wasWornInWindow(items[0], now)).toBe(true);
    expect(wasWornInWindow(items[1], now)).toBe(false);
  });

  it('builds challenge card for unused piece that raises CUR', () => {
    const items = [
      item({ id: 'worn', lastWorn: new Date(now - 2 * dayMs).toISOString(), wornCount: 3 }),
      item({
        id: 'gem',
        colors: ['Grey'],
        subCategory: 'Trousers',
        category: 'Bottoms',
        wornCount: 0,
      }),
    ];
    const model = buildClosetInsights(items, now);
    expect(model.utilization.ratePercent).toBe(50);
    const challenge = model.cards.find((c) => c.kind === 'challenge');
    expect(challenge?.anchorItemId).toBe('gem');
    // Same anchor is not duplicated as a separate hidden_gem card
    expect(model.cards.some((c) => c.kind === 'hidden_gem' && c.anchorItemId === 'gem')).toBe(
      false
    );
  });

  it('surfaces hidden gems when CUR is already complete', () => {
    const items = [
      item({
        id: 'a',
        lastWorn: new Date(now - 1 * dayMs).toISOString(),
        wornCount: 1,
      }),
      item({
        id: 'gem',
        lastWorn: new Date(now - 2 * dayMs).toISOString(),
        wornCount: 0,
        colors: ['Denim'],
        subCategory: 'Jacket',
        category: 'Outerwear',
      }),
    ];
    // Both worn in window → no challenge; gem still 0 lifetime wears
    const model = buildClosetInsights(items, now);
    expect(model.utilization.ratePercent).toBe(100);
    expect(model.cards.some((c) => c.kind === 'hidden_gem' && c.anchorItemId === 'gem')).toBe(true);
  });
});
