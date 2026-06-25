import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Typography, StyledView } from './commonPrimitives';
import { PrimaryButton, SecondaryButton } from './buttons';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: 'default' | 'compact';
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
}: EmptyStateProps) => {
  const { currentTheme } = useThemeStore();
  const padding = variant === 'compact' ? 24 : 40;

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding,
      }}
    >
      <View
        style={{
          width: variant === 'compact' ? 80 : 120,
          height: variant === 'compact' ? 80 : 120,
          borderRadius: variant === 'compact' ? 40 : 60,
          backgroundColor: currentTheme.colors.mutedSurface,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Ionicons
          name={icon as never}
          size={variant === 'compact' ? 40 : 60}
          color={currentTheme.colors.iconMuted}
        />
      </View>

      <Typography
        variant="header"
        style={{
          fontSize: variant === 'compact' ? 20 : 24,
          fontWeight: '700',
          color: currentTheme.colors.text,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        {title}
      </Typography>

      <Typography
        style={{
          fontSize: variant === 'compact' ? 14 : 16,
          color: currentTheme.colors.textSecondary,
          textAlign: 'center',
          lineHeight: variant === 'compact' ? 20 : 24,
          marginBottom: 32,
          maxWidth: 300,
        }}
      >
        {description}
      </Typography>

      {actionLabel && onAction && (
        <StyledView style={{ width: '100%', maxWidth: 280 }}>
          <PrimaryButton title={actionLabel} onPress={onAction} />
          {secondaryActionLabel && onSecondaryAction && (
            <View style={{ marginTop: 12 }}>
              <SecondaryButton title={secondaryActionLabel} onPress={onSecondaryAction} />
            </View>
          )}
        </StyledView>
      )}
    </Animated.View>
  );
};

export const EmptyStates = {
  Wardrobe: ({ onScan }: { onScan: () => void }) => (
    <EmptyState
      icon="shirt-outline"
      title="Your Wardrobe is Empty"
      description="Start building your digital wardrobe by scanning your clothes"
      actionLabel="Scan Your First Item"
      onAction={onScan}
    />
  ),

  Outfits: ({ onCreate }: { onCreate: () => void }) => (
    <EmptyState
      icon="flash-outline"
      title="No Outfits Yet"
      description="Let AI help you create stylish outfit combinations from your wardrobe"
      actionLabel="Generate Outfit"
      onAction={onCreate}
    />
  ),

  Favorites: ({ onBrowse }: { onBrowse: () => void }) => (
    <EmptyState
      icon="heart-outline"
      title="No Favorites Yet"
      description="Tap the heart icon on outfits and items you love to save them here"
      actionLabel="Browse Outfits"
      onAction={onBrowse}
    />
  ),

  Search: () => (
    <EmptyState
      icon="search-outline"
      title="No Results Found"
      description="Try adjusting your search or filters to find what you're looking for"
      variant="compact"
    />
  ),

  TryOnHistory: ({ onTryOn }: { onTryOn: () => void }) => (
    <EmptyState
      icon="images-outline"
      title="No Try-On History"
      description="Try on outfits to see how they look before you wear them"
      actionLabel="Try On an Outfit"
      onAction={onTryOn}
    />
  ),
};
