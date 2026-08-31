import React, { useCallback } from 'react';
import {
  Pressable,
  type AccessibilityRole,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapticService } from '../utils/haptics';

const PRESS_IN_MS = 120;
const PRESS_OUT_MS = 160;
const PRESS_SCALE = 0.97;
const easeOut = Easing.out(Easing.cubic);

export type PressableScaleHaptic = 'selection' | 'light' | 'medium' | 'success' | 'none';

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. Default 0.97. */
  scaleTo?: number;
  /** Optional haptic on press-in. Default 'none'. */
  haptic?: PressableScaleHaptic;
  accessibilityRole?: AccessibilityRole;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function fireHaptic(kind: PressableScaleHaptic): void {
  switch (kind) {
    case 'selection':
      hapticService.selection();
      break;
    case 'light':
      hapticService.light();
      break;
    case 'medium':
      hapticService.medium();
      break;
    case 'success':
      hapticService.success();
      break;
    case 'none':
      break;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Pressable with Emil-style scale feedback (0.97 / 120ms ease-out).
 * Use for buttons, chips, and selectable cards.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = PRESS_SCALE,
  haptic = 'none',
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withTiming(scaleTo, { duration: PRESS_IN_MS, easing: easeOut });
        if (haptic !== 'none') fireHaptic(haptic);
      }
      onPressIn?.(event);
    },
    [disabled, haptic, onPressIn, scale, scaleTo]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withTiming(1, { duration: PRESS_OUT_MS, easing: easeOut });
      onPressOut?.(event);
    },
    [onPressOut, scale]
  );

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
};
