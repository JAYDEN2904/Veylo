import type { ClothingItem } from '../types';

/**
 * Companion object for a full-size item photo.
 * `user/abc.jpg` → `user/abc_thumb.jpg`
 */
export function thumbnailStoragePath(imagePath: string): string {
  const lastDot = imagePath.lastIndexOf('.');
  if (lastDot <= 0) return `${imagePath}_thumb.jpg`;
  return `${imagePath.slice(0, lastDot)}_thumb${imagePath.slice(lastDot)}`;
}

export function clothingImageUri(
  item: Pick<ClothingItem, 'imageUrl' | 'thumbnailUrl'>,
  variant: 'thumb' | 'full' = 'thumb'
): string {
  if (variant === 'full') return item.imageUrl;
  return item.thumbnailUrl || item.imageUrl;
}
