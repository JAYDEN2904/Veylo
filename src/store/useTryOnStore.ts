import { create } from 'zustand';
import { ClothingItem, Outfit } from '../types';
import { useAuthStore } from './useAuthStore';
import { functionsClient } from '../services/functionsClient';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { uploadAvatarPhoto, signedUrlForBucketPath } from '../services/imageUpload';
import { resolveAvatarsStoragePath } from '../utils/avatarStoragePath';
import { fetchClothingItemById } from '../services/wardrobeRepository';
import { classifyTryOnSlot, tryOnSlotPriority } from '../utils/tryOnGarmentSlots';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TryOnSession {
  id: string;
  userPhotoUri: string | null;
  avatarUrl: string | null;
  useAvatar: boolean;
  outfit: Outfit | null;
  items: ClothingItem[];
  resultImageUri: string | null;
  /**
   * `pending` covers the period between an async tryon-generate response and
   * tryon-status finalization. Surfaces as the polling state.
   */
  status: 'idle' | 'uploading' | 'processing' | 'pending' | 'complete' | 'error';
  progress: number; // 0-100
  errorMessage?: string;
  /** Replicate prediction id when the backend returned `processing`. */
  pendingPredictionId?: string;
  /** Garment index currently being fitted (0-based). */
  currentGarmentIndex?: number;
  /** Total garments in the outfit (for chained try-on). */
  totalGarments?: number;
  /** Item ids successfully applied to the result image. */
  fittedItemIds?: string[];
  /** Item ids that failed or were skipped after a retry. */
  failedItemIds?: string[];
  /** Item ids never sent (unsupported category). */
  skippedItemIds?: string[];
  createdAt: string;
}

interface TryOnState {
  currentSession: TryOnSession | null;
  isProcessing: boolean;
  /** Internal: when set, indicates polling is in progress and should be cancelled on session change. */
  _pollCancelled: boolean;

  startSession: (
    userPhotoUri: string | null,
    items: ClothingItem[],
    outfit?: Outfit,
    useAvatar?: boolean
  ) => void;
  processVirtualTryOn: () => Promise<void>;
  updateProgress: (progress: number) => void;
  setResult: (resultImageUri: string) => void;
  setError: (message: string) => void;
  clearSession: () => void;
}

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_DURATION_MS = 180_000; // 3 minutes

export const useTryOnStore = create<TryOnState>((set, get) => ({
  currentSession: null,
  isProcessing: false,
  _pollCancelled: false,

  startSession: (userPhotoUri, items, outfit, useAvatar = false) => {
    const { user } = useAuthStore.getState();
    const avatarUrl = useAvatar && user?.avatarUrl ? user.avatarUrl : null;

    const session: TryOnSession = {
      id: `tryon-${Date.now()}`,
      userPhotoUri: useAvatar ? null : userPhotoUri,
      avatarUrl,
      useAvatar,
      outfit: outfit || null,
      items,
      resultImageUri: null,
      status: 'uploading',
      progress: 0,
      currentGarmentIndex: 0,
      totalGarments: items.length,
      fittedItemIds: [],
      failedItemIds: [],
      skippedItemIds: [],
      createdAt: new Date().toISOString(),
    };
    set({ currentSession: session, isProcessing: true, _pollCancelled: false });
  },

  processVirtualTryOn: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: { ...currentSession, status: 'processing', progress: 0 },
    });

    const user = useAuthStore.getState().user;

    if (!isSupabaseConfigured() || !user?.id) {
      const session = get().currentSession;
      if (!session) return;
      set({
        currentSession: {
          ...session,
          status: 'error',
          progress: 0,
          errorMessage:
            'Virtual try-on is coming soon. Sign in with a connected Veylo account to generate real results.',
        },
        isProcessing: false,
      });
      return;
    }

    try {
      const session = get().currentSession;
      if (!session) return;

      const { clothing, accessories, skipped } = partitionTryOnItems(session.items);
      const chain = [...clothing, ...accessories];
      if (chain.length === 0) {
        throw new Error('No wearable garments in the outfit.');
      }

      const sourceUri =
        session.useAvatar && session.avatarUrl ? session.avatarUrl : session.userPhotoUri;
      if (!sourceUri) throw new Error('No photo or avatar available.');

      const nudge = (progress: number, index?: number) => {
        const current = get().currentSession;
        if (!current) return;
        set({
          currentSession: {
            ...current,
            progress,
            ...(index !== undefined ? { currentGarmentIndex: index } : {}),
          },
        });
      };

      nudge(5, 0);

      let userBucket: 'item-photos' | 'avatars' | 'tryon-results' = 'avatars';
      let currentUserPath: string;
      const existingAvatarPath =
        session.useAvatar && session.avatarUrl
          ? resolveAvatarsStoragePath(session.avatarUrl)
          : null;

      if (existingAvatarPath) {
        currentUserPath = existingAvatarPath;
      } else {
        const avatarUpload = await uploadAvatarPhoto(
          user.id,
          sourceUri,
          `selfie-${Date.now()}.jpg`
        );
        currentUserPath = avatarUpload.path;
      }

      let finalResultPath: string | null = null;
      const fittedItemIds: string[] = [];
      const failedItemIds: string[] = [];
      const skippedItemIds = skipped.map((item) => item.id);

      for (let i = 0; i < chain.length; i++) {
        const garment = chain[i];
        const mode = classifyTryOnSlot(garment.category) === 'accessory' ? 'accessory' : 'clothing';
        const startProgress = 10 + Math.round((i / chain.length) * 80);
        const endProgress = 10 + Math.round(((i + 1) / chain.length) * 80);

        nudge(startProgress, i);

        const row = await fetchClothingItemById(garment.id);
        if (!row) {
          failedItemIds.push(garment.id);
          if (i === 0 && !finalResultPath) {
            throw new Error(`Garment "${garment.category}" not found in your wardrobe.`);
          }
          continue;
        }

        const garmentPath = (row.image_path as string | undefined) ?? null;
        if (!garmentPath) {
          failedItemIds.push(garment.id);
          if (i === 0 && !finalResultPath) {
            throw new Error(`Garment "${garment.category}" is missing an image.`);
          }
          continue;
        }

        const resultPath = await tryOnGarmentWithRetry({
          userPath: currentUserPath,
          userBucket,
          garmentPath,
          garment,
          mode,
          session,
          onPollProgress: (pct) => {
            const blended = startProgress + Math.round((endProgress - startProgress) * (pct / 100));
            nudge(Math.min(endProgress, blended), i);
          },
          onAsyncPending: (predictionId) => {
            const current = get().currentSession;
            if (current) {
              set({
                currentSession: {
                  ...current,
                  status: 'pending',
                  pendingPredictionId: predictionId,
                  fittedItemIds,
                  failedItemIds,
                  skippedItemIds,
                  errorMessage:
                    'Your try-on is still processing on the server. We will let you know in your history when it lands.',
                },
                isProcessing: false,
              });
            }
          },
        });

        if (resultPath === 'pending') {
          return;
        }

        if (!resultPath) {
          failedItemIds.push(garment.id);
          // Footwear / accessories last: keep partial clothing result rather than failing entirely
          if (i > 0 && finalResultPath) {
            if (__DEV__) console.warn('[tryon] garment failed after retry', garment.category);
            continue;
          }
          throw new Error(`Could not fit ${garment.category}.`);
        }

        fittedItemIds.push(garment.id);
        finalResultPath = resultPath;
        userBucket = 'tryon-results';
        currentUserPath = resultPath;
        nudge(endProgress, i);
      }

      if (!finalResultPath) {
        throw new Error('Try-on did not produce a final image.');
      }

      const signed = await signedUrlForBucketPath('tryon-results', finalResultPath);
      if (!signed) throw new Error('Failed to resolve try-on result URL.');

      const finalSession = get().currentSession;
      if (!finalSession) return;
      set({
        currentSession: {
          ...finalSession,
          status: 'complete',
          progress: 100,
          resultImageUri: signed,
          fittedItemIds,
          failedItemIds,
          skippedItemIds,
          totalGarments: chain.length,
        },
        isProcessing: false,
      });
    } catch (err) {
      if (__DEV__) console.error('[tryon]', err);
      const current = get().currentSession;
      const message = err instanceof Error ? err.message : 'Virtual try-on failed.';
      if (current) {
        set({
          currentSession: { ...current, status: 'error', errorMessage: message },
          isProcessing: false,
        });
      } else {
        set({ isProcessing: false });
      }
    }
  },

  updateProgress: (progress) => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ currentSession: { ...currentSession, progress } });
  },

  setResult: (resultImageUri) => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({
      currentSession: {
        ...currentSession,
        status: 'complete',
        resultImageUri,
      },
      isProcessing: false,
    });
  },

  setError: (message) => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({
      currentSession: {
        ...currentSession,
        status: 'error',
        errorMessage: message,
      },
      isProcessing: false,
    });
  },

  clearSession: () => {
    set({ currentSession: null, isProcessing: false, _pollCancelled: true });
  },
}));

function partitionTryOnItems(items: ClothingItem[]): {
  clothing: ClothingItem[];
  accessories: ClothingItem[];
  skipped: ClothingItem[];
} {
  const clothing: ClothingItem[] = [];
  const accessories: ClothingItem[] = [];
  const skipped: ClothingItem[] = [];

  const ordered = [...items].sort(
    (a, b) => tryOnSlotPriority(a.category) - tryOnSlotPriority(b.category)
  );

  for (const item of ordered) {
    const kind = classifyTryOnSlot(item.category);
    if (kind === 'clothing') clothing.push(item);
    else if (kind === 'accessory') accessories.push(item);
    else skipped.push(item);
  }

  return { clothing, accessories, skipped };
}

async function tryOnGarmentWithRetry(options: {
  userPath: string;
  userBucket: 'item-photos' | 'avatars' | 'tryon-results';
  garmentPath: string;
  garment: ClothingItem;
  mode: 'clothing' | 'accessory';
  session: TryOnSession;
  onPollProgress: (pct: number) => void;
  onAsyncPending: (predictionId: string) => void;
}): Promise<string | null | 'pending'> {
  const maxAttempts =
    options.mode === 'clothing' && tryOnSlotPriority(options.garment.category) === 4 ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await functionsClient.tryOn({
        user_image_path: options.userPath,
        user_image_bucket: options.userBucket,
        garment_image_path: options.garmentPath,
        outfit_id:
          options.session.outfit?.id && UUID_RE.test(options.session.outfit.id)
            ? options.session.outfit.id
            : undefined,
        session_id: options.session.id,
        mode: options.mode,
      });

      if (res.status === 'succeeded') {
        return res.record.result_image_path;
      }

      if (res.status === 'processing') {
        const polled = await pollUntilDone(res.prediction_id, options.onPollProgress);
        if (polled.status === 'succeeded') {
          return polled.record.result_image_path;
        }
        if (polled.status === 'failed') {
          if (attempt < maxAttempts - 1) continue;
          return null;
        }
        options.onAsyncPending(res.prediction_id);
        return 'pending';
      }
    } catch (err) {
      if (__DEV__) console.warn('[tryon] attempt failed', attempt, options.garment.category, err);
      if (attempt < maxAttempts - 1) continue;
      return null;
    }
  }

  return null;
}

/**
 * Poll `tryon-status` until the prediction is succeeded/failed or the deadline elapses.
 * Also opens a realtime subscription as an opportunistic fast path; whichever finishes first wins.
 */
async function pollUntilDone(
  predictionId: string,
  onProgress: (pct: number) => void
): Promise<
  | { status: 'succeeded'; record: { result_image_path: string } }
  | { status: 'failed'; error: string }
  | { status: 'timeout' }
> {
  const started = Date.now();
  let progressPct = 5;
  onProgress(progressPct);

  const realtime = subscribeToTryOnRow(predictionId);

  try {
    while (Date.now() - started < POLL_MAX_DURATION_MS) {
      if (useTryOnStore.getState()._pollCancelled) {
        return { status: 'timeout' };
      }

      const fromRealtime = realtime.latest();
      if (fromRealtime?.status === 'succeeded' && fromRealtime.result_image_path) {
        return {
          status: 'succeeded',
          record: { result_image_path: fromRealtime.result_image_path },
        };
      }
      if (fromRealtime?.status === 'failed') {
        return {
          status: 'failed',
          error: fromRealtime.error || 'Try-on failed during processing.',
        };
      }

      try {
        const res = await functionsClient.tryOnStatus({ prediction_id: predictionId });
        if (res.ok === true && res.status === 'succeeded') {
          const path = (res.record as { result_image_path?: string }).result_image_path;
          if (!path) {
            return { status: 'failed', error: 'Try-on result missing image path.' };
          }
          return { status: 'succeeded', record: { result_image_path: path } };
        }
        if (res.ok === false && res.status === 'failed') {
          return { status: 'failed', error: res.error || 'Try-on failed during processing.' };
        }
        progressPct = Math.min(95, progressPct + 5);
        onProgress(progressPct);
      } catch (err) {
        if (__DEV__) console.warn('[tryon-status] poll error', err);
      }

      await sleep(POLL_INTERVAL_MS);
    }
    return { status: 'timeout' };
  } finally {
    realtime.unsubscribe();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TryOnRealtimeRow {
  status?: string;
  result_image_path?: string;
  error?: string;
}

function subscribeToTryOnRow(predictionId: string): {
  latest: () => TryOnRealtimeRow | null;
  unsubscribe: () => void;
} {
  const supabase = getSupabase();
  if (!supabase) {
    return { latest: () => null, unsubscribe: () => undefined };
  }

  let latest: TryOnRealtimeRow | null = null;

  const channel = supabase
    .channel(`tryon-${predictionId}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'try_on_history',
        filter: `replicate_prediction_id=eq.${predictionId}`,
      },
      (payload: { new: TryOnRealtimeRow }) => {
        latest = payload.new ?? null;
      }
    )
    .subscribe();

  return {
    latest: () => latest,
    unsubscribe: () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* noop */
      }
    },
  };
}
