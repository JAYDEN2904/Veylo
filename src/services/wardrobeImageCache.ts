import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import type { ClothingItem } from '../types';
import { clothingImageUri } from './wardrobeImagePaths';

export { clothingImageUri, thumbnailStoragePath } from './wardrobeImagePaths';

const PREFETCH_COUNT = 16;

function cacheDirectory(): string | null {
  return FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? null;
}

function localFileForImagePath(imagePath: string): string | null {
  const base = cacheDirectory();
  if (!base || !imagePath) return null;
  const safe = imagePath.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${base}veylo-wardrobe/${safe}`;
}

export async function localUriForImagePath(imagePath: string): Promise<string | null> {
  const target = localFileForImagePath(imagePath);
  if (!target) return null;
  try {
    const info = await FileSystem.getInfoAsync(target);
    return info.exists ? target : null;
  } catch (error) {
    if (__DEV__) console.warn('[wardrobeImageCache] stat failed', error);
    return null;
  }
}

export async function attachLocalThumbnails(items: ClothingItem[]): Promise<ClothingItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.imagePath) return item;
      const local = await localUriForImagePath(item.imagePath);
      if (!local) return item;
      return { ...item, thumbnailUrl: local };
    })
  );
}

export async function cacheRemoteImage(imagePath: string, remoteUrl: string): Promise<string | null> {
  const target = localFileForImagePath(imagePath);
  if (!target || !remoteUrl.startsWith('http')) return null;
  try {
    const existing = await localUriForImagePath(imagePath);
    if (existing) return existing;

    const dir = target.slice(0, target.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const result = await FileSystem.downloadAsync(remoteUrl, target);
    if (result.status !== 200) return null;
    return result.uri;
  } catch (error) {
    if (__DEV__) console.warn('[wardrobeImageCache] download failed', error);
    return null;
  }
}

export async function forgetLocalImage(imagePath: string): Promise<void> {
  const target = localFileForImagePath(imagePath);
  if (!target) return;
  try {
    await FileSystem.deleteAsync(target, { idempotent: true });
  } catch (error) {
    if (__DEV__) console.warn('[wardrobeImageCache] delete failed', error);
  }
}

export async function clearWardrobeImageDiskCache(): Promise<void> {
  const base = cacheDirectory();
  if (!base) return;
  try {
    await FileSystem.deleteAsync(`${base}veylo-wardrobe`, { idempotent: true });
  } catch (error) {
    if (__DEV__) console.warn('[wardrobeImageCache] clear failed', error);
  }
}

/**
 * Prefetch the first screen of tiles and persist those bytes for the next visit.
 * Does not rewrite store URLs mid-render (that would remount tiles).
 */
export async function warmWardrobeImages(items: ClothingItem[]): Promise<void> {
  const visible = items.slice(0, PREFETCH_COUNT);
  const urls = visible
    .map((item) => clothingImageUri(item, 'thumb'))
    .filter((uri) => uri.startsWith('http'));

  if (urls.length > 0) {
    try {
      await Image.prefetch(urls);
    } catch (error) {
      if (__DEV__) console.warn('[wardrobeImageCache] prefetch failed', error);
    }
  }

  for (const item of visible) {
    if (!item.imagePath) continue;
    const remote = item.thumbnailUrl?.startsWith('http')
      ? item.thumbnailUrl
      : item.imageUrl.startsWith('http')
        ? item.imageUrl
        : null;
    if (!remote) continue;
    await cacheRemoteImage(item.imagePath, remote);
  }
}
