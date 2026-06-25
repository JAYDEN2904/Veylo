import React, { useState } from 'react';
import { View, Dimensions, Pressable, ScrollView, Platform, StatusBar } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import type {
  OnboardingQuizAnswers,
  StyleArchetype,
  ColourPreference,
  LifestyleType,
  ClimateZone,
  PrimaryGoal,
} from '../../types';

const { width } = Dimensions.get('window');

// ── Question definitions ────────────────────────────────────────────────────

interface QuizOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

interface QuizQuestion {
  key: keyof OnboardingQuizAnswers;
  title: string;
  subtitle: string;
  multi: boolean;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    key: 'styleArchetype',
    title: 'Which best describes your style?',
    subtitle: 'Pick the vibe that feels most like you',
    multi: false,
    options: [
      {
        id: 'minimal',
        label: 'Minimal',
        description: 'Clean lines, neutral tones, less is more',
        icon: 'remove-outline',
      },
      {
        id: 'bold',
        label: 'Bold',
        description: 'Statement pieces, strong colours, heads turn',
        icon: 'flash-outline',
      },
      {
        id: 'eclectic',
        label: 'Eclectic',
        description: 'Mix textures, eras, and unexpected combos',
        icon: 'shuffle-outline',
      },
    ],
  },
  {
    key: 'colourPreference',
    title: 'What colours do you gravitate toward?',
    subtitle: 'Your natural colour language',
    multi: false,
    options: [
      {
        id: 'neutrals',
        label: 'Neutrals',
        description: 'White, black, grey, navy',
        icon: 'ellipse-outline',
      },
      {
        id: 'earth_tones',
        label: 'Earth tones',
        description: 'Brown, tan, olive, rust',
        icon: 'leaf-outline',
      },
      {
        id: 'brights',
        label: 'Brights',
        description: 'Vivid reds, blues, yellows',
        icon: 'sunny-outline',
      },
      {
        id: 'pastels',
        label: 'Pastels',
        description: 'Soft blush, mint, lavender',
        icon: 'flower-outline',
      },
      {
        id: 'monochrome',
        label: 'Monochrome',
        description: 'Head-to-toe one colour',
        icon: 'contrast-outline',
      },
    ],
  },
  {
    key: 'lifestyle',
    title: 'What does your average day look like?',
    subtitle: 'Helps us match your wardrobe to your reality',
    multi: false,
    options: [
      {
        id: 'casual',
        label: 'Casual & relaxed',
        description: 'Weekends, errands, hanging out',
        icon: 'cafe-outline',
      },
      {
        id: 'professional',
        label: 'Office & meetings',
        description: 'Work, events, and polished occasions',
        icon: 'briefcase-outline',
      },
      {
        id: 'active',
        label: 'Always on the move',
        description: 'Gym, travel, outdoor activities',
        icon: 'fitness-outline',
      },
    ],
  },
  {
    key: 'climateZone',
    title: 'Where do you live?',
    subtitle: 'So we can suggest weather-smart outfits',
    multi: false,
    options: [
      {
        id: 'tropical',
        label: 'Tropical',
        description: 'Hot and humid year-round',
        icon: 'sunny-outline',
      },
      {
        id: 'temperate',
        label: 'Temperate',
        description: 'Four seasons with mild extremes',
        icon: 'partly-sunny-outline',
      },
      {
        id: 'cold',
        label: 'Cold',
        description: 'Winters that require serious layering',
        icon: 'snow-outline',
      },
      {
        id: 'arid',
        label: 'Arid / dry heat',
        description: 'Dry and warm, low humidity',
        icon: 'flame-outline',
      },
    ],
  },
  {
    key: 'categoryInclusions',
    title: "What's in your wardrobe?",
    subtitle: 'Select everything that applies',
    multi: true,
    options: [
      {
        id: 'tops',
        label: 'Tops',
        description: 'T-shirts, blouses, shirts',
        icon: 'shirt-outline',
      },
      {
        id: 'bottoms',
        label: 'Bottoms',
        description: 'Trousers, jeans, skirts',
        icon: 'layers-outline',
      },
      {
        id: 'dresses',
        label: 'Dresses & jumpsuits',
        description: 'One-piece outfits',
        icon: 'body-outline',
      },
      {
        id: 'outerwear',
        label: 'Outerwear',
        description: 'Jackets, coats, blazers',
        icon: 'umbrella-outline',
      },
      {
        id: 'shoes',
        label: 'Shoes',
        description: 'Trainers, heels, boots',
        icon: 'footsteps-outline',
      },
      {
        id: 'accessories',
        label: 'Accessories',
        description: 'Bags, jewellery, hats',
        icon: 'bag-outline',
      },
    ],
  },
  {
    key: 'primaryGoal',
    title: "What's your main goal with Veylo?",
    subtitle: "We'll tailor everything to match",
    multi: false,
    options: [
      {
        id: 'wear_more',
        label: 'Wear what I own',
        description: 'Get more from my existing wardrobe',
        icon: 'repeat-outline',
      },
      {
        id: 'buy_less',
        label: 'Buy less',
        description: 'Be more intentional about shopping',
        icon: 'ban-outline',
      },
      {
        id: 'look_polished',
        label: 'Look more polished',
        description: 'Consistently pull better outfits',
        icon: 'ribbon-outline',
      },
      {
        id: 'save_time',
        label: 'Save time',
        description: 'Stop the 20-minute getting-dressed spiral',
        icon: 'time-outline',
      },
      {
        id: 'express_myself',
        label: 'Express myself',
        description: 'Use fashion as a form of self-expression',
        icon: 'color-palette-outline',
      },
    ],
  },
];

const TOTAL = QUESTIONS.length;

// ── Component ───────────────────────────────────────────────────────────────

export const StyleQuizScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { currentTheme, mode } = useThemeStore();
  const { answers, setAnswer } = useOnboardingStore();
  const [step, setStep] = useState(0);
  const question = QUESTIONS[step];

  const currentAnswers: string | string[] | undefined = answers[question.key] as
    | string
    | string[]
    | undefined;

  const isOptionSelected = (id: string): boolean => {
    if (question.multi) {
      return Array.isArray(currentAnswers) && currentAnswers.includes(id);
    }
    return currentAnswers === id;
  };

  const handleSelect = (id: string) => {
    if (question.multi) {
      const prev = Array.isArray(currentAnswers) ? currentAnswers : [];
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setAnswer('categoryInclusions', next);
    } else {
      switch (question.key) {
        case 'styleArchetype':
          setAnswer('styleArchetype', id as StyleArchetype);
          break;
        case 'colourPreference':
          setAnswer('colourPreference', id as ColourPreference);
          break;
        case 'lifestyle':
          setAnswer('lifestyle', id as LifestyleType);
          break;
        case 'climateZone':
          setAnswer('climateZone', id as ClimateZone);
          break;
        case 'primaryGoal':
          setAnswer('primaryGoal', id as PrimaryGoal);
          break;
        default:
          break;
      }
      // Auto-advance for single-select after a short delay
      setTimeout(() => handleNext(id), 160);
    }
  };

  const canAdvance = (): boolean => {
    if (question.multi) {
      return Array.isArray(currentAnswers) && currentAnswers.length > 0;
    }
    return currentAnswers != null;
  };

  const handleNext = (selectedId?: string) => {
    const answeredKey = question.key;
    const answeredValue = selectedId ?? currentAnswers;
    if (answeredValue == null && !question.multi) return;

    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
    } else {
      // Quiz complete — derive the answers and go to reveal
      const finalAnswers = {
        ...answers,
        ...(answeredKey && answeredValue != null ? { [answeredKey]: answeredValue } : {}),
      };
      navigation.navigate('StyleDnaReveal', { answers: finalAnswers });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      navigation.goBack();
    }
  };

  const progress = (step + 1) / TOTAL;

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </Pressable>
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {step + 1} / {TOTAL}
          </Typography>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: currentTheme.colors.border,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 2,
              backgroundColor: currentTheme.colors.primary,
              width: `${progress * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Question */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 100 : 80),
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={`title-${step}`}
          entering={FadeInRight.duration(280)}
          exiting={FadeOutLeft.duration(200)}
        >
          <Typography
            variant="header"
            style={{
              color: currentTheme.colors.text,
              fontSize: 26,
              fontWeight: '800',
              lineHeight: 32,
              marginBottom: 8,
              marginTop: 4,
            }}
          >
            {question.title}
          </Typography>
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 14,
              marginBottom: 28,
            }}
          >
            {question.subtitle}
          </Typography>
        </Animated.View>

        <Animated.View
          key={`opts-${step}`}
          entering={FadeInDown.duration(300).delay(80)}
          style={{ gap: 12 }}
        >
          {question.options.map((opt) => {
            const selected = isOptionSelected(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                accessibilityRole={question.multi ? 'checkbox' : 'radio'}
                accessibilityState={{ selected }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 18,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: selected ? currentTheme.colors.primary : currentTheme.colors.border,
                  backgroundColor: selected
                    ? `${currentTheme.colors.primary}10`
                    : currentTheme.colors.surface,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: selected
                      ? currentTheme.colors.primary
                      : currentTheme.colors.mutedSurface,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={22}
                    color={selected ? '#FFF' : currentTheme.colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Typography
                    style={{
                      color: currentTheme.colors.text,
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    {opt.label}
                  </Typography>
                  <Typography
                    style={{
                      color: currentTheme.colors.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {opt.description}
                  </Typography>
                </View>
                {selected && (
                  <Ionicons
                    name={question.multi ? 'checkmark-circle' : 'radio-button-on'}
                    size={22}
                    color={currentTheme.colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA — shown only for multi-select questions */}
      {question.multi && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 16),
            left: 20,
            right: 20,
          }}
        >
          <Pressable
            onPress={() => handleNext()}
            disabled={!canAdvance()}
            style={{
              backgroundColor: canAdvance()
                ? currentTheme.colors.primary
                : currentTheme.colors.border,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Typography
              style={{
                color: canAdvance() ? '#FFF' : currentTheme.colors.textSecondary,
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              Continue →
            </Typography>
          </Pressable>
        </View>
      )}
    </View>
  );
};
