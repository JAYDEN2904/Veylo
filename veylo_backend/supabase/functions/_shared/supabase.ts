import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

/**
 * Service-role client. Bypasses RLS — only use after the caller's JWT has been
 * verified via `getCallerUser` and you specifically need to write across users
 * (e.g. account deletion, server-side cache, internal ledgers).
 */
export function getServiceClient(): SupabaseClient {
  const url = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * User-scoped client. Inherits the caller's JWT so all queries respect RLS.
 * Pass this to anything that should not bypass row-level security.
 */
export function getUserClient(req: Request): SupabaseClient {
  const url = requireEnv('SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}
