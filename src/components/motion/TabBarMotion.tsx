import React, { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { hapticService } from '../../utils/haptics';

interface AnimatedTabIconProps {
  name: string;
  focused: boolean;
  color: string;
  size?: number;
}

/**
 * Tab icon that springs slightly when becoming focused.
 */
export function AnimatedTabIcon({ name, focused, color, size = 24 }: AnimatedTabIconProps) {
  const scale = useSharedValue(1);
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (focused && !wasFocused.current) {
      hapticService.selection();
      scale.value = withSequence(
        withSpring(1.18, { damping: 12, stiffness: 220 }),
        withSpring(1, { damping: 14, stiffness: 180 })
      );
    }
    wasFocused.current = focused;
  }, [focused, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={name as never} size={size} color={color} />
    </Animated.View>
  );
}

interface CameraFabProps {
  backgroundColor: string;
  iconColor: string;
  focused: boolean;
}

/**
 * Raised camera FAB with a slow idle pulse when not reduced-motion.
 */
export function CameraFab({ backgroundColor, iconColor, focused }: CameraFabProps) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const pressScale = useSharedValue(1);
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (reducedMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [pulse, reducedMotion]);

  useEffect(() => {
    if (focused && !wasFocused.current) {
      hapticService.medium();
      pressScale.value = withSequence(
        withSpring(1.08, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 14, stiffness: 180 })
      );
    }
    wasFocused.current = focused;
  }, [focused, pressScale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value * pressScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: -32,
          shadowColor: backgroundColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
      accessibilityRole="button"
    >
      <Ionicons name="camera" size={28} color={iconColor} />
    </Animated.View>
  );
}
