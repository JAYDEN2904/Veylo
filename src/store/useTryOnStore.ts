import { create } from 'zustand';
import { ClothingItem, Outfit } from '../types';
import { useAuthStore } from './useAuthStore';
import { functionsClient } from '../services/functionsClient';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { uploadAvatarPhoto, signedUrlForBucketPath } from '../services/imageUpload';
import { fetchClothingItemById } from '../services/wardrobeRepository';

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

    // Offline / unconfigured → set a clear "coming soon" error state instead of
    // serving a hardcoded stock image that lies to the user about the result.
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

      const garments = filterTryOnGarments(session.items);
      if (garments.length === 0) {
        throw new Error('No wearable garments in the outfit.');
      }

      // 1. Upload the user photo / avatar to `avatars/{uid}/...`.
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
      const avatarUpload = await uploadAvatarPhoto(user.id, sourceUri, `selfie-${Date.now()}.jpg`);

      let userBucket: 'item-photos' | 'avatars' | 'tryon-results' = 'avatars';
      let currentUserPath = avatarUpload.path;
      let finalResultPath: string | null = null;

      // 2. Chain a try-on per garment. The output of garment N feeds garment N+1
      // so the final image carries the whole outfit.
      for (let i = 0; i < garments.length; i++) {
        const garment = garments[i];
        const fraction = (i + 1) / garments.length;
        const startProgress = 10 + Math.round((i / garments.length) * 80);
        const endProgress = 10 + Math.round(fraction * 80);

        nudge(startProgress, i);

        const row = await fetchClothingItemById(garment.id);
        if (!row) throw new Error(`Garment "${garment.category}" not found in your wardrobe.`);

        const garmentPath = (row.image_path as string | undefined) ?? null;
        if (!garmentPath) throw new Error(`Garment "${garment.category}" is missing an image.`);

        let res;
        try {
          res = await functionsClient.tryOn({
            user_image_path: currentUserPath,
            user_image_bucket: userBucket,
            garment_image_path: garmentPath,
            outfit_id:
              session.outfit?.id && !session.outfit.id.startsWith('generated-')
                ? session.outfit.id
                : undefined,
            session_id: session.id,
          });
        } catch (err) {
          // If a non-first garment fails, fall back to whatever we have so far
          // rather than wiping the whole session.
          if (i > 0 && finalResultPath) {
            if (__DEV__) console.warn('[tryon] partial chain failed at garment', i, err);
            break;
          }
          throw err;
        }

        let resultPath: string | null = null;
        if (res.status === 'succeeded') {
          resultPath = res.record.result_image_path;
          finalResultPath = resultPath;
        } else if (res.status === 'processing') {
          // Async — poll until succeeded/failed.
          const polled = await pollUntilDone(res.prediction_id, (pct) => {
            const blended = startProgress + Math.round((endProgress - startProgress) * (pct / 100));
            nudge(Math.min(endProgress, blended), i);
          });
          if (polled.status === 'succeeded') {
            resultPath = polled.record.result_image_path;
            finalResultPath = resultPath;
          } else if (polled.status === 'failed') {
            if (i > 0 && finalResultPath) {
              if (__DEV__)
                console.warn(
                  '[tryon] partial chain failed during poll at garment',
                  i,
                  polled.error
                );
              break;
            }
            throw new Error(polled.error || 'Try-on failed during processing.');
          } else {
            // Still processing after the maximum poll window — keep state for later resumption.
            const current = get().currentSession;
            if (current) {
              set({
                currentSession: {
                  ...current,
                  status: 'pending',
                  pendingPredictionId: res.prediction_id,
                  errorMessage:
                    'Your try-on is still processing on the server. We will let you know in your history when it lands.',
                },
                isProcessing: false,
              });
            }
            return;
          }
        }

        if (!resultPath) {
          throw new Error('Try-on returned no result.');
        }

        // For chained garments past the first, the next input is the previous result.
        if (i < garments.length - 1) {
          userBucket = 'tryon-results';
          currentUserPath = resultPath;
        }

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

/**
 * Keep top + bottom + dress + outerwear; drop accessories that IDM-VTON cannot meaningfully fit.
 * IDM-VTON works best on torso garments; we still chain bottoms through for layered output.
 */
function filterTryOnGarments(items: ClothingItem[]): ClothingItem[] {
  const ordered = [...items].sort(
    (a, b) => tryOnSlotPriority(a.category) - tryOnSlotPriority(b.category)
  );
  return ordered.filter((item) => tryOnSlotPriority(item.category) < 99);
}

function tryOnSlotPriority(category: string | undefined): number {
  const c = (category ?? '').toLowerCase();
  if (c.includes('dress')) return 0;
  if (c.includes('top')) return 1;
  if (c.includes('outerwear') || c.includes('jacket') || c.includes('coat')) return 2;
  if (c.includes('bottom') || c.includes('pant') || c.includes('skirt') || c.includes('short'))
    return 3;
  if (c.includes('shoe')) return 4;
  return 99;
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

  // Realtime subscription (opportunistic — fail silently if unavailable).
  const realtime = subscribeToTryOnRow(predictionId);

  try {
    while (Date.now() - started < POLL_MAX_DURATION_MS) {
      if (useTryOnStore.getState()._pollCancelled) {
        return { status: 'timeout' };
      }

      // Realtime fast path.
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
        // Still processing — bump progress smoothly toward 95%.
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
