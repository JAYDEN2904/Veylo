import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { resolveAvatarsStoragePath } from '../utils/avatarStoragePath';
import { rememberSignedUrl, resolveSignedUrls, SIGNED_URL_TTL_SEC } from './signedUrlCache';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { thumbnailStoragePath } from './wardrobeImagePaths';

export { resolveAvatarsStoragePath } from '../utils/avatarStoragePath';

const MAX_EDGE = 1600;
const THUMB_EDGE = 480;
const JPEG_QUALITY = 0.82;
const THUMB_QUALITY = 0.72;

export interface UploadItemPhotoResult {
  path: string;
  publicUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
}

/** ImageManipulator needs a local URI — download remote https images first. */
async function ensureLocalImageUri(uri: string): Promise<string> {
  if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
    return uri;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('No writable directory available to cache the photo.');
  }

  const target = `${baseDir}veylo-upload-${Date.now()}.jpg`;
  const result = await FileSystem.downloadAsync(uri, target);
  if (result.status !== 200) {
    throw new Error('Could not download image for upload.');
  }
  return result.uri;
}

/**
 * Resize/compress a local image, then upload to `item-photos/{userId}/{filename}`.
 */
export async function uploadClothingItemPhoto(
  userId: string,
  localUri: string,
  filename: string
): Promise<UploadItemPhotoResult> {
  if (!isSupabaseConfigured()) {
    return { path: localUri, publicUrl: localUri };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { path: localUri, publicUrl: localUri };
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_EDGE } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  const storagePath = `${userId}/${filename}`;
  const bytes = await fetch(manipulated.uri).then((r) => r.arrayBuffer());

  const { error } = await supabase.storage.from('item-photos').upload(storagePath, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) {
    throw error;
  }

  const thumbPath = thumbnailStoragePath(storagePath);
  try {
    const thumb = await ImageManipulator.manipulateAsync(
      manipulated.uri,
      [{ resize: { width: THUMB_EDGE } }],
      { compress: THUMB_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    const thumbBytes = await fetch(thumb.uri).then((r) => r.arrayBuffer());
    const { error: thumbError } = await supabase.storage
      .from('item-photos')
      .upload(thumbPath, thumbBytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (thumbError && __DEV__) {
      console.warn('[uploadClothingItemPhoto] thumb upload failed', thumbError.message);
    }
  } catch (thumbError) {
    if (__DEV__) console.warn('[uploadClothingItemPhoto] thumb resize failed', thumbError);
  }

  const signed = await resolveSignedUrls('item-photos', [storagePath, thumbPath]);
  const publicUrl = signed.get(storagePath);
  const thumbnailUrl = signed.get(thumbPath);
  if (publicUrl) rememberSignedUrl('item-photos', storagePath, publicUrl, SIGNED_URL_TTL_SEC);
  if (thumbnailUrl) rememberSignedUrl('item-photos', thumbPath, thumbnailUrl, SIGNED_URL_TTL_SEC);
  return {
    path: storagePath,
    publicUrl,
    thumbnailPath: thumbPath,
    thumbnailUrl: thumbnailUrl ?? publicUrl,
  };
}

/** Resize/compress a full-body reference photo, upload to `avatars/{userId}/{filename}`. */
export async function uploadAvatarPhoto(
  userId: string,
  localUri: string,
  filename: string
): Promise<UploadItemPhotoResult> {
  if (!isSupabaseConfigured()) {
    return { path: localUri, publicUrl: localUri };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { path: localUri, publicUrl: localUri };
  }

  // Prefer reusing an existing avatars object instead of re-encoding a signed URL
  // (Android ImageManipulator throws "Could not get decoded bitmap" on remote URLs).
  const existingPath = resolveAvatarsStoragePath(localUri);
  if (existingPath) {
    const { data: signed } = await supabase.storage
      .from('avatars')
      .createSignedUrl(existingPath, 3600);
    return { path: existingPath, publicUrl: signed?.signedUrl };
  }

  const localImageUri = await ensureLocalImageUri(localUri);
  const manipulated = await ImageManipulator.manipulateAsync(
    localImageUri,
    [{ resize: { width: MAX_EDGE } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  const storagePath = `${userId}/${filename}`;
  const bytes = await fetch(manipulated.uri).then((r) => r.arrayBuffer());

  const { error } = await supabase.storage.from('avatars').upload(storagePath, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) {
    throw error;
  }

  const { data: signed } = await supabase.storage
    .from('avatars')
    .createSignedUrl(storagePath, 3600);
  return { path: storagePath, publicUrl: signed?.signedUrl };
}

/** Create a signed URL for a path in an arbitrary bucket. */
export async function signedUrlForBucketPath(
  bucket: 'item-photos' | 'avatars' | 'tryon-results',
  path: string,
  expiresIn = SIGNED_URL_TTL_SEC
): Promise<string | null> {
  const signed = await resolveSignedUrls(bucket, [path], expiresIn);
  return signed.get(path) ?? null;
}
