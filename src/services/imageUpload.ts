import * as ImageManipulator from 'expo-image-manipulator';
import { getSupabase, isSupabaseConfigured } from './supabase';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export interface UploadItemPhotoResult {
  path: string;
  publicUrl?: string;
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

  const { data: signed } = await supabase.storage
    .from('item-photos')
    .createSignedUrl(storagePath, 3600);
  return { path: storagePath, publicUrl: signed?.signedUrl };
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

  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
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
  expiresIn = 3600
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
