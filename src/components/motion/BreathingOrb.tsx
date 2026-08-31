import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Canvas, Circle, RadialGradient, vec, BlurMask } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from '../common';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BreathingOrbProps {
  size?: number;
  primaryColor: string;
  secondaryColor: string;
  symbol?: string;
}

/**
 * Fashion-editorial DNA orb: spring entrance + slow breathe + soft Skia glow.
 */
export function BreathingOrb({
  size = 120,
  primaryColor,
  secondaryColor,
  symbol = '✦',
}: BreathingOrbProps) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(0.6);
  const breathe = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    entrance.value = withDelay(160, withSpring(1, { damping: 12, stiffness: 100 }));
    if (reducedMotion) {
      breathe.value = 1;
      shimmer.value = 0.35;
      return;
    }
    breathe.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    shimmer.value = withDelay(
      400,
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(0.25, { duration: 600 })
      )
    );
  }, [breathe, entrance, reducedMotion, shimmer]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entrance.value * breathe.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + shimmer.value * 0.35,
    transform: [{ scale: 1.15 + shimmer.value * 0.1 }],
  }));

  const canvasSize = size * 1.45;

  return (
    <View
      style={{
        width: canvasSize,
        height: canvasSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: canvasSize,
            height: canvasSize,
          },
          glowStyle,
        ]}
      >
        <Canvas style={{ width: canvasSize, height: canvasSize }}>
          <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={size * 0.62}>
            <RadialGradient
              c={vec(canvasSize / 2, canvasSize / 2)}
              r={size * 0.7}
              colors={[`${secondaryColor}AA`, `${primaryColor}55`, 'transparent']}
            />
            <BlurMask blur={18} style="normal" />
          </Circle>
        </Canvas>
      </Animated.View>

      <Animated.View style={containerStyle}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: primaryColor,
            shadowColor: primaryColor,
            shadowOpacity: 0.45,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        >
          <Canvas style={{ position: 'absolute', width: size, height: size }}>
            <Circle cx={size / 2} cy={size / 2} r={size / 2}>
              <RadialGradient
                c={vec(size * 0.35, size * 0.3)}
                r={size * 0.85}
                colors={[secondaryColor, primaryColor, '#0a0a0a']}
              />
            </Circle>
          </Canvas>
          <Typography style={{ fontSize: size * 0.4, color: '#FFFFFF', zIndex: 1 }}>
            {symbol}
          </Typography>
        </View>
      </Animated.View>
    </View>
  );
}
