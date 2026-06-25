import React, { useState } from 'react';
import { FlatList, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card, ClothingTile } from '../../components/common';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ionIconName } from '../../utils/ionIcon';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface CategoryDef {
  id: string;
  name: string;
  icon: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'all', name: 'All Items', icon: 'grid' },
  { id: 'tops', name: 'Tops', icon: 'shirt' },
  { id: 'bottoms', name: 'Bottoms', icon: 'body' },
  { id: 'shoes', name: 'Shoes', icon: 'footsteps' },
  { id: 'accessories', name: 'Accessories', icon: 'watch' },
  { id: 'outerwear', name: 'Outerwear', icon: 'shield' },
  { id: 'dresses', name: 'Dresses', icon: 'woman' },
  { id: 'bags', name: 'Bags', icon: 'bag' },
];

export const CategoryBrowserScreen = ({
  navigation,
  route,
}: {
  navigation: {
    goBack: () => void;
    getParent: () =>
      | { getParent: () => { navigate: (n: string, p?: object) => void } | undefined }
      | undefined;
  };
  route?: { params?: { category?: string } };
}) => {
  const { items } = useWardrobeStore();
  const { currentTheme } = useThemeStore();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    route?.params?.category ?? 'all'
  );

  const categoryItems =
    selectedCategory === 'all'
      ? items
      : items.filter((item) => item.category?.toLowerCase() === selectedCategory);

  const selectedCategoryData = CATEGORIES.find((c) => c.id === selectedCategory);

  const renderCategory = ({ item, index }: { item: CategoryDef; index: number }) => {
    const isSelected = selectedCategory === item.id;
    const itemCount =
      item.id === 'all'
        ? items.length
        : items.filter((i) => i.category?.toLowerCase() === item.id).length;

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
        <TouchableOpacity
          onPress={() => setSelectedCategory(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Browse ${item.name}`}
          style={{
            width: CARD_WIDTH,
            marginBottom: 16,
            marginRight: index % 2 === 0 ? 16 : 0,
          }}
        >
          <Card
            style={{
              padding: 0,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: isSelected ? currentTheme.colors.accent : currentTheme.colors.border,
              backgroundColor: isSelected
                ? currentTheme.colors.mutedSurface
                : currentTheme.colors.surface,
            }}
          >
            <LinearGradient
              colors={[currentTheme.colors.primary, currentTheme.colors.accent]}
              style={{
                height: 120,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name={ionIconName(item.icon)}
                size={48}
                color={currentTheme.colors.onPrimary}
              />
            </LinearGradient>
            <StyledView style={{ padding: 16 }}>
              <Typography
                style={{
                  color: currentTheme.colors.text,
                  fontWeight: '600',
                  fontSize: 17,
                  marginBottom: 2,
                }}
              >
                {item.name}
              </Typography>
              <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 13 }}>
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </Typography>
            </StyledView>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: (typeof items)[number]; index: number }) => (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 50)}
      style={{ marginBottom: 16 }}
    >
      <ClothingTile
        item={item}
        height={220}
        showOverlay
        onPress={() =>
          navigation.getParent()?.getParent()?.navigate('ItemDetails', { itemId: item.id })
        }
      />
    </Animated.View>
  );

  return (
    <Screen>
      <StyledView style={{ padding: 24, paddingTop: 60 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography
            variant="header"
            style={{ color: currentTheme.colors.text, fontSize: 28, fontWeight: '700' }}
          >
            Categories
          </Typography>
        </StyledView>

        <FlatList
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={{ marginBottom: 24 }}
        />
      </StyledView>

      {selectedCategoryData && (
        <StyledView style={{ flex: 1 }}>
          <StyledView style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Typography
              style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 17 }}
            >
              {selectedCategoryData.name}
            </Typography>
          </StyledView>
          <FlatList
            data={categoryItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <StyledView style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons
                  name="shirt-outline"
                  size={64}
                  color={currentTheme.colors.iconSubtle}
                  style={{ marginBottom: 16 }}
                />
                <Typography
                  style={{
                    color: currentTheme.colors.text,
                    fontWeight: '600',
                    fontSize: 17,
                    marginBottom: 8,
                  }}
                >
                  No items yet
                </Typography>
                <Typography
                  style={{ color: currentTheme.colors.textSecondary, textAlign: 'center' }}
                >
                  Start scanning to add items to this category
                </Typography>
              </StyledView>
            }
          />
        </StyledView>
      )}
    </Screen>
  );
};
