import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TryOnHistory } from '../types';
import { asyncJsonStorage } from '../lib/zustandStorage';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { signedUrlForBucketPath } from '../services/imageUpload';

interface TryOnHistoryState {
  history: TryOnHistory[];
  isLoading: boolean;
  fetchHistory: () => Promise<void>;
  addToHistory: (historyItem: Omit<TryOnHistory, 'id' | 'createdAt'>) => void;
  updateHistoryItem: (id: string, updates: Partial<TryOnHistory>) => void;
  deleteHistoryItem: (id: string) => void;
  getHistoryByOutfit: (outfitId: string) => TryOnHistory[];
  clearHistory: () => void;
}

export const useTryOnHistoryStore = create<TryOnHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      isLoading: false,

      fetchHistory: async () => {
        if (!isSupabaseConfigured()) return;
        const supabase = getSupabase();
        if (!supabase) return;
        set({ isLoading: true });
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user?.id;
          if (!uid) {
            set({ isLoading: false });
            return;
          }
          const { data, error } = await supabase
            .from('try_on_history')
            .select('id, outfit_id, session_id, result_image_path, input_image_path, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;

          const rows = (data ?? []) as Array<{
            id: string;
            outfit_id: string | null;
            session_id: string | null;
            result_image_path: string;
            input_image_path: string | null;
            created_at: string;
          }>;

          const hydrated: TryOnHistory[] = [];
          for (const row of rows) {
            const [resultUrl, inputUrl] = await Promise.all([
              signedUrlForBucketPath('tryon-results', row.result_image_path),
              row.input_image_path ? signedUrlForBucketPath('avatars', row.input_image_path) : null,
            ]);
            if (!resultUrl) continue;
            hydrated.push({
              id: row.id,
              sessionId: row.session_id ?? row.id,
              outfitId: row.outfit_id ?? undefined,
              resultImageUri: resultUrl,
              previewImageUri: inputUrl ?? undefined,
              createdAt: row.created_at,
              items: [],
            });
          }
          set({ history: hydrated, isLoading: false });
        } catch (err) {
          if (__DEV__) console.error('[useTryOnHistoryStore] fetchHistory', err);
          set({ isLoading: false });
        }
      },

      addToHistory: (historyItem) => {
        const newItem: TryOnHistory = {
          ...historyItem,
          id: `history-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          history: [newItem, ...state.history],
        }));
      },

      updateHistoryItem: (id, updates) => {
        set((state) => ({
          history: state.history.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        }));
      },

      deleteHistoryItem: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
      },

      getHistoryByOutfit: (outfitId) => {
        return get().history.filter((item) => item.outfitId === outfitId);
      },

      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: 'veylo-tryon-history-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({ history: state.history }),
    }
  )
);
