import { getSupabase, isSupabaseConfigured } from './supabase';
import type { OnboardingQuizAnswers } from '../types';
import { deriveStyleDnaLabel } from '../utils/styleDna';

/**
 * Upserts the user's style profile from onboarding quiz answers into
 * the `style_profiles` table. Best-effort — remote errors are logged
 * but not thrown so the auth flow is never blocked.
 */
export async function upsertStyleProfile(
  userId: string,
  answers: Partial<OnboardingQuizAnswers>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const supabase = getSupabase();
  if (!supabase) return true;

  try {
    const dnaLabel = deriveStyleDnaLabel(answers);

    const row: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (answers.styleArchetype != null) row.style_archetype = answers.styleArchetype;
    if (answers.colourPreference != null) row.colour_preference = answers.colourPreference;
    if (answers.lifestyle != null) row.lifestyle_type = answers.lifestyle;
    if (answers.climateZone != null) row.climate_zone = answers.climateZone;
    if (answers.categoryInclusions != null) row.category_inclusions = answers.categoryInclusions;
    if (answers.primaryGoal != null) row.primary_goal = answers.primaryGoal;
    row.style_dna_label = dnaLabel;

    const { error } = await supabase.from('style_profiles').upsert(row, { onConflict: 'user_id' });

    if (error) {
      if (__DEV__) console.error('[styleProfileService] upsertStyleProfile', error);
      return false;
    }
    return true;
  } catch (err) {
    if (__DEV__) console.error('[styleProfileService] unexpected', err);
    return false;
  }
}
