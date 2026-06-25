import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type Provider = 'openai' | 'replicate' | 'openweather' | 'internal' | 'google';

export interface UsageRecord {
  user_id: string | null;
  function_name: string;
  provider: Provider;
  units?: number;
  cost_usd?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort usage logging. Failures must never break the function flow,
 * so we only log to console on error.
 */
export async function logUsage(service: SupabaseClient, record: UsageRecord): Promise<void> {
  const { error } = await service.from('api_usage').insert({
    user_id: record.user_id,
    function_name: record.function_name,
    provider: record.provider,
    units: record.units ?? 1,
    cost_usd: record.cost_usd ?? 0,
    metadata: record.metadata ?? {},
  });
  if (error) {
    console.error('[usage]', record.function_name, error.message);
  }
}
