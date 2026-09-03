import { ClothingItem } from '../../types';
import { namedColorsToHsl } from '../../utils/hslColor';
import {
  applyHardConstraints,
  applySoftConstraints,
  canFormOutfit,
  reinjectAnchors,
  relaxationOptions,
} from './constraintEngine';

const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: Math.random().toString(36).slice(2),
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: overrides.colorsHsl ?? namedColorsToHsl(colors),
    tags: ['casual'],
    createdAt: new Date().toISOString(),
    status: 'active',
    ...overrides,
  };
};

describe('constraintEngine', () => {
  it('excludes archived and donated items', () => {
    const pool = applyHardConstraints(
      [
        item({ id: 'a', status: 'active' }),
        item({ id: 'b', status: 'archived' }),
        item({ id: 'c', status: 'donated' }),
      ],
      {}
    );
    expect(pool.map((entry) => entry.id)).toEqual(['a']);
  });

  it('excludes explicit excludeItemIds', () => {
    const pool = applyHardConstraints([item({ id: 'keep' }), item({ id: 'drop' })], {
      excludeItemIds: ['drop'],
    });
    expect(pool.map((entry) => entry.id)).toEqual(['keep']);
  });

  it('does not apply season as a hard constraint', () => {
    const summer = item({
      id: 'shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      season: ['summer'],
    });
    const hard = applyHardConstraints([summer], {});
    expect(hard).toHaveLength(1);
  });

  it('level 0 season filter drops summer-only items in Fall', () => {
    const shorts = item({
      id: 'shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      season: ['summer'],
    });
    const filtered = applySoftConstraints([shorts], { season: 'Fall' }, relaxationOptions(0));
    expect(filtered).toHaveLength(0);
  });

  it('level 1 removes the season restriction', () => {
    const shorts = item({
      id: 'shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      season: ['summer'],
    });
    const filtered = applySoftConstraints([shorts], { season: 'Fall' }, relaxationOptions(1));
    expect(filtered).toHaveLength(1);
  });

  it('reinjects must-include anchors dropped by soft filters', () => {
    const shorts = item({
      id: 'shorts',
      category: 'Bottoms',
      subCategory: 'shorts',
      season: ['summer'],
    });
    const top = item({ id: 'top', season: ['fall'] });
    const soft = applySoftConstraints([top, shorts], { season: 'Fall' }, relaxationOptions(0));
    const pool = reinjectAnchors(soft, [top, shorts], ['shorts']);
    expect(pool.some((entry) => entry.id === 'shorts')).toBe(true);
  });

  it('canFormOutfit requires a dress or top+bottom', () => {
    expect(canFormOutfit([item({ category: 'Accessories' })])).toBe(false);
    expect(
      canFormOutfit([item({ category: 'Tops' }), item({ id: 'b', category: 'Bottoms' })])
    ).toBe(true);
    expect(canFormOutfit([item({ category: 'Dresses' })])).toBe(true);
  });
});
