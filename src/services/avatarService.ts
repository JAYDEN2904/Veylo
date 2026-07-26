import { Image } from 'react-native';
import { AvatarGenerationRequest, AvatarGenerationResult } from '../types';
import { functionsClient } from './functionsClient';
import { uploadAvatarPhoto } from './imageUpload';
import { isSupabaseConfigured } from './supabase';

/**
 * Avatar generation via Supabase Edge Function + Google Imagen 3 Customization.
 * Best results come from a head-to-toe standing photo (not a face-only selfie).
 */

/** Minimum short/long edge hints for a usable full-body reference. */
const MIN_WIDTH = 480;
const MIN_HEIGHT = 720;
/** Portrait aspect below this usually means a close-up / cropped torso or face. */
const MIN_FULL_BODY_ASPECT = 1.2;

export interface AvatarPhotoValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

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
 * Generate avatar: upload full-body photo, then call generate-avatar Edge Function.
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
      `fullbody-${Date.now()}.jpg`
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
 * Heuristic checks for a full-body reference photo.
 * Soft warnings for close-ups; hard errors only when the image is unusable.
 */
export const validatePhotoForAvatar = (photoUri: string): Promise<AvatarPhotoValidation> => {
  return new Promise((resolve) => {
    if (!photoUri?.trim()) {
      resolve({
        valid: false,
        errors: ['Please select or take a full-body photo first.'],
        warnings: [],
      });
      return;
    }

    Image.getSize(
      photoUri,
      (width, height) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (width < 1 || height < 1) {
          errors.push('Could not read this photo. Please choose another image.');
          resolve({ valid: false, errors, warnings });
          return;
        }

        if (width < MIN_WIDTH || height < MIN_HEIGHT) {
          warnings.push(
            'This photo is quite small. A clearer head-to-toe shot will produce a better avatar.'
          );
        }

        const portraitAspect = height / width;
        if (portraitAspect < MIN_FULL_BODY_ASPECT) {
          warnings.push(
            'This looks like a close-up or cropped shot. Stand back so your head, torso, and legs are all in frame.'
          );
        }

        resolve({
          valid: errors.length === 0,
          errors,
          warnings,
        });
      },
      () => {
        resolve({
          valid: false,
          errors: ['Could not read this photo. Please choose another image.'],
          warnings: [],
        });
      }
    );
  });
};
