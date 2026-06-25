import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { asyncJsonStorage } from '../lib/zustandStorage';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';

export type WearRatingOutcome = 'compliments' | 'felt_great' | 'wear_again';

export interface PendingRating {
  outfitId: string | null;
  outfitName: string;
  wornAt: string;
}

interface PendingRatingState {
  pending: PendingRating | null;
  setPending: (rating: PendingRating) => void;
  clearPending: () => void;
  submitRating: (outcomes: WearRatingOutcome[]) => Promise<void>;
}

export const usePendingRatingStore = create<PendingRatingState>()(
  persist(
    (set, get) => ({
      pending: null,

      setPending: (rating: PendingRating) => {
        set({ pending: rating });
      },

      clearPending: () => {
        set({ pending: null });
      },

      submitRating: async (outcomes: WearRatingOutcome[]) => {
        const { pending } = get();
        if (!pending) return;

        if (isSupabaseConfigured()) {
          try {
            const supabase = getSupabase();
            if (supabase) {
              const { data: sessionData } = await supabase.auth.getSession();
              const uid = sessionData.session?.user?.id;
              if (uid) {
                const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const outfitId =
                  pending.outfitId && UUID_RE.test(pending.outfitId) ? pending.outfitId : null;
                await supabase.from('wear_ratings').insert({
                  user_id: uid,
                  outfit_id: outfitId,
                  outcomes,
                  rated_at: new Date().toISOString(),
                });
              }
            }
          } catch (err) {
            if (__DEV__) console.warn('[usePendingRatingStore] submitRating remote failed', err);
          }
        }

        set({ pending: null });
      },
    }),
    {
      name: 'veylo-pending-rating-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({ pending: state.pending }),
    }
  )
);
