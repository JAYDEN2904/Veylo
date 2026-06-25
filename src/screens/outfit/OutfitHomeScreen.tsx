import React, { useState } from 'react';
import { TouchableOpacity, RefreshControl, View, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Screen,
  Typography,
  StyledView,
  StyledImage,
  PrimaryButton,
} from '../../components/common';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useThemeStore } from '../../store/useThemeStore';
import { EmptyStates } from '../../components/EmptyState';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common';
import { Accessibility } from '../../utils/accessibility';
import type { OutfitStackScreenProps } from '../../navigation/screenProps';
import type { Outfit } from '../../types';

type Props = OutfitStackScreenProps<'OutfitHome'>;

export const OutfitHomeScreen = ({ navigation }: Props) => {
  const tabPad = useTabScreenPadding();
  const { currentTheme } = useThemeStore();
  const rootNavigation = navigation.getParent()?.getParent();
  const goRoot = (name: string, params?: object) => {
    (rootNavigation as { navigate: (n: string, p?: object) => void } | undefined)?.navigate(
      name,
      params
    );
  };
  const { outfits, favorites, isGenerating, toggleFavorite } = useOutfitStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleGenerateOutfit = () => {
    goRoot('GenerateOutfitFlow');
  };

  const renderOutfitCard = (item: Outfit, index: number) => (
    <Animated.View key={item.id} entering={FadeInDown.duration(400).delay(index * 100)}>
      <Card
        onPress={() => goRoot('OutfitResult', { outfitId: item.id })}
        style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}
      >
        <StyledView style={{ flexDirection: 'row', height: 120 }}>
          {item.items?.slice(0, 3).map((outfitItem, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                borderRightWidth: i < 2 ? 1 : 0,
                borderRightColor: currentTheme.colors.border,
              }}
            >
              <StyledImage
                source={{ uri: outfitItem.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          ))}
        </StyledView>
        <StyledView style={{ padding: 16 }}>
          <StyledView
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography
              style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 17 }}
            >
              {item.occasion || 'Casual Outfit'}
            </Typography>
            <TouchableOpacity
              onPress={() => toggleFavorite(item.id)}
              accessibilityRole="button"
              accessibilityLabel={
                item.favorite
                  ? Accessibility.labels.unfavoriteButton
                  : Accessibility.labels.favoriteButton
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name={item.favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={
                  item.favorite ? currentTheme.colors.error : currentTheme.colors.textSecondary
                }
              />
            </TouchableOpacity>
          </StyledView>
          {item.tags && item.tags.length > 0 && (
            <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <StyledView
                  key={i}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: currentTheme.colors.mutedSurface,
                  }}
                >
                  <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 11 }}>
                    {tag}
                  </Typography>
                </StyledView>
              ))}
            </StyledView>
          )}
        </StyledView>
      </Card>
    </Animated.View>
  );

  return (
    <Screen>
      <StyledView style={{ padding: 24, paddingTop: tabPad.paddingTop }}>
        <Typography
          variant="header"
          style={{
            color: currentTheme.colors.text,
            fontSize: 34,
            fontWeight: '700',
            marginBottom: 4,
          }}
        >
          Outfits
        </Typography>
        <Typography
          style={{ color: currentTheme.colors.textSecondary, fontSize: 16, marginBottom: 24 }}
        >
          Discover AI-powered outfit suggestions
        </Typography>

        <PrimaryButton
          title={isGenerating ? 'Generating...' : 'Generate Outfit'}
          onPress={handleGenerateOutfit}
          disabled={isGenerating}
          loading={isGenerating}
          icon="flash"
          accessibilityLabel={Accessibility.labels.generateOutfitButton}
          style={{ marginBottom: 24 }}
        />

        <StyledView style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => goRoot('OutfitFavorites')}
            accessibilityRole="button"
            accessibilityLabel="View favorite outfits"
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              backgroundColor: currentTheme.colors.surface,
              borderWidth: 1,
              borderColor: currentTheme.colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="heart"
              size={24}
              color={currentTheme.colors.error}
              style={{ marginBottom: 8 }}
            />
            <Typography
              style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 13 }}
            >
              Favorites
            </Typography>
            <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 11 }}>
              {favorites.length}
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => goRoot('CreateOutfit')}
            accessibilityRole="button"
            accessibilityLabel="Create outfit manually"
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              backgroundColor: currentTheme.colors.surface,
              borderWidth: 1,
              borderColor: currentTheme.colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="create-outline"
              size={24}
              color={currentTheme.colors.accent}
              style={{ marginBottom: 8 }}
            />
            <Typography
              style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 13 }}
            >
              Create
            </Typography>
            <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 11 }}>
              Manual
            </Typography>
          </TouchableOpacity>
        </StyledView>

        <TouchableOpacity
          onPress={() => goRoot('CalendarHome')}
          accessibilityRole="button"
          accessibilityLabel={Accessibility.labels.addToCalendarButton}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderRadius: 16,
            backgroundColor: currentTheme.colors.surface,
            borderWidth: 1,
            borderColor: currentTheme.colors.border,
            marginBottom: 24,
            gap: 10,
          }}
        >
          <Ionicons name="calendar-outline" size={22} color={currentTheme.colors.primary} />
          <Typography style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 13 }}>
            Outfit calendar
          </Typography>
        </TouchableOpacity>
      </StyledView>

      {/* Outfits list — ScrollView instead of FlatList: RN FlatList _checkProps / getItem crash when tab mounts lazily (same as Wardrobe). */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: tabPad.paddingBottom,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme.colors.primary}
          />
        }
      >
        {outfits.length === 0 ? (
          <EmptyStates.Outfits onCreate={handleGenerateOutfit} />
        ) : (
          outfits.map((item, index) => renderOutfitCard(item, index))
        )}
      </ScrollView>
    </Screen>
  );
};
