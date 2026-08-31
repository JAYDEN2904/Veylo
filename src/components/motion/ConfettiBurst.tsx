import React, { useEffect, useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useThemeStore } from '../../store/useThemeStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ParticleProps {
  delay: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

function Particle({ delay, startX, startY, endX, endY, color }: ParticleProps) {
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
    progress.value = withDelay(delay, withTiming(1, { duration: 1000 }));
    rotation.value = withDelay(delay, withTiming(Math.random() * 720 - 360, { duration: 1000 }));
  }, [delay, opacity, progress, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [startX, endX], Extrapolate.CLAMP);
    const translateY = interpolate(
      progress.value,
      [0, 0.4, 1],
      [startY, startY - 150, endY],
      Extrapolate.CLAMP
    );
    const scale = interpolate(progress.value, [0, 0.2, 1], [0, 1, 0.3], Extrapolate.CLAMP);
    const particleOpacity = interpolate(progress.value, [0.7, 1], [1, 0], Extrapolate.CLAMP);

    return {
      opacity: opacity.value * particleOpacity,
      transform: [{ translateX }, { translateY }, { scale }, { rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

interface ConfettiBurstProps {
  /** Vertical origin of the burst (defaults to mid-upper screen). */
  originY?: number;
  particleCount?: number;
}

/**
 * Short celebratory particle burst — reuse for wear-log success, save confirmation, etc.
 */
export function ConfettiBurst({
  originY = SCREEN_HEIGHT * 0.35,
  particleCount = 28,
}: ConfettiBurstProps) {
  const { currentTheme } = useThemeStore();

  const particles = useMemo(() => {
    const colors = [
      currentTheme.colors.secondary,
      '#FFD700',
      currentTheme.colors.accent,
      currentTheme.colors.success,
      '#F59E0B',
      '#EC4899',
    ];
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      delay: Math.random() * 200,
      startX: SCREEN_WIDTH / 2 - 5,
      startY: originY,
      endX: Math.random() * SCREEN_WIDTH,
      endY: originY + 80 + Math.random() * 220,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, [currentTheme.colors, originY, particleCount]);

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
    >
      {particles.map((particle) => (
        <Particle key={particle.id} {...particle} />
      ))}
    </View>
  );
}
