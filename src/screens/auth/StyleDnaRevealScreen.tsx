import React, { useEffect, useRef } from 'react';
import { View, Platform, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { deriveStyleDnaLabel, getStyleDnaDescription } from '../../utils/styleDna';
import type { OnboardingQuizAnswers } from '../../types';

export const StyleDnaRevealScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useThemeStore();
  const { answers: storedAnswers, setAnswer } = useOnboardingStore();

  const passedAnswers: Partial<OnboardingQuizAnswers> = route?.params?.answers ?? storedAnswers;
  const dnaLabel = deriveStyleDnaLabel(passedAnswers);
  const dnaDescription = getStyleDnaDescription(dnaLabel);

  const scale = useSharedValue(0.6);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    // Persist the dna label into the onboarding answers store
    if (passedAnswers.styleArchetype) {
      setAnswer('styleArchetype', passedAnswers.styleArchetype);
    }
    if (passedAnswers.lifestyle) {
      setAnswer('lifestyle', passedAnswers.lifestyle);
    }
  }, []);

  const handleSave = () => {
    navigation.navigate('Signup');
  };

  const handleSkip = () => {
    navigation.navigate('Signup');
  };

  const traits = buildTraits(passedAnswers);

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <LinearGradient
        colors={[currentTheme.colors.background, `${currentTheme.colors.primary}22`]}
        style={{ flex: 1 }}
      >
        {/* Close / skip */}
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
          {/* DNA Badge */}
          <Animated.View style={cardStyle}>
            <Animated.View entering={FadeIn.duration(400)}>
              <LinearGradient
                colors={[currentTheme.colors.primary, currentTheme.colors.secondary ?? '#C4A962']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 32,
                  alignSelf: 'center',
                  shadowColor: currentTheme.colors.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 12,
                }}
              >
                <Typography style={{ fontSize: 48 }}>✦</Typography>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            style={{ alignItems: 'center' }}
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

            {/* Trait chips */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                marginBottom: 48,
              }}
            >
              {traits.map((trait) => (
                <View
                  key={trait}
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
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Bottom CTA */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={{
            paddingHorizontal: 28,
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 24 : 20),
          }}
        >
          <Pressable
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
            <Ionicons name="lock-closed-outline" size={18} color="#FFF" />
            <Typography style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>
              Save Your Style DNA
            </Typography>
          </Pressable>

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
