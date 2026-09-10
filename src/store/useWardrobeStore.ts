import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WardrobeState, ClothingItem } from '../types';
import { asyncJsonStorage } from '../lib/zustandStorage';
import { namedColorsToHsl } from '../utils/hslColor';
import {
  clothingItemUpdatesToPatch,
  deleteClothingItem,
  fetchWardrobeItemsRemote,
  updateClothingItem,
} from '../services/wardrobeRepository';
import { isSupabaseConfigured } from '../services/supabase';
import { onClientItemUpdated, onClothingItemDeleted } from '../services/recommendation/embeddings/embeddingLifecycle';

function ensureColorsHsl(items: ClothingItem[]): ClothingItem[] {
  return items.map((item) => ({
    ...item,
    colorsHsl: item.colorsHsl?.length ? item.colorsHsl : namedColorsToHsl(item.colors ?? []),
  }));
}

export const useWardrobeStore = create<WardrobeState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      filters: {},
      favoriteItemIds: [],
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      toggleItemFavorite: (id) =>
        set((state) => {
          const next = new Set(state.favoriteItemIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { favoriteItemIds: Array.from(next) };
        }),
      isItemFavorite: (id) => get().favoriteItemIds.includes(id),
      fetchItems: async () => {
        set({ isLoading: true });
        try {
          const remote = await fetchWardrobeItemsRemote();
          if (remote !== null) {
            set({ items: ensureColorsHsl(remote), isLoading: false });
            return;
          }
          // Supabase not configured — empty wardrobe (never invent demo items).
          set({ items: [], isLoading: false });
        } catch (err) {
          if (__DEV__) console.error('[useWardrobeStore] fetchItems', err);
          set({ items: [], isLoading: false });
        }
      },
      addItem: (item) => {
        const newItem = {
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },
      updateItem: async (id, updates) => {
        const previous = get().items.find((item) => item.id === id);
        if (!previous) return;

        const merged = { ...previous, ...updates };
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? merged : item)),
        }));

        if (!isSupabaseConfigured()) {
          onClientItemUpdated(previous, merged);
          return;
        }

        try {
          const patch = clothingItemUpdatesToPatch(updates);
          if (Object.keys(patch).length === 0) {
            onClientItemUpdated(previous, merged);
            return;
          }
          await updateClothingItem(id, patch);
          // Remote source changes already scheduled in updateClothingItem.
        } catch (err) {
          set((state) => ({
            items: state.items.map((item) => (item.id === id ? previous : item)),
          }));
          if (__DEV__) console.error('[useWardrobeStore] updateItem', err);
          throw err;
        }
      },
      deleteItem: async (id) => {
        const previousItems = get().items;
        const previousFavorites = get().favoriteItemIds;

        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          favoriteItemIds: state.favoriteItemIds.filter((fid) => fid !== id),
        }));

        if (!isSupabaseConfigured()) {
          onClothingItemDeleted(id);
          return;
        }

        try {
          await deleteClothingItem(id);
        } catch (err) {
          set({ items: previousItems, favoriteItemIds: previousFavorites });
          if (__DEV__) console.error('[useWardrobeStore] deleteItem', err);
          throw err;
        }
      },
      getItemsByCategory: (category: string) => {
        const { items } = get();
        if (category === 'All') return items;
        return items.filter((item) => item.category === category);
      },
    }),
    {
      name: 'veylo-wardrobe-v1',
      // v2: drop persisted MOCK_ITEMS / demo wardrobe from earlier builds
      version: 2,
      storage: asyncJsonStorage,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<WardrobeState>;
        return {
          items: [],
          filters: state.filters ?? {},
          favoriteItemIds: [],
        };
      },
      partialize: (state) => ({
        items: state.items,
        filters: state.filters,
        favoriteItemIds: state.favoriteItemIds,
      }),
    }
  )
);
