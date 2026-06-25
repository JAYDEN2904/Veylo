import React, { useState, useMemo } from 'react';
import { ScrollView, TouchableOpacity, FlatList, Dimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { ClothingItem } from '../../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

export const OutfitOrganizationScreen = ({ navigation }: any) => {
  const { items } = useWardrobeStore();
  const { outfits } = useOutfitStore();

  // Group items by outfits they appear in
  const itemsByOutfit = useMemo(() => {
    const itemOutfitMap: Record<string, { item: ClothingItem; outfits: string[] }> = {};

    // Initialize all items
    items.forEach((item) => {
      itemOutfitMap[item.id] = { item, outfits: [] };
    });

    // Track which outfits contain each item
    outfits.forEach((outfit) => {
      outfit.items?.forEach((outfitItem) => {
        if (itemOutfitMap[outfitItem.id]) {
          itemOutfitMap[outfitItem.id].outfits.push(
            outfit.occasion || outfit.name || 'Unnamed Outfit'
          );
        }
      });
    });

    // Convert to array and group by outfit count
    const organizedItems = Object.values(itemOutfitMap).map(({ item, outfits: outfitList }) => ({
      item,
      outfitCount: outfitList.length,
      outfitNames: outfitList,
    }));

    return organizedItems.sort((a, b) => b.outfitCount - a.outfitCount);
  }, [items, outfits]);

  // Group items by outfit count categories
  const frequentlyUsedItems = itemsByOutfit.filter((io) => io.outfitCount >= 3);
  const occasionallyUsedItems = itemsByOutfit.filter(
    (io) => io.outfitCount === 1 || io.outfitCount === 2
  );
  const unusedItems = itemsByOutfit.filter((io) => io.outfitCount === 0);

  const renderItem = ({ item: itemData, index }: any) => {
    const { item, outfitCount, outfitNames } = itemData;

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.getParent()?.getParent()?.navigate('ItemDetails', { itemId: item.id })
        }
        activeOpacity={0.9}
        style={{
          width: CARD_WIDTH,
          marginBottom: 16,
          marginTop: index % 2 === 1 ? 16 : 0,
        }}
      >
        <View
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={{
              width: '100%',
              height: CARD_HEIGHT,
              backgroundColor: theme.colors.background,
            }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 12,
              paddingTop: 32,
            }}
          >
            <Typography
              style={{
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: 14,
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {item.category}
            </Typography>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons
                name="shirt"
                size={12}
                color="rgba(255,255,255,0.8)"
                style={{ marginRight: 4 }}
              />
              <Typography
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 11,
                }}
              >
                {outfitCount} {outfitCount === 1 ? 'outfit' : 'outfits'}
              </Typography>
            </View>
          </LinearGradient>

          {/* Badge for outfit count */}
          {outfitCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: theme.colors.accent + 'DD',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Typography style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>
                {outfitCount}x
              </Typography>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, items: typeof itemsByOutfit, description: string) => {
    if (items.length === 0) return null;

    return (
      <StyledView style={{ marginBottom: 32 }}>
        <StyledView style={{ marginBottom: 16 }}>
          <Typography variant="header" className="text-xl text-primary mb-2">
            {title}
          </Typography>
          <Typography className="text-gray-500 text-sm">{description}</Typography>
        </StyledView>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.item.id}-${index}`}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      </StyledView>
    );
  };

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <StyledView style={{ padding: 24, paddingTop: 60 }}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Typography variant="header" className="text-3xl text-primary">
              Outfit Organization
            </Typography>
          </StyledView>

          <Card className="p-4 mb-6">
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons
                name="information-circle"
                size={20}
                color={theme.colors.accent}
                style={{ marginRight: 12 }}
              />
              <Typography className="text-primary font-semibold" style={{ flex: 1 }}>
                Items Organized by Outfit Usage
              </Typography>
            </StyledView>
            <Typography className="text-gray-500 text-sm" style={{ lineHeight: 18 }}>
              See which items you use most often and discover pieces that haven't been styled yet.
              Use this to identify versatile pieces and items that need more outfit combinations.
            </Typography>
          </Card>
        </StyledView>

        {/* Content */}
        <StyledView style={{ paddingHorizontal: 24 }}>
          {renderSection(
            'Frequently Used',
            frequentlyUsedItems,
            'Items that appear in 3+ outfits - your most versatile pieces'
          )}

          {renderSection(
            'Occasionally Used',
            occasionallyUsedItems,
            'Items that appear in 1-2 outfits - consider creating more combinations'
          )}

          {renderSection(
            'Not Yet Styled',
            unusedItems,
            "Items that haven't been added to any outfits yet - time to get creative!"
          )}

          {itemsByOutfit.length === 0 && (
            <Card className="p-6">
              <StyledView style={{ alignItems: 'center' }}>
                <Ionicons
                  name="shirt-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                  style={{ opacity: 0.5, marginBottom: 12 }}
                />
                <Typography className="text-gray-500 text-center">
                  No outfit data yet. Create some outfits to see organization here.
                </Typography>
              </StyledView>
            </Card>
          )}
        </StyledView>
      </ScrollView>
    </Screen>
  );
};
