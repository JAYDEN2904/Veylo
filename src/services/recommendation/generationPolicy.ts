/**
 * When the local engine may call the legacy Edge assembler.
 * Typed failures (empty wardrobe, missing categories) must not fall through
 * to greedy Edge ranking — that would bypass Sprint 1–3.
 */
export type LocalGenerationOutcome = 'success' | 'typed_failure' | 'threw';

export function shouldAttemptEdgeFallback(
  outcome: LocalGenerationOutcome,
  supabaseConfigured: boolean
): boolean {
  return outcome === 'threw' && supabaseConfigured;
}
