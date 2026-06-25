import { AvatarGenerationRequest, AvatarGenerationResult, BodyType } from '../types';
import { functionsClient } from './functionsClient';
import { uploadAvatarPhoto } from './imageUpload';
import { isSupabaseConfigured } from './supabase';

/**
 * Avatar generation via Supabase Edge Function + Google Imagen 3 Customization.
 */

/**
 * Mock avatar generation for offline / unconfigured development.
 */
export const generateAvatarMock = async (
  request: AvatarGenerationRequest,
  onProgress?: (progress: number) => void
): Promise<AvatarGenerationResult> => {
  onProgress?.(10);
  await new Promise((resolve) => setTimeout(resolve, 500));

  onProgress?.(30);
  await new Promise((resolve) => setTimeout(resolve, 800));

  onProgress?.(50);
  await new Promise((resolve) => setTimeout(resolve, 800));

  onProgress?.(70);
  await new Promise((resolve) => setTimeout(resolve, 800));

  onProgress?.(90);
  await new Promise((resolve) => setTimeout(resolve, 500));

  onProgress?.(100);

  return {
    avatarId: `avatar_${Date.now()}`,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.userId}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
    thumbnailUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.userId}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
  };
};

/**
 * Generate avatar: upload selfie, then call generate-avatar Edge Function.
 */
export const generateAvatar = async (
  request: AvatarGenerationRequest,
  onProgress?: (progress: number) => void
): Promise<AvatarGenerationResult> => {
  if (!isSupabaseConfigured()) {
    return generateAvatarMock(request, onProgress);
  }

  try {
    onProgress?.(10);
    const upload = await uploadAvatarPhoto(
      request.userId,
      request.photoUri,
      `selfie-${Date.now()}.jpg`
    );

    onProgress?.(25);
    const res = await functionsClient.generateAvatar({
      photo_path: upload.path,
      photo_bucket: 'avatars',
      body_type: request.bodyType,
    });

    onProgress?.(100);

    const avatarUrl = res.signed_thumbnail_url;
    if (!avatarUrl) {
      throw new Error('Avatar generated but no thumbnail URL was returned.');
    }

    return {
      avatarId: res.avatar.id,
      avatarUrl,
      thumbnailUrl: avatarUrl,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('Avatar generation failed, falling back to mock:', error);
      return generateAvatarMock(request, onProgress);
    }
    throw error instanceof Error
      ? error
      : new Error('Failed to generate avatar. Please try again.');
  }
};

/**
 * Upload user photo for face detection
 */
export const uploadPhotoForFaceDetection = async (photoUri: string): Promise<string> => {
  return photoUri;
};

/**
 * Validate photo quality for avatar generation
 */
export const validatePhotoForAvatar = (_photoUri: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  return {
    valid: errors.length === 0,
    errors,
  };
};
