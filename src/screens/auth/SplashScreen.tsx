import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../../components/common';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Fonts } from '../../theme/fonts';

const WORDMARK = 'VEYLO'.split('');

interface LetterProps {
  char: string;
  index: number;
  color: string;
  reducedMotion: boolean;
}

function SplashLetter({ char, index, color, reducedMotion }: LetterProps) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(180 + index * 70, withSpring(1, { damping: 14, stiffness: 120 }));
  }, [index, progress, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [18, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.85, 1]) },
    ],
  }));

  return (
    <Animated.Text
      style={[
        {
          color,
          fontFamily: Fonts.displayBold,
          fontSize: 56,
          letterSpacing: 8,
          fontWeight: '400',
        },
        style,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

/**
 * In-app animated splash — starts matching the native black/gold splash,
 * then staggers the wordmark and exits into Welcome with a soft fade-scale.
 */
export const SplashScreen = ({
  navigation,
}: {
  navigation: { replace: (name: string) => void };
}) => {
  const { isAuthenticated } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const reducedMotion = useReducedMotion();

  const bgScale = useSharedValue(1);
  const exitProgress = useSharedValue(0);
  const shimmerX = useSharedValue(-0.4);
  const taglineOpacity = useSharedValue(0);

  const finishAndNavigate = useCallback(() => {
    if (!isAuthenticated) {
      navigation.replace('Welcome');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    if (reducedMotion) {
      taglineOpacity.value = 1;
      const timer = setTimeout(finishAndNavigate, 400);
      return () => clearTimeout(timer);
    }

    bgScale.value = withTiming(1.08, {
      duration: 2800,
      easing: Easing.out(Easing.quad),
    });

    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));

    shimmerX.value = withDelay(
      550,
      withTiming(1.4, { duration: 900, easing: Easing.inOut(Easing.cubic) })
    );

    const exitDelayMs = 2100;
    exitProgress.value = withDelay(
      exitDelayMs,
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) {
            runOnJS(finishAndNavigate)();
          }
        })
      )
    );
  }, [bgScale, exitProgress, finishAndNavigate, reducedMotion, shimmerX, taglineOpacity]);

  const backgroundStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exitProgress.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(exitProgress.value, [0, 1], [1, 1.08]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerX.value, [-0.4, 1.4], [-120, 220]) }],
    opacity: interpolate(shimmerX.value, [-0.4, 0.2, 0.8, 1.4], [0, 0.55, 0.55, 0]),
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const gold = currentTheme.colors.secondary;

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle]}>
        <LinearGradient
          colors={['#0a0a0a', currentTheme.colors.primary, '#000000']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.wordmarkRow}>
          {WORDMARK.map((char, index) => (
            <SplashLetter
              key={`${char}-${index}`}
              char={char}
              index={index}
              color={gold}
              reducedMotion={reducedMotion}
            />
          ))}
          {!reducedMotion && (
            <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
        </View>

        <Animated.View
          style={taglineStyle}
          entering={reducedMotion ? undefined : FadeIn.delay(700)}
        >
          <Typography
            weight="500"
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 13,
              letterSpacing: 6,
              textAlign: 'center',
              marginTop: 18,
              textTransform: 'uppercase',
            }}
          >
            Smart Closet
          </Typography>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 56,
  },
});
