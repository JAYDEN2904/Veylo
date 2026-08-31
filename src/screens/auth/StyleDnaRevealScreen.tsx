import React, { useEffect } from 'react';
import { View, Platform, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../../components/common';
import { PressableScale } from '../../components/PressableScale';
import { BreathingOrb } from '../../components/motion/BreathingOrb';
import { useThemeStore } from '../../store/useThemeStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { deriveStyleDnaLabel, getStyleDnaDescription } from '../../utils/styleDna';
import type { OnboardingQuizAnswers } from '../../types';

export const StyleDnaRevealScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useThemeStore();
  const reducedMotion = useReducedMotion();
  const { answers: storedAnswers, setAnswer } = useOnboardingStore();

  const passedAnswers: Partial<OnboardingQuizAnswers> = route?.params?.answers ?? storedAnswers;
  const dnaLabel = deriveStyleDnaLabel(passedAnswers);
  const dnaDescription = getStyleDnaDescription(dnaLabel);
  const traits = buildTraits(passedAnswers);

  useEffect(() => {
    if (passedAnswers.styleArchetype) {
      setAnswer('styleArchetype', passedAnswers.styleArchetype);
    }
    if (passedAnswers.lifestyle) {
      setAnswer('lifestyle', passedAnswers.lifestyle);
    }
  }, [passedAnswers.lifestyle, passedAnswers.styleArchetype, setAnswer]);

  const handleSave = () => {
    navigation.navigate('Signup');
  };

  const handleSkip = () => {
    navigation.navigate('Signup');
  };

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <LinearGradient
        colors={[currentTheme.colors.background, `${currentTheme.colors.primary}22`]}
        style={{ flex: 1 }}
      >
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 20,
            zIndex: 10,
          }}
          accessibilityLabel="Skip"
        >
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            Skip
          </Typography>
        </Pressable>

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(400)}>
            <BreathingOrb
              size={128}
              primaryColor={currentTheme.colors.primary}
              secondaryColor={currentTheme.colors.secondary}
            />
          </Animated.View>

          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(420).delay(280)}
            style={{ alignItems: 'center', marginTop: 28 }}
          >
            <Typography
              style={{
                color: currentTheme.colors.textSecondary,
                fontSize: 12,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: '700',
                marginBottom: 10,
              }}
            >
              Your Style DNA
            </Typography>
            <Typography
              variant="header"
              style={{
                color: currentTheme.colors.text,
                fontSize: 30,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: 36,
                marginBottom: 16,
              }}
            >
              {dnaLabel}
            </Typography>
            <Typography
              style={{
                color: currentTheme.colors.textSecondary,
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
                maxWidth: 300,
                marginBottom: 36,
              }}
            >
              {dnaDescription}
            </Typography>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                marginBottom: 48,
              }}
            >
              {traits.map((trait, index) => (
                <Animated.View
                  key={trait}
                  entering={
                    reducedMotion
                      ? undefined
                      : ZoomIn.duration(320)
                          .delay(420 + index * 90)
                          .springify()
                  }
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: `${currentTheme.colors.primary}18`,
                    borderWidth: 1,
                    borderColor: `${currentTheme.colors.primary}40`,
                  }}
                >
                  <Typography
                    style={{
                      color: currentTheme.colors.primary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {trait}
                  </Typography>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        </View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(400).delay(560)}
          style={{
            paddingHorizontal: 28,
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 24 : 20),
          }}
        >
          <PressableScale
            haptic="medium"
            onPress={handleSave}
            style={{
              backgroundColor: currentTheme.colors.primary,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              shadowColor: currentTheme.colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
            accessibilityLabel="Save your Style DNA and create account"
          >
            <Ionicons name="lock-closed-outline" size={18} color={currentTheme.colors.onPrimary} />
            <Typography
              style={{ color: currentTheme.colors.onPrimary, fontSize: 17, fontWeight: '700' }}
            >
              Save Your Style DNA
            </Typography>
          </PressableScale>

          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 12,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            Create a free account to unlock your personalised wardrobe
          </Typography>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

function buildTraits(answers: Partial<OnboardingQuizAnswers>): string[] {
  const traits: string[] = [];
  if (answers.styleArchetype) {
    traits.push(
      answers.styleArchetype === 'minimal'
        ? 'Minimalist'
        : answers.styleArchetype === 'bold'
          ? 'Statement dresser'
          : 'Eclectic'
    );
  }
  if (answers.colourPreference) {
    const colourMap: Record<string, string> = {
      neutrals: 'Neutral palette',
      earth_tones: 'Earth tones',
      brights: 'Vivid colours',
      pastels: 'Soft pastels',
      monochrome: 'Monochrome',
    };
    traits.push(colourMap[answers.colourPreference] ?? answers.colourPreference);
  }
  if (answers.climateZone) {
    const climateMap: Record<string, string> = {
      tropical: 'Tropical climate',
      temperate: 'Four seasons',
      cold: 'Cold weather',
      arid: 'Dry heat',
    };
    traits.push(climateMap[answers.climateZone] ?? answers.climateZone);
  }
  if (answers.primaryGoal) {
    const goalMap: Record<string, string> = {
      wear_more: 'Maximise wardrobe',
      buy_less: 'Intentional shopper',
      look_polished: 'Always polished',
      save_time: 'Efficiency seeker',
      express_myself: 'Self-expression',
    };
    traits.push(goalMap[answers.primaryGoal] ?? answers.primaryGoal);
  }
  return traits;
}
