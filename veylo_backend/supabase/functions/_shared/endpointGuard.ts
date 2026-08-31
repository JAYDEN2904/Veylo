import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { jsonResponse } from './cors.ts';
import {
  clientIpFromRequest,
  enforceUserAndIpRateLimit,
  type RateLimitResult,
} from './rateLimit.ts';
import { enforcePaidBudget, type BudgetResult } from './budget.ts';

export type GuardTier = 'strict' | 'moderate' | 'light' | 'paid_chat';

interface TierConfig {
  windowSeconds: number;
  maxPerUser: number;
  maxPerIp: number;
  failClosed: boolean;
  /** Run global spend + per-user daily op caps. */
  checkBudget: boolean;
}

const TIERS: Record<GuardTier, TierConfig> = {
  /** Vertex try-on / avatar — expensive. */
  strict: {
    windowSeconds: 60,
    maxPerUser: 3,
    maxPerIp: 6,
    failClosed: true,
    checkBudget: true,
  },
  /** Vision / embeddings / moderation — moderate cost. */
  moderate: {
    windowSeconds: 60,
    maxPerUser: 20,
    maxPerIp: 40,
    failClosed: true,
    checkBudget: true,
  },
  /** Chat / recommend — paid LLM, existing soft limits. */
  paid_chat: {
    windowSeconds: 60,
    maxPerUser: 20,
    maxPerIp: 40,
    failClosed: true,
    checkBudget: true,
  },
  /** Cheap / abuse-only limits. */
  light: {
    windowSeconds: 60,
    maxPerUser: 60,
    maxPerIp: 120,
    failClosed: false,
    checkBudget: false,
  },
};

/** Override recommend-items to keep its historical 30/min user limit. */
const FUNCTION_OVERRIDES: Record<string, Partial<TierConfig>> = {
  'recommend-items': { maxPerUser: 30, maxPerIp: 60 },
  'style-chat': { maxPerUser: 20, maxPerIp: 40 },
  'tag-item': { maxPerUser: 30, maxPerIp: 60 },
  'generate-embedding': { maxPerUser: 30, maxPerIp: 60 },
  'weather-enrich': { maxPerUser: 30, maxPerIp: 60 },
  'delete-account': { maxPerUser: 5, maxPerIp: 10, windowSeconds: 300 },
};

function rateLimitResponse(rl: RateLimitResult): Response {
  const message = rl.reason === 'unavailable' ? 'Rate limiter unavailable' : 'Rate limited';
  return jsonResponse({ error: message, retry_after: rl.retryAfterSeconds }, { status: 429 });
}

function budgetResponse(budget: BudgetResult): Response {
  return jsonResponse(
    {
      error: budget.detail ?? 'Daily budget exceeded',
      reason: budget.reason,
      retry_after: budget.retryAfterSeconds,
    },
    { status: 429 }
  );
}

/**
 * Shared entry gate for edge functions: user+IP rate limit, optional spend caps.
 * Returns a Response to return immediately, or null when the request may proceed.
 */
export async function guardEndpoint(
  req: Request,
  service: SupabaseClient,
  opts: {
    functionName: string;
    userId?: string | null;
    tier: GuardTier;
  }
): Promise<Response | null> {
  const base = TIERS[opts.tier];
  const override = FUNCTION_OVERRIDES[opts.functionName] ?? {};
  const config: TierConfig = { ...base, ...override };

  const ip = clientIpFromRequest(req);
  const rl = await enforceUserAndIpRateLimit(service, {
    functionName: opts.functionName,
    userId: opts.userId,
    ip,
    windowSeconds: config.windowSeconds,
    maxPerUser: config.maxPerUser,
    maxPerIp: config.maxPerIp,
    failClosed: config.failClosed,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  if (config.checkBudget && opts.userId) {
    const budget = await enforcePaidBudget(service, {
      userId: opts.userId,
      functionName: opts.functionName,
    });
    if (!budget.ok) return budgetResponse(budget);
  }

  return null;
}
