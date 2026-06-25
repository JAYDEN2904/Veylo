import React from 'react';
import { StyleProp, TouchableOpacity, View, ViewStyle, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/useThemeStore';
import type { ClothingItem } from '../types';

export interface ClothingTileProps {
  item: ClothingItem;
  onPress?: () => void;
  width?: number;
  height?: number;
  /** Show a gradient overlay with category + brand at the bottom of the tile. */
  showOverlay?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Canonical clothing thumbnail: 20px radius, contentFit "cover", theme-aware
 * shadow and surface. Used by wardrobe and outfit grids so they don't diverge.
 */
export const ClothingTile: React.FC<ClothingTileProps> = ({
  item,
  onPress,
  width,
  height,
  showOverlay = false,
  style,
  accessibilityLabel,
}) => {
  const { currentTheme, mode } = useThemeStore();
  const isDark = mode === 'dark';

  const tileStyle: ViewStyle = {
    width,
    height,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: currentTheme.colors.surface,
    shadowColor: currentTheme.colors.shadow ?? '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.35 : 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: isDark ? 1 : 0,
    borderColor: currentTheme.colors.border,
  };

  const inner = (
    <>
      <Image
        source={{ uri: item.imageUrl }}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: currentTheme.colors.mutedSurface,
        }}
        contentFit="cover"
      />
      {showOverlay ? (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 12,
            paddingBottom: 12,
            paddingTop: 32,
          }}
        >
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
            {item.category}
          </Text>
          <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {item.brand || 'No Brand'}
          </Text>
        </LinearGradient>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `View ${item.category}`}
        style={[tileStyle, style]}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={[tileStyle, style]}>{inner}</View>;
};
