import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Daily spend / operation caps backed by public.api_usage.
 * Fail-closed on query errors for paid endpoints (prefer availability loss over spend).
 */

export interface BudgetResult {
  ok: boolean;
  reason?: 'global_cap' | 'user_cap' | 'unavailable';
  retryAfterSeconds?: number;
  detail?: string;
}

function envNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Seconds until next UTC midnight. */
export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

function utcDayStartIso(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

/** Global daily USD cap (default $10). Env: DAILY_SPEND_CAP_USD */
export function dailySpendCapUsd(): number {
  return envNumber('DAILY_SPEND_CAP_USD', 10);
}

/** Per-user daily operation caps (env-overridable). */
export const USER_DAILY_OP_CAPS: Record<string, { env: string; default: number }> = {
  'tryon-generate': { env: 'DAILY_USER_TRYON_CAP', default: 20 },
  'generate-avatar': { env: 'DAILY_USER_AVATAR_CAP', default: 5 },
  'tag-item': { env: 'DAILY_USER_TAG_CAP', default: 60 },
  'generate-embedding': { env: 'DAILY_USER_EMBEDDING_CAP', default: 100 },
};

export function userDailyOpCap(functionName: string): number | null {
  const entry = USER_DAILY_OP_CAPS[functionName];
  if (!entry) return null;
  return envNumber(entry.env, entry.default);
}

export async function checkGlobalDailySpendCap(service: SupabaseClient): Promise<BudgetResult> {
  const cap = dailySpendCapUsd();
  if (cap <= 0) return { ok: true };

  const since = utcDayStartIso();
  const { data, error } = await service
    .from('api_usage')
    .select('cost_usd')
    .gte('created_at', since);

  if (error) {
    console.error('[budget] global spend select', error.message);
    return {
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: secondsUntilUtcMidnight(),
      detail: 'Spend ledger unavailable',
    };
  }

  const total = (data ?? []).reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0);
  if (total >= cap) {
    return {
      ok: false,
      reason: 'global_cap',
      retryAfterSeconds: secondsUntilUtcMidnight(),
      detail: `Daily spend cap reached ($${cap})`,
    };
  }
  return { ok: true };
}

export async function checkUserDailyOpCap(
  service: SupabaseClient,
  userId: string,
  functionName: string
): Promise<BudgetResult> {
  const cap = userDailyOpCap(functionName);
  if (cap === null) return { ok: true };
  if (cap <= 0) {
    return {
      ok: false,
      reason: 'user_cap',
      retryAfterSeconds: secondsUntilUtcMidnight(),
      detail: `${functionName} disabled by daily cap config`,
    };
  }

  const since = utcDayStartIso();
  const { count, error } = await service
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .gte('created_at', since);

  if (error) {
    console.error('[budget] user op select', error.message);
    return {
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: secondsUntilUtcMidnight(),
      detail: 'Usage ledger unavailable',
    };
  }

  if ((count ?? 0) >= cap) {
    return {
      ok: false,
      reason: 'user_cap',
      retryAfterSeconds: secondsUntilUtcMidnight(),
      detail: `Daily limit reached for ${functionName} (${cap})`,
    };
  }
  return { ok: true };
}

/**
 * Run global spend + optional per-user daily op caps. Fail-closed on ledger errors.
 */
export async function enforcePaidBudget(
  service: SupabaseClient,
  opts: { userId: string; functionName: string }
): Promise<BudgetResult> {
  const global = await checkGlobalDailySpendCap(service);
  if (!global.ok) return global;

  return checkUserDailyOpCap(service, opts.userId, opts.functionName);
}
