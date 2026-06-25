import { calculateContrastRatio, isAccessible } from './accessibility';

describe('calculateContrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(calculateContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('returns 1 for identical colors', () => {
    expect(calculateContrastRatio('#777777', '#777777')).toBeCloseTo(1, 2);
  });
});

describe('isAccessible', () => {
  it('accepts high-contrast pair for body text', () => {
    expect(isAccessible('#000000', '#FFFFFF', false)).toBe(true);
  });
});
