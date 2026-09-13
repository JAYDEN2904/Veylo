import { getSafeAsyncStorage } from '../lib/safeAsyncStorage';
import { getSupabase } from './supabase';

export const SIGNED_URL_TTL_SEC = 3600;
const REUSE_IF_REMAINING_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'veylo-signed-url-cache-v1';
const SIGN_CHUNK_SIZE = 50;

type CacheEntry = {
  url: string;
  expiresAt: number;
};

type StorageBucket = 'item-photos' | 'avatars' | 'tryon-results';

const memory = new Map<string, CacheEntry>();
let hydratePromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function cacheKey(bucket: string, path: string): string {
  return `${bucket}:${path}`;
}

function isReusable(entry: CacheEntry | undefined): entry is CacheEntry {
  return !!entry && entry.expiresAt - Date.now() >= REUSE_IF_REMAINING_MS;
}

async function hydrateFromStorage(): Promise<void> {
  try {
    const raw = await getSafeAsyncStorage().getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<[string, CacheEntry]>;
    if (!Array.isArray(parsed)) return;
    const now = Date.now();
    for (const [key, entry] of parsed) {
      if (typeof key !== 'string' || !entry?.url || typeof entry.expiresAt !== 'number') continue;
      if (entry.expiresAt - now < REUSE_IF_REMAINING_MS) continue;
      memory.set(key, entry);
    }
  } catch (error) {
    if (__DEV__) console.warn('[signedUrlCache] hydrate failed', error);
  }
}

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void getSafeAsyncStorage()
      .setItem(STORAGE_KEY, JSON.stringify([...memory.entries()]))
      .catch((error) => {
        if (__DEV__) console.warn('[signedUrlCache] persist failed', error);
      });
  }, 250);
}

export async function initSignedUrlCache(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = hydrateFromStorage();
  }
  await hydratePromise;
}

export function peekSignedUrl(bucket: string, path: string): string | null {
  const entry = memory.get(cacheKey(bucket, path));
  return isReusable(entry) ? entry.url : null;
}

export function rememberSignedUrl(
  bucket: string,
  path: string,
  url: string,
  ttlSec = SIGNED_URL_TTL_SEC
): void {
  if (!path || !url) return;
  memory.set(cacheKey(bucket, path), {
    url,
    expiresAt: Date.now() + ttlSec * 1000,
  });
  schedulePersist();
}

export function forgetSignedUrl(bucket: string, path: string): void {
  memory.delete(cacheKey(bucket, path));
  schedulePersist();
}

export async function clearSignedUrlCache(): Promise<void> {
  memory.clear();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    await getSafeAsyncStorage().removeItem(STORAGE_KEY);
  } catch (error) {
    if (__DEV__) console.warn('[signedUrlCache] clear failed', error);
  }
}

function readSignedUrl(row: {
  path?: string | null;
  signedUrl?: string | null;
  signedURL?: string | null;
  error?: string | null;
}): { path: string | null; url: string | null } {
  if (row.error) return { path: row.path ?? null, url: null };
  return {
    path: row.path ?? null,
    url: row.signedUrl ?? row.signedURL ?? null,
  };
}

async function signPaths(
  bucket: StorageBucket,
  paths: string[],
  expiresIn: number
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || paths.length === 0) return;

  for (let index = 0; index < paths.length; index += SIGN_CHUNK_SIZE) {
    const chunk = paths.slice(index, index + SIGN_CHUNK_SIZE);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(chunk, expiresIn);

    if (!error && data) {
      data.forEach((row, rowIndex) => {
        const parsed = readSignedUrl(row);
        const path = parsed.path ?? chunk[rowIndex];
        if (path && parsed.url) {
          rememberSignedUrl(bucket, path, parsed.url, expiresIn);
        }
      });
      continue;
    }

    const singles = await Promise.all(
      chunk.map(async (path) => {
        const { data: signed, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);
        if (signError || !signed?.signedUrl) return null;
        return { path, url: signed.signedUrl };
      })
    );
    for (const signed of singles) {
      if (signed) rememberSignedUrl(bucket, signed.path, signed.url, expiresIn);
    }
  }
}

export async function resolveSignedUrls(
  bucket: StorageBucket,
  paths: string[],
  expiresIn = SIGNED_URL_TTL_SEC
): Promise<Map<string, string>> {
  await initSignedUrlCache();
  const unique = [...new Set(paths.filter((path) => path.length > 0))];
  const resolved = new Map<string, string>();
  const missing: string[] = [];

  for (const path of unique) {
    const cached = peekSignedUrl(bucket, path);
    if (cached) {
      resolved.set(path, cached);
    } else {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    await signPaths(bucket, missing, expiresIn);
    for (const path of missing) {
      const url = peekSignedUrl(bucket, path);
      if (url) resolved.set(path, url);
    }
  }

  return resolved;
}

/** Test-only: wipe in-memory state without touching storage side effects. */
export function resetSignedUrlCacheForTests(): void {
  memory.clear();
  hydratePromise = Promise.resolve();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}
