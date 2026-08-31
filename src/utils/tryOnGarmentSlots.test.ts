import {
  classifyTryOnSlot,
  isAccessoryCategory,
  isFootwearCategory,
  tryOnSlotPriority,
} from './tryOnGarmentSlots';

describe('tryOnGarmentSlots', () => {
  it('recognizes sneakers, boots, and footwear as shoes', () => {
    expect(isFootwearCategory('Sneakers')).toBe(true);
    expect(isFootwearCategory('Boots')).toBe(true);
    expect(isFootwearCategory('Footwear')).toBe(true);
    expect(isFootwearCategory('Loafers')).toBe(true);
    expect(tryOnSlotPriority('Sneakers')).toBe(4);
    expect(classifyTryOnSlot('Sneakers')).toBe('clothing');
  });

  it('keeps accessories for the Gemini pass', () => {
    expect(isAccessoryCategory('Accessories')).toBe(true);
    expect(isAccessoryCategory('handbag')).toBe(true);
    expect(tryOnSlotPriority('bag')).toBe(50);
    expect(classifyTryOnSlot('bag')).toBe('accessory');
  });

  it('orders clothing before accessories', () => {
    expect(tryOnSlotPriority('Tops')).toBeLessThan(tryOnSlotPriority('Shoes'));
    expect(tryOnSlotPriority('Shoes')).toBeLessThan(tryOnSlotPriority('Accessories'));
  });

  it('marks unknown categories unsupported', () => {
    expect(classifyTryOnSlot('other')).toBe('unsupported');
    expect(tryOnSlotPriority('other')).toBe(99);
  });
});
