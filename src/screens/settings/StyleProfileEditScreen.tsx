import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Typography } from '../../components/common';
import { StyleQuizScreen } from '../auth/StyleQuizScreen';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { upsertStyleProfile } from '../../services/styleProfileService';
import { useStyleStore } from '../../store/useStyleStore';
import { getSupabase, isSupabaseConfigured } from '../../services/supabase';
import type { OnboardingQuizAnswers, StyleArchetype, StylePreference } from '../../types';

const ARCHETYPE_TO_PREFERENCES: Record<StyleArchetype, StylePreference[]> = {
  minimal: ['minimalist', 'casual'],
  bold: ['streetwear', 'formal'],
  eclectic: ['bohemian', 'vintage'],
};

function preferencesFromArchetype(archetype: StyleArchetype | undefined): StylePreference[] {
  if (!archetype) return ['casual'];
  return ARCHETYPE_TO_PREFERENCES[archetype] ?? ['casual'];
}

/** Post-onboarding style profile editor — reuses the 6-step quiz. */
export const StyleProfileEditScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { setAnswer, reset } = useOnboardingStore();
  const { initializeStyleProfile } = useStyleStore();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      reset();
      if (!isSupabaseConfigured() || !user?.id) {
        setLoading(false);
        return;
      }
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data } = await supabase
          .from('style_profiles')
          .select(
            'style_archetype, colour_preference, lifestyle_type, climate_zone, category_inclusions, primary_goal'
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          if (data.style_archetype) setAnswer('styleArchetype', data.style_archetype);
          if (data.colour_preference) setAnswer('colourPreference', data.colour_preference);
          if (data.lifestyle_type) setAnswer('lifestyle', data.lifestyle_type);
          if (data.climate_zone) setAnswer('climateZone', data.climate_zone);
          if (data.category_inclusions) setAnswer('categoryInclusions', data.category_inclusions);
          if (data.primary_goal) setAnswer('primaryGoal', data.primary_goal);
        }
      } catch (err) {
        if (__DEV__) console.warn('[StyleProfileEdit] load', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [reset, setAnswer, user?.id]);

  const handleComplete = async (quizAnswers: Partial<OnboardingQuizAnswers>) => {
    if (!user?.id) {
      navigation.goBack();
      return;
    }
    try {
      if (quizAnswers.styleArchetype) {
        initializeStyleProfile(preferencesFromArchetype(quizAnswers.styleArchetype));
      }
      await upsertStyleProfile(user.id, quizAnswers);
      Alert.alert(
        'Style profile updated',
        'Your preferences will shape future outfit suggestions.'
      );
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  if (loading) {
    return (
      <Screen className="bg-background justify-center items-center">
        <Typography className="text-gray-500">Loading your style profile…</Typography>
      </Screen>
    );
  }

  return (
    <StyleQuizScreen
      navigation={{ goBack: () => navigation.goBack(), navigate: () => undefined }}
      editMode
      onComplete={handleComplete}
    />
  );
};
