import type { ClothingItem } from '../types';
import type { HslColor } from '../utils/hslColor';
import { hslToDisplayName, namedColorsToHsl, parseHslArray } from '../utils/hslColor';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type ClothingRow = {
  id: string;
  user_id: string;
  image_path: string;
  category: string;
  sub_category: string | null;
  colors: string[] | null;
  colors_hsl: HslColor[] | null;
  brand: string | null;
  tags: string[] | null;
  notes: string | null;
  season: string[] | null;
  status: string;
  worn_count: number | null;
  last_worn: string | null;
  created_at: string;
  formality_score: number | null;
  material: string | null;
  pattern: string | null;
};

export type ClothingItemInsert = {
  image_path: string;
  category?: string;
  sub_category?: string | null;
  colors?: string[];
  brand?: string | null;
  tags?: string[];
  notes?: string | null;
  season?: string[];
  status?: 'active' | 'archived' | 'donated';
};

export type ClothingItemUpdate = Partial<Omit<ClothingRow, 'id' | 'user_id' | 'created_at'>>;

export async function signedUrlForItemPath(path: string): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return '';
  const { data, error } = await supabase.storage.from('item-photos').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    return '';
  }
  return data.signedUrl;
}

function rowToItem(row: ClothingRow, imageUrl: string): ClothingItem {
  const hsl = parseHslArray(row.colors_hsl);
  const colors = hsl.length > 0 ? hsl.map(hslToDisplayName) : (row.colors ?? []);

  return {
    id: row.id,
    imageUrl,
    category: row.category,
    subCategory: row.sub_category ?? undefined,
    colors,
    colorsHsl: hsl.length > 0 ? hsl : namedColorsToHsl(row.colors ?? []),
    brand: row.brand ?? undefined,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    season: row.season ?? undefined,
    status: row.status as ClothingItem['status'],
    wornCount: row.worn_count ?? undefined,
    lastWorn: row.last_worn ?? undefined,
    createdAt: row.created_at,
    formalityScore: row.formality_score ?? undefined,
    material: row.material ?? undefined,
    pattern: row.pattern ?? undefined,
  };
}

export async function rowToClothingItem(row: ClothingRow): Promise<ClothingItem> {
  const url = await signedUrlForItemPath(row.image_path);
  return rowToItem(row, url);
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/**
 * Insert a new `clothing_items` row for the caller.
 * Returns the created row (includes server-assigned `id`) or null when Supabase is unconfigured.
 */
export async function createClothingItem(insert: ClothingItemInsert): Promise<ClothingRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Not authenticated');
  const payload = {
    user_id: uid,
    image_path: insert.image_path,
    category: insert.category ?? 'unknown',
    sub_category: insert.sub_category ?? null,
    colors: insert.colors ?? [],
    brand: insert.brand ?? null,
    tags: insert.tags ?? [],
    notes: insert.notes ?? null,
    season: insert.season ?? [],
    status: insert.status ?? 'active',
  };
  const { data, error } = await supabase
    .from('clothing_items')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as ClothingRow;
}

export async function fetchClothingItemById(id: string): Promise<ClothingRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('clothing_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as ClothingRow | null) ?? null;
}

export async function updateClothingItem(
  id: string,
  patch: ClothingItemUpdate
): Promise<ClothingRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('clothing_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as ClothingRow;
}

/** Map client ClothingItem partial updates to a Supabase row patch. */
export function clothingItemUpdatesToPatch(updates: Partial<ClothingItem>): ClothingItemUpdate {
  const patch: ClothingItemUpdate = {};
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.subCategory !== undefined) patch.sub_category = updates.subCategory ?? null;
  if (updates.colors !== undefined) {
    patch.colors = updates.colors;
    if (updates.colorsHsl !== undefined) {
      patch.colors_hsl = updates.colorsHsl;
    }
  }
  if (updates.colorsHsl !== undefined && updates.colors === undefined) {
    patch.colors_hsl = updates.colorsHsl;
    patch.colors = updates.colorsHsl.map(hslToDisplayName);
  }
  if (updates.brand !== undefined) patch.brand = updates.brand ?? null;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.notes !== undefined) patch.notes = updates.notes ?? null;
  if (updates.season !== undefined) {
    patch.season = updates.season.map((s) => s.toLowerCase());
  }
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.wornCount !== undefined) patch.worn_count = updates.wornCount;
  if (updates.lastWorn !== undefined) patch.last_worn = updates.lastWorn ?? null;
  if (updates.formalityScore !== undefined) patch.formality_score = updates.formalityScore;
  if (updates.material !== undefined) patch.material = updates.material ?? null;
  if (updates.pattern !== undefined) patch.pattern = updates.pattern ?? null;
  return patch;
}

/**
 * Delete a wardrobe row and its storage object when configured.
 */
export async function deleteClothingItem(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const row = await fetchClothingItemById(id);
  if (!row) return;

  const { error: deleteError } = await supabase.from('clothing_items').delete().eq('id', id);
  if (deleteError) throw deleteError;

  if (row.image_path) {
    const { error: storageError } = await supabase.storage
      .from('item-photos')
      .remove([row.image_path]);
    if (storageError && __DEV__) {
      console.warn('[deleteClothingItem] storage remove failed:', storageError.message);
    }
  }
}

/** Returns remote items, or null when Supabase is not configured (caller shows empty wardrobe). */
export async function fetchWardrobeItemsRemote(): Promise<ClothingItem[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) {
    return [];
  }
  const { data, error } = await supabase
    .from('clothing_items')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as ClothingRow[];
  const items: ClothingItem[] = [];
  for (const row of rows) {
    const url = await signedUrlForItemPath(row.image_path);
    if (!url) continue;
    items.push(rowToItem(row, url));
  }
  return items;
}
