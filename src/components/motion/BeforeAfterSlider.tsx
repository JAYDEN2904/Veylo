import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { useThemeStore } from '../../store/useThemeStore';
import { hapticService } from '../../utils/haptics';

interface BeforeAfterSliderProps {
  beforeUri: string;
  afterUri: string;
  height: number;
  width: number;
}

/**
 * Draggable before/after reveal for try-on results.
 * Left = original, right = AI try-on.
 */
export function BeforeAfterSlider({ beforeUri, afterUri, height, width }: BeforeAfterSliderProps) {
  const { currentTheme } = useThemeStore();
  const split = useSharedValue(width * 0.55);
  const startX = useSharedValue(width * 0.55);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = split.value;
    })
    .onUpdate((event) => {
      'worklet';
      const next = startX.value + event.translationX;
      split.value = Math.min(width - 24, Math.max(24, next));
    })
    .onEnd(() => {
      'worklet';
      split.value = withSpring(split.value, { damping: 18, stiffness: 180 });
    });

  const afterClipStyle = useAnimatedStyle(() => ({
    width: split.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: split.value - 18 }],
  }));

  return (
    <View style={{ width, height, borderRadius: 24, overflow: 'hidden', backgroundColor: '#111' }}>
      <Image source={{ uri: afterUri }} style={StyleSheet.absoluteFill} contentFit="cover" />

      <Animated.View style={[{ height, overflow: 'hidden' }, afterClipStyle]}>
        <Image source={{ uri: beforeUri }} style={{ width, height }} contentFit="cover" />
      </Animated.View>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          backgroundColor: 'rgba(0,0,0,0.7)',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 14,
        }}
      >
        <Typography style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
          ORIGINAL
        </Typography>
      </View>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: currentTheme.colors.secondary,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 14,
        }}
      >
        <Typography style={{ color: currentTheme.colors.primary, fontSize: 11, fontWeight: '700' }}>
          TRY-ON
        </Typography>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          onTouchStart={() => hapticService.selection()}
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 36,
              alignItems: 'center',
              justifyContent: 'center',
            },
            handleStyle,
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: 'rgba(255,255,255,0.9)',
            }}
          />
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 6,
            }}
          >
            <Ionicons name="swap-horizontal" size={18} color="#111" />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
