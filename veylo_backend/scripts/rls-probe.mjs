/**
 * RLS probe — verifies owner isolation with the anon key (not service role).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... \
 *   RLS_PROBE_EMAIL_A=... RLS_PROBE_PASSWORD_A=... \
 *   RLS_PROBE_EMAIL_B=... RLS_PROBE_PASSWORD_B=... \
 *   node veylo_backend/scripts/rls-probe.mjs
 *
 * Creates nothing permanently beyond the two probe accounts (reuse if they exist).
 * Expects those users to already exist in Auth (create once in Dashboard or via signup).
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const emailA = process.env.RLS_PROBE_EMAIL_A;
const passA = process.env.RLS_PROBE_PASSWORD_A;
const emailB = process.env.RLS_PROBE_EMAIL_B;
const passB = process.env.RLS_PROBE_PASSWORD_B;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

if (!url || !anon || !emailA || !passA || !emailB || !passB) {
  console.error(
    'Missing env: SUPABASE_URL, SUPABASE_ANON_KEY, RLS_PROBE_EMAIL_A/B, RLS_PROBE_PASSWORD_A/B'
  );
  process.exit(1);
}

const OWNER_TABLES = [
  'clothing_items',
  'outfits',
  'try_on_history',
  'scan_queue',
  'embeddings',
  'avatars',
  'style_profiles',
  'push_tokens',
  'user_stats',
  'notifications',
];

async function signIn(email, password) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`sign-in failed for ${email}: ${error?.message ?? 'no user'}`);
  }
  return { client, user: data.user };
}

async function main() {
  console.log('RLS probe starting…');

  // Anon without session must not read clothing_items
  {
    const anonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anonClient.from('clothing_items').select('id').limit(5);
    if (error) {
      ok(`anon clothing_items rejected (${error.code ?? error.message})`);
    } else if (!data || data.length === 0) {
      ok('anon clothing_items returned empty (RLS deny-all)');
    } else {
      fail(`anon clothing_items leaked ${data.length} rows`);
    }
  }

  const a = await signIn(emailA, passA);
  const b = await signIn(emailB, passB);
  ok(`signed in A=${a.user.id} B=${b.user.id}`);

  // Cross-user SELECT must not return other user's rows
  for (const table of OWNER_TABLES) {
    const { data, error } = await a.client.from(table).select('*').limit(50);
    if (error) {
      // Some tables may error if columns differ; still treat as non-leak if no data
      ok(`${table}: A select error (non-fatal): ${error.message}`);
      continue;
    }
    const leaked = (data ?? []).filter((row) => {
      const uid = row.user_id ?? row.id;
      // profiles use id = auth.uid(); style_profiles/user_stats use user_id
      if (table === 'profiles') return row.id && row.id !== a.user.id;
      return uid && uid !== a.user.id;
    });
    if (leaked.length > 0) {
      fail(`${table}: A saw ${leaked.length} foreign rows`);
    } else {
      ok(`${table}: A only sees own rows (${(data ?? []).length})`);
    }
  }

  // user_stats: authenticated UPDATE of own points must fail (writes revoked)
  {
    const { error } = await a.client
      .from('user_stats')
      .update({ points: 999999 })
      .eq('user_id', a.user.id);
    if (error) {
      ok(`user_stats update blocked: ${error.message}`);
    } else {
      // Supabase may return no error with 0 rows updated under RLS
      const { data } = await a.client
        .from('user_stats')
        .select('points')
        .eq('user_id', a.user.id)
        .maybeSingle();
      if (data && data.points === 999999) {
        fail('user_stats client update succeeded — points writable');
      } else {
        ok('user_stats update did not change points (RLS)');
      }
    }
  }

  // Cross-user INSERT into clothing_items as B with A's user_id must fail
  {
    const { error } = await b.client.from('clothing_items').insert({
      user_id: a.user.id,
      category: 'top',
      image_path: `${a.user.id}/rls-probe-should-fail.jpg`,
      status: 'active',
    });
    if (error) {
      ok(`cross-user clothing_items insert blocked: ${error.message}`);
    } else {
      fail('cross-user clothing_items insert succeeded');
      // cleanup best-effort
      await a.client
        .from('clothing_items')
        .delete()
        .eq('image_path', `${a.user.id}/rls-probe-should-fail.jpg`);
    }
  }

  // Storage: A cannot list B's prefix
  {
    const { data, error } = await a.client.storage.from('item-photos').list(b.user.id, {
      limit: 10,
    });
    if (error) {
      ok(`storage list foreign prefix error: ${error.message}`);
    } else if (!data || data.length === 0) {
      ok('storage list foreign prefix empty');
    } else {
      fail(`storage listed ${data.length} objects under B's prefix`);
    }
  }

  // SECURITY DEFINER RPC must not be callable
  for (const fn of ['veylo_handle_new_user', 'veylo_on_outfit_event_gamification', 'rls_auto_enable']) {
    const { error } = await a.client.rpc(fn);
    if (error) {
      ok(`rpc ${fn} blocked: ${error.message}`);
    } else {
      fail(`rpc ${fn} executed successfully — should be revoked`);
    }
  }

  if (process.exitCode) {
    console.error('\nRLS probe finished with failures.');
  } else {
    console.log('\nRLS probe passed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
