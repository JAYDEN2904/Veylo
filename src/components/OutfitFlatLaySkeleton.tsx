import React, { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/useThemeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OutfitFlatLaySkeletonProps {
  width?: number;
  /** Approximate item count for layout (defaults to 2-column hero). */
  itemCount?: number;
}

/**
 * Shimmer skeleton matching OutfitFlatLay geometry — used while generating today's look.
 */
export const OutfitFlatLaySkeleton: React.FC<OutfitFlatLaySkeletonProps> = ({
  width,
  itemCount = 2,
}) => {
  const { currentTheme } = useThemeStore();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [shimmer]);

  const containerWidth = width ?? SCREEN_WIDTH - 40;
  const gap = 12;
  const columns = itemCount <= 2 ? Math.max(itemCount, 1) : 2;
  const tileWidth = (containerWidth - gap * (columns - 1)) / columns;
  const tileHeight = itemCount <= 2 ? tileWidth * 1.4 : tileWidth * 1.25;
  const tiles = Array.from({ length: Math.max(itemCount, 2) }, (_, i) => i);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (shimmer.value * 2 - 1) * (tileWidth + 40) }],
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: containerWidth,
        gap,
      }}
      accessibilityLabel="Putting together a look"
    >
      {tiles.map((index) => (
        <View
          key={index}
          style={{
            width: tileWidth,
            height: tileHeight,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: currentTheme.colors.mutedSurface,
          }}
        >
          <Animated.View
            style={[{ position: 'absolute', top: 0, bottom: 0, width: tileWidth }, sweepStyle]}
          >
            <LinearGradient
              colors={['transparent', currentTheme.colors.surface + 'AA', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1, width: tileWidth * 0.55 }}
            />
          </Animated.View>
        </View>
      ))}
    </View>
  );
};
