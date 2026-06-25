// gamification-events — awards points + badges for client-reported milestones.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getServiceClient } from '../_shared/supabase.ts';

type EventKind = 'outfit_logged' | 'item_added' | 'tryon_completed';

interface Payload {
  event: EventKind;
}

const POINTS: Record<EventKind, number> = {
  outfit_logged: 5,
  item_added: 3,
  tryon_completed: 10,
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { user } = ctx;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ev = payload.event;
  if (!ev || !(ev in POINTS)) {
    return jsonResponse({ error: 'invalid event' }, { status: 400 });
  }

  const delta = POINTS[ev];
  const service = getServiceClient();

  const { data: existing } = await service
    .from('user_stats')
    .select('points, streak_days')
    .eq('user_id', user.id)
    .maybeSingle();

  const prevPts = (existing?.points as number | undefined) ?? 0;
  const nextPoints = prevPts + delta;

  await service.from('user_stats').upsert(
    {
      user_id: user.id,
      points: nextPoints,
      streak_days: (existing?.streak_days as number | undefined) ?? 1,
      last_active_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  const pts = nextPoints;

  const badgesToAward: string[] = [];
  if (pts >= 500) badgesToAward.push('style_explorer');
  if (pts >= 100) badgesToAward.push('week_warrior');
  if (ev === 'item_added' && pts >= 50) badgesToAward.push('collector_10');

  for (const badgeId of [...new Set(badgesToAward)]) {
    await service
      .from('user_badges')
      .upsert(
        { user_id: user.id, badge_id: badgeId },
        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
      );
  }

  return jsonResponse({
    ok: true,
    points_total: pts,
    badges_awarded: badgesToAward,
  });
});
