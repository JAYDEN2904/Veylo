import React, { useState, useCallback } from 'react';
import type { ListRenderItem } from 'react-native';
import { FlatList, TouchableOpacity, RefreshControl, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Screen,
  Typography,
  StyledView,
  StyledTouchableOpacity,
  StyledImage,
} from '../../components/common';
import { useOutfitStore } from '../../store/useOutfitStore';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common';
import type { RootStackScreenProps } from '../../navigation/screenProps';
import type { ClothingItem, Outfit } from '../../types';

const FAVORITE_ROW_HEIGHT = 220;

type Props = RootStackScreenProps<'OutfitFavorites'>;

export const OutfitFavoritesScreen = ({ navigation }: Props) => {
  const { favorites, toggleFavorite } = useOutfitStore();
  const [refreshing, setRefreshing] = useState(false);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: FAVORITE_ROW_HEIGHT,
      offset: FAVORITE_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderOutfit: ListRenderItem<Outfit> = ({ item, index }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
      <Card
        onPress={() => navigation.navigate('OutfitResult', { outfitId: item.id })}
        className="p-0 overflow-hidden mb-4"
      >
        <StyledView style={{ flexDirection: 'row', height: 140 }}>
          {item.items?.slice(0, 3).map((outfitItem: ClothingItem, i: number) => (
            <View
              key={i}
              style={{
                flex: 1,
                borderRightWidth: i < 2 ? 1 : 0,
                borderRightColor: theme.colors.border,
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
            <Typography className="text-lg font-semibold text-primary">
              {item.occasion || 'Favorite Outfit'}
            </Typography>
            <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
              <Ionicons name="heart" size={24} color="#EF4444" />
            </TouchableOpacity>
          </StyledView>
          {item.tags && item.tags.length > 0 && (
            <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {item.tags.slice(0, 3).map((tag: string, i: number) => (
                <StyledView
                  key={i}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: theme.colors.background,
                  }}
                >
                  <Typography className="text-xs text-gray-600">{tag}</Typography>
                </StyledView>
              ))}
            </StyledView>
          )}
        </StyledView>
      </Card>
    </Animated.View>
  );

  return (
    <Screen className="bg-background">
      {/* Header */}
      <StyledView style={{ padding: 24, paddingTop: 60 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-3xl text-primary">
            Favorites
          </Typography>
        </StyledView>
      </StyledView>

      {/* Favorites List */}
      <FlatList
        data={favorites}
        renderItem={renderOutfit}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <StyledView style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons
              name="heart-outline"
              size={64}
              color={theme.colors.textSecondary}
              style={{ opacity: 0.3, marginBottom: 16 }}
            />
            <Typography className="text-lg font-semibold text-primary mb-2">
              No favorites yet
            </Typography>
            <Typography className="text-gray-500 text-center mb-6">
              Save your favorite outfits to access them quickly
            </Typography>
            <TouchableOpacity
              onPress={() =>
                navigation.getParent()?.navigate('OutfitsStack', { screen: 'OutfitHome' })
              }
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
                backgroundColor: theme.colors.primary,
              }}
            >
              <Typography className="text-white font-semibold">Browse Outfits</Typography>
            </TouchableOpacity>
          </StyledView>
        }
      />
    </Screen>
  );
};
