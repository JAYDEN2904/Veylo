import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WardrobeState, ClothingItem } from '../types';
import { asyncJsonStorage } from '../lib/zustandStorage';
import { fetchWardrobeItemsRemote } from '../services/wardrobeRepository';
import { isSupabaseConfigured } from '../services/supabase';

// Realistic mock data with fashion-forward items
const MOCK_ITEMS: ClothingItem[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    category: 'Tops',
    subCategory: 'T-Shirt',
    colors: ['White'],
    brand: 'COS',
    tags: ['casual', 'minimal', 'everyday'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 12,
    season: ['summer', 'spring'],
    status: 'active',
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    category: 'Bottoms',
    subCategory: 'Jeans',
    colors: ['Blue', 'Indigo'],
    brand: "Levi's",
    tags: ['casual', 'denim', 'classic'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 24,
    season: ['fall', 'winter', 'spring'],
    status: 'active',
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
    category: 'Outerwear',
    subCategory: 'Blazer',
    colors: ['Black'],
    brand: 'Zara',
    tags: ['formal', 'work', 'elegant'],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 8,
    season: ['fall', 'winter', 'spring'],
    status: 'active',
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    category: 'Shoes',
    subCategory: 'Sneakers',
    colors: ['White', 'Gray'],
    brand: 'Nike',
    tags: ['casual', 'sport', 'everyday'],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date().toISOString(),
    wornCount: 45,
    season: ['summer', 'spring', 'fall'],
    status: 'active',
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
    category: 'Tops',
    subCategory: 'Shirt',
    colors: ['Light Blue'],
    brand: 'Ralph Lauren',
    tags: ['formal', 'work', 'classic'],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 15,
    season: ['summer', 'spring', 'fall'],
    status: 'active',
  },
  {
    id: '6',
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
    category: 'Bottoms',
    subCategory: 'Chinos',
    colors: ['Khaki', 'Beige'],
    brand: 'H&M',
    tags: ['casual', 'smart casual', 'versatile'],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 18,
    season: ['summer', 'spring', 'fall'],
    status: 'active',
  },
  {
    id: '7',
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
    category: 'Tops',
    subCategory: 'Hoodie',
    colors: ['Gray', 'Charcoal'],
    brand: 'Champion',
    tags: ['casual', 'comfort', 'weekend'],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 32,
    season: ['fall', 'winter'],
    status: 'active',
  },
  {
    id: '8',
    imageUrl: 'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=400',
    category: 'Accessories',
    subCategory: 'Sunglasses',
    colors: ['Black', 'Gold'],
    brand: 'Ray-Ban',
    tags: ['accessory', 'summer', 'style'],
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date().toISOString(),
    wornCount: 56,
    season: ['summer', 'spring'],
    status: 'active',
  },
  {
    id: '9',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
    category: 'Outerwear',
    subCategory: 'Jacket',
    colors: ['Brown', 'Tan'],
    brand: 'AllSaints',
    tags: ['casual', 'leather', 'edgy'],
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 22,
    season: ['fall', 'spring'],
    status: 'active',
  },
  {
    id: '10',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
    category: 'Tops',
    subCategory: 'Blouse',
    colors: ['Cream', 'Off-White'],
    brand: 'Massimo Dutti',
    tags: ['elegant', 'work', 'feminine'],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 10,
    season: ['summer', 'spring', 'fall'],
    status: 'active',
  },
  {
    id: '11',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
    category: 'Bottoms',
    subCategory: 'Shorts',
    colors: ['Navy'],
    brand: 'Uniqlo',
    tags: ['casual', 'summer', 'comfort'],
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 14,
    season: ['summer'],
    status: 'active',
  },
  {
    id: '12',
    imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400',
    category: 'Shoes',
    subCategory: 'Canvas',
    colors: ['Red', 'White'],
    brand: 'Converse',
    tags: ['casual', 'classic', 'street'],
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    lastWorn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    wornCount: 67,
    season: ['summer', 'spring', 'fall'],
    status: 'active',
  },
];

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
            set({ items: remote, isLoading: false });
            return;
          }
          // Supabase not configured — fall back to demo data.
          set({ items: MOCK_ITEMS, isLoading: false });
        } catch (err) {
          if (__DEV__) console.error('[useWardrobeStore] fetchItems', err);
          set({
            items: isSupabaseConfigured() ? [] : MOCK_ITEMS,
            isLoading: false,
          });
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
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          favoriteItemIds: state.favoriteItemIds.filter((fid) => fid !== id),
        })),
      getItemsByCategory: (category: string) => {
        const { items } = get();
        if (category === 'All') return items;
        return items.filter((item) => item.category === category);
      },
    }),
    {
      name: 'veylo-wardrobe-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({
        items: state.items,
        filters: state.filters,
        favoriteItemIds: state.favoriteItemIds,
      }),
    }
  )
);
