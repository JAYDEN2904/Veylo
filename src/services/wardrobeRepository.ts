import type { ClothingItem } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type ClothingRow = {
  id: string;
  user_id: string;
  image_path: string;
  category: string;
  sub_category: string | null;
  colors: string[] | null;
  brand: string | null;
  tags: string[] | null;
  notes: string | null;
  season: string[] | null;
  status: string;
  worn_count: number | null;
  last_worn: string | null;
  created_at: string;
  formality_score: number | null;
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
  return {
    id: row.id,
    imageUrl,
    category: row.category,
    subCategory: row.sub_category ?? undefined,
    colors: row.colors ?? [],
    brand: row.brand ?? undefined,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    season: row.season ?? undefined,
    status: row.status as ClothingItem['status'],
    wornCount: row.worn_count ?? undefined,
    lastWorn: row.last_worn ?? undefined,
    createdAt: row.created_at,
    formalityScore: row.formality_score ?? undefined,
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

/** Returns remote items, or null when Supabase is not configured (caller keeps mocks). */
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
