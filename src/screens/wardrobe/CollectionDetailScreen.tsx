import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, Dimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, ClothingTile } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { getAllSmartCollections, SmartCollection } from '../../services/collectionsService';
import type { ClothingItem } from '../../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

export const CollectionDetailScreen = ({ navigation, route }: any) => {
  const { items } = useWardrobeStore();
  const { currentTheme } = useThemeStore();
  const { collectionId } = route.params;
  const [collection, setCollection] = useState<SmartCollection | null>(null);

  useEffect(() => {
    const collections = getAllSmartCollections(items);
    const found = collections.find((c) => c.id === collectionId);
    setCollection(found || null);
  }, [items, collectionId]);

  if (!collection) {
    return (
      <Screen className="justify-center items-center p-6">
        <Typography style={{ color: currentTheme.colors.textSecondary }}>
          Collection not found
        </Typography>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: currentTheme.colors.primary,
            borderRadius: 12,
          }}
        >
          <Typography style={{ color: currentTheme.colors.onPrimary, fontWeight: '600' }}>
            Go Back
          </Typography>
        </TouchableOpacity>
      </Screen>
    );
  }

  const renderItem = ({ item, index }: { item: ClothingItem; index: number }) => (
    <View
      style={{
        width: CARD_WIDTH,
        marginBottom: 16,
        marginTop: index % 2 === 1 ? 16 : 0,
      }}
    >
      <ClothingTile
        item={item}
        height={CARD_HEIGHT}
        showOverlay
        onPress={() =>
          navigation.getParent()?.getParent()?.navigate('ItemDetails', { itemId: item.id })
        }
      />
    </View>
  );

  return (
    <Screen>
      {/* Header */}
      <LinearGradient
        colors={[currentTheme.colors.primary, currentTheme.colors.accent]}
        style={{ paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24 }}
      >
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Typography
            variant="header"
            style={{ color: '#FFF', fontSize: 28, fontWeight: '700', flex: 1 }}
          >
            {collection.name}
          </Typography>
        </StyledView>
        <Typography style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 }}>
          {collection.description}
        </Typography>
        <Typography style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
          {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
        </Typography>
      </LinearGradient>

      {/* Items Grid */}
      <FlatList
        data={collection.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <StyledView className="flex-1 items-center justify-center py-20">
            <Typography className="text-textSecondary">No items in this collection</Typography>
          </StyledView>
        }
      />
    </Screen>
  );
};
