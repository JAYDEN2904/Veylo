import { clothingImageUri, thumbnailStoragePath } from './wardrobeImagePaths';

describe('wardrobeImagePaths', () => {
  it('derives a sibling thumb object path', () => {
    expect(thumbnailStoragePath('user-1/shirt.jpg')).toBe('user-1/shirt_thumb.jpg');
    expect(thumbnailStoragePath('user-1/coat')).toBe('user-1/coat_thumb.jpg');
  });

  it('prefers the thumbnail for grid tiles', () => {
    expect(
      clothingImageUri({ imageUrl: 'https://full.jpg', thumbnailUrl: 'https://thumb.jpg' }, 'thumb')
    ).toBe('https://thumb.jpg');
    expect(
      clothingImageUri({ imageUrl: 'https://full.jpg', thumbnailUrl: 'https://thumb.jpg' }, 'full')
    ).toBe('https://full.jpg');
    expect(clothingImageUri({ imageUrl: 'https://full.jpg' }, 'thumb')).toBe('https://full.jpg');
  });
});
