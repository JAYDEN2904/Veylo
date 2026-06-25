import type { SupabaseClient, User } from 'jsr:@supabase/supabase-js@2';
import { getUserClient } from './supabase.ts';
import { jsonResponse } from './cors.ts';

export interface AuthedContext {
  user: User;
  userClient: SupabaseClient;
}

/**
 * Verifies the caller's JWT and returns either the authed context or a 401 Response.
 * Edge Functions should `return ctx;` if it is a Response.
 */
export async function requireUser(req: Request): Promise<AuthedContext | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const userClient = getUserClient(req);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return jsonResponse({ error: 'Invalid or expired token' }, { status: 401 });
  }

  return { user: data.user, userClient };
}
