import React, { useEffect } from 'react';
import { View, Dimensions, ImageBackground } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Typography,
  StyledView,
  StyledTouchableOpacity,
  PrimaryButton,
} from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const WELCOME_HERO = require('../../../assets/marketing/welcome-hero.jpg');

const HEADLINE_LINES = ['Your closet.', 'Your style.', 'Unlocked.'];

export const WelcomeCarouselScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useThemeStore();
  const reducedMotion = useReducedMotion();

  const kenBurns = useSharedValue(1);
  const underlineWidth = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      kenBurns.value = 1.05;
      underlineWidth.value = 1;
      return;
    }
    kenBurns.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    underlineWidth.value = withDelay(
      900,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
    );
  }, [kenBurns, reducedMotion, underlineWidth]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: kenBurns.value }],
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    width: underlineWidth.value * 140,
    opacity: underlineWidth.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.primary }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[{ flex: 1, width, height }, heroStyle]}>
          <ImageBackground
            source={WELCOME_HERO}
            style={{ flex: 1, width, height }}
            resizeMode="cover"
          />
        </Animated.View>
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(26,28,30,0.25)', 'rgba(26,28,30,0.92)', '#1A1C1E']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.65,
          padding: 28,
          paddingBottom: insets.bottom + 40,
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ marginBottom: 14 }}>
          {HEADLINE_LINES.map((line, index) => {
            const isLast = index === HEADLINE_LINES.length - 1;
            return (
              <Animated.View
                key={line}
                entering={
                  reducedMotion ? undefined : FadeInDown.duration(480).delay(120 + index * 140)
                }
              >
                <Typography
                  variant="header"
                  style={{
                    fontSize: 42,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    lineHeight: 48,
                    letterSpacing: -0.5,
                    textShadowColor: 'rgba(0,0,0,0.4)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 8,
                  }}
                >
                  {line}
                </Typography>
                {isLast && (
                  <Animated.View
                    style={[
                      {
                        height: 3,
                        marginTop: 6,
                        borderRadius: 2,
                        backgroundColor: currentTheme.colors.secondary,
                      },
                      underlineStyle,
                    ]}
                  />
                )}
              </Animated.View>
            );
          })}
        </View>

        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(450).delay(560)}>
          <Typography
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 16,
              lineHeight: 24,
              fontWeight: '500',
              marginBottom: 36,
            }}
          >
            Discover the outfits hiding in your wardrobe — powered by AI.
          </Typography>
        </Animated.View>

        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(450).delay(680)}>
          <StyledView style={{ gap: 14 }}>
            <PrimaryButton
              title="Find My Style DNA →"
              onPress={() => navigation.navigate('StyleQuiz')}
              accessibilityLabel="Start style quiz"
            />

            <StyledTouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{ paddingVertical: 8 }}
            >
              <Typography
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                Already have an account?{' '}
                <Typography
                  style={{
                    color: currentTheme.colors.secondary,
                    fontWeight: '700',
                    fontSize: 14,
                  }}
                >
                  Log In
                </Typography>
              </Typography>
            </StyledTouchableOpacity>
          </StyledView>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};
