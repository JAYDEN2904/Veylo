// delete-account — server-side hard delete of the caller's account.
//
// Input:  none (uses caller's JWT)
// Output: { ok: true, deleted: { storage_objects: number } }
//
// Flow:
//   1. Verify caller's JWT
//   2. Mark account_deletion_requests as 'processing' (so a retry stays idempotent)
//   3. List + delete every storage object under {uid}/ in all three buckets
//   4. auth.admin.deleteUser(uid) — DB cascades wipe the rest of the rows
//   5. Mark request 'completed'
//
// All table cascades (clothing_items, outfits, embeddings, etc.) fire from
// the FK chain on auth.users delete.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const BUCKETS = ['item-photos', 'avatars', 'tryon-results'] as const;

async function purgeBucket(
  service: ReturnType<typeof getServiceClient>,
  bucket: string,
  uid: string
): Promise<number> {
  let removed = 0;
  // Storage list returns up to 100 by default; loop until exhausted.
  while (true) {
    const { data, error } = await service.storage.from(bucket).list(uid, { limit: 100 });
    if (error) {
      console.error('[delete-account] list', bucket, error);
      return removed;
    }
    if (!data || data.length === 0) return removed;

    const paths = data.map((entry) => `${uid}/${entry.name}`);
    const { error: removeError } = await service.storage.from(bucket).remove(paths);
    if (removeError) {
      console.error('[delete-account] remove', bucket, removeError);
      return removed;
    }
    removed += paths.length;
    if (data.length < 100) return removed;
  }
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user } = ctx;

  const service = getServiceClient();

  await service.from('account_deletion_requests').upsert(
    {
      user_id: user.id,
      status: 'processing',
      requested_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  let totalRemoved = 0;
  for (const bucket of BUCKETS) {
    totalRemoved += await purgeBucket(service, bucket, user.id);
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
  if (deleteError) {
    await service
      .from('account_deletion_requests')
      .update({ status: 'failed', error: deleteError.message })
      .eq('user_id', user.id);
    return jsonResponse(
      { error: 'Failed to delete user', detail: deleteError.message },
      { status: 500 }
    );
  }

  // The deletion_requests row will be cascaded by the FK; update is best-effort.
  await service
    .from('account_deletion_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  return jsonResponse({
    ok: true,
    deleted: { storage_objects: totalRemoved },
  });
});
