/**
 * Resolve an avatars-bucket storage path from a local path, relative path,
 * or Supabase signed/public URL. Returns null when the input is a device file URI.
 */
export function resolveAvatarsStoragePath(uriOrPath: string): string | null {
  const value = uriOrPath.trim();
  if (!value) return null;

  if (value.startsWith('file:') || value.startsWith('content:') || value.startsWith('ph:')) {
    return null;
  }

  const signedMatch = value.match(/\/storage\/v1\/object\/sign\/avatars\/([^?]+)/i);
  if (signedMatch?.[1]) {
    return decodeURIComponent(signedMatch[1]);
  }

  const publicMatch = value.match(/\/storage\/v1\/object\/public\/avatars\/([^?]+)/i);
  if (publicMatch?.[1]) {
    return decodeURIComponent(publicMatch[1]);
  }

  // Already a storage object path (optionally prefixed with bucket name).
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value.replace(/^avatars\//, '');
  }

  return null;
}
