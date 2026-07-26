import { getSupabase, isSupabaseConfigured } from './supabase';
import { getCurrentUserId } from './wardrobeRepository';

export type ScanQueueRow = {
  id: string;
  user_id: string;
  image_path: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  error: string | null;
  created_at: string;
  updated_at: string;
};

export async function enqueueScanQueue(imagePath: string): Promise<ScanQueueRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('scan_queue')
    .insert({ user_id: uid, image_path: imagePath, status: 'pending' })
    .select('*')
    .single();
  if (error) throw error;
  return data as ScanQueueRow;
}

export async function fetchScanQueue(): Promise<ScanQueueRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const uid = await getCurrentUserId();
  if (!uid) return [];

  const { data, error } = await supabase
    .from('scan_queue')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ScanQueueRow[];
}

export async function updateScanQueueRow(
  id: string,
  patch: Partial<Pick<ScanQueueRow, 'status' | 'error'>>
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('scan_queue').update(patch).eq('id', id);
  if (error) throw error;
}
