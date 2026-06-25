import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Dimensions,
  View,
  StatusBar,
  Appearance,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import type { StackScreenProps } from '@react-navigation/stack';
import { Screen, Typography, PrimaryButton } from '../../components/common';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Accessibility } from '../../utils/accessibility';
import { ionIconName } from '../../utils/ionIcon';
import type { AppRootStackParamList } from '../../navigation/types';
import type { ClothingItem } from '../../types';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

type Props = StackScreenProps<AppRootStackParamList, 'CreateOutfit'>;

const CATEGORIES = [
  { id: 'headwear', label: 'Headwear', icon: 'baseball-outline' as const },
  { id: 'torso', label: 'Torso', icon: 'shirt-outline' as const },
  { id: 'outerwear', label: 'Outerwear', icon: 'layers-outline' as const },
  { id: 'bottoms', label: 'Bottoms', icon: 'body-outline' as const },
  { id: 'footwear', label: 'Footwear', icon: 'walk-outline' as const },
];

const CATEGORY_MAP: Record<string, string[]> = {
  headwear: ['Accessories', 'Headwear', 'Hats'],
  torso: ['Tops', 'Shirts', 'Blouses', 'T-Shirts'],
  outerwear: ['Outerwear', 'Jackets', 'Coats'],
  bottoms: ['Bottoms', 'Pants', 'Jeans', 'Shorts'],
  footwear: ['Shoes', 'Footwear', 'Sneakers', 'Boots'],
};

export const CreateOutfitScreen = ({ navigation }: Props) => {
  const t = useThemeStore((s) => s.currentTheme);
  const themeMode = useThemeStore((s) => s.mode);
  const { addOutfit } = useOutfitStore();
  const { items } = useWardrobeStore();
  const { user } = useAuthStore();

  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('headwear');
  const [outfitName] = useState('');

  const useLightStatusBar = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return Appearance.getColorScheme() === 'dark';
  }, [themeMode]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        CATEGORY_MAP[selectedCategory]?.some((cat) =>
          item.category.toLowerCase().includes(cat.toLowerCase())
        )
      ),
    [items, selectedCategory]
  );

  const toggleItemSelection = (item: ClothingItem) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((i) => i.id === item.id);
      if (isSelected) {
        return prev.filter((i) => i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const handleCreateOutfit = () => {
    if (selectedItems.length === 0) {
      return;
    }

    const newOutfit = {
      id: `outfit-${Date.now()}`,
      name: outfitName || 'My Outfit',
      items: selectedItems,
      createdAt: new Date().toISOString(),
      tags: [],
      isFavorite: false,
      favorite: false,
    };

    addOutfit(newOutfit);
    navigation.navigate('OutfitResult', { outfitId: newOutfit.id });
  };

  const handleStyleWithAI = () => {
    navigation.navigate('GenerateOutfitFlow');
  };

  const shadowCard = t.shadows.level2;
  const shadowTab = t.shadows.level1;

  return (
    <Screen className="flex-1" style={{ backgroundColor: t.colors.background }}>
      <StatusBar barStyle={useLightStatusBar ? 'light-content' : 'dark-content'} />

      <Animated.View
        entering={FadeIn.duration(300)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: StatusBar.currentHeight || 44,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: t.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: t.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={Accessibility.labels.closeButton}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: t.colors.mutedSurface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="close" size={22} color={t.colors.text} />
        </TouchableOpacity>

        <Typography
          style={{
            fontSize: t.typography.scale.lg,
            fontWeight: '700',
            color: t.colors.text,
          }}
        >
          Create Outfit
        </Typography>

        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{
            marginTop: 20,
            marginHorizontal: 20,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              backgroundColor: t.colors.surface,
              borderRadius: 24,
              padding: 20,
              ...shadowCard,
            }}
          >
            <View
              style={{
                width: '100%',
                height: height * 0.4,
                borderRadius: 20,
                backgroundColor: t.colors.surfaceAlt,
                overflow: 'hidden',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: t.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  contentFit="contain"
                />
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <View
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor: t.colors.border,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="person-outline" size={60} color={t.colors.iconMuted} />
                  </View>
                  <Typography
                    style={{
                      fontSize: t.typography.scale.sm,
                      color: t.colors.textSecondary,
                      textAlign: 'center',
                    }}
                  >
                    No avatar set
                  </Typography>
                </View>
              )}

              {selectedItems.length > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    right: 16,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                  }}
                >
                  {selectedItems.slice(0, 4).map((item, index) => (
                    <Animated.View
                      key={item.id}
                      entering={ZoomIn.duration(300).delay(index * 100)}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 12,
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: t.colors.surface,
                        ...shadowTab,
                      }}
                    >
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </Animated.View>
                  ))}
                  {selectedItems.length > 4 && (
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 12,
                        backgroundColor: t.colors.overlayStrong,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: t.colors.surface,
                      }}
                    >
                      <Typography
                        style={{
                          color: t.colors.onPrimary,
                          fontSize: t.typography.scale.xs,
                          fontWeight: '700',
                        }}
                      >
                        +{selectedItems.length - 4}
                      </Typography>
                    </View>
                  )}
                </View>
              )}
            </View>

            {selectedItems.length > 0 && (
              <View>
                <Typography
                  style={{
                    fontSize: t.typography.scale.sm,
                    fontWeight: '600',
                    color: t.colors.text,
                    marginBottom: 12,
                  }}
                >
                  Selected Items ({selectedItems.length})
                </Typography>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {selectedItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => toggleItemSelection(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.category} from outfit`}
                        style={{
                          width: 80,
                          alignItems: 'center',
                        }}
                      >
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 12,
                            marginBottom: 8,
                            borderWidth: 2,
                            borderColor: t.colors.border,
                          }}
                          contentFit="cover"
                        />
                        <Typography
                          style={{
                            fontSize: t.typography.scale.xs,
                            color: t.colors.textSecondary,
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Typography>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={{
            marginHorizontal: 20,
            marginBottom: 20,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${category.label} category`}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 24,
                    backgroundColor: isSelected ? t.colors.primary : t.colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? t.colors.primary : t.colors.border,
                    ...(isSelected ? shadowTab : {}),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={ionIconName(category.icon)}
                      size={18}
                      color={isSelected ? t.colors.onPrimary : t.colors.textSecondary}
                    />
                    <Typography
                      style={{
                        fontSize: t.typography.scale.sm,
                        fontWeight: '600',
                        color: isSelected ? t.colors.onPrimary : t.colors.text,
                      }}
                    >
                      {category.label}
                    </Typography>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={{
            marginHorizontal: 20,
            marginBottom: 24,
          }}
        >
          <Typography
            style={{
              fontSize: t.typography.scale.md,
              fontWeight: '700',
              color: t.colors.text,
              marginBottom: 16,
            }}
          >
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} (
            {filteredItems.length})
          </Typography>

          {filteredItems.length === 0 ? (
            <View
              style={{
                padding: 40,
                alignItems: 'center',
                backgroundColor: t.colors.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: t.colors.border,
              }}
            >
              <Ionicons name="shirt-outline" size={48} color={t.colors.iconSubtle} />
              <Typography
                style={{
                  marginTop: 16,
                  fontSize: t.typography.scale.md,
                  color: t.colors.textSecondary,
                  textAlign: 'center',
                  fontWeight: '500',
                }}
              >
                No items in this category
              </Typography>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {filteredItems.map((item, index) => {
                const isSelected = selectedItems.some((i) => i.id === item.id);
                return (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.duration(300).delay(index * 50)}
                    style={{
                      width: (width - 64) / 2,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => toggleItemSelection(item)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${item.category}${item.brand ? `, ${item.brand}` : ''}`}
                      style={{
                        backgroundColor: t.colors.surface,
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? t.colors.primary : t.colors.border,
                        ...(isSelected ? shadowTab : {}),
                      }}
                    >
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{
                          width: '100%',
                          height: (width - 64) / 2,
                          backgroundColor: t.colors.mutedSurface,
                        }}
                        contentFit="cover"
                      />
                      <View style={{ padding: 12 }}>
                        <Typography
                          style={{
                            fontSize: t.typography.scale.sm,
                            fontWeight: '600',
                            color: t.colors.text,
                            marginBottom: 4,
                          }}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Typography>
                        {item.brand && (
                          <Typography
                            style={{
                              fontSize: t.typography.scale.xs,
                              color: t.colors.textSecondary,
                            }}
                            numberOfLines={1}
                          >
                            {item.brand}
                          </Typography>
                        )}
                      </View>
                      {isSelected && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: t.colors.primary,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: t.colors.surface,
                          }}
                        >
                          <Ionicons name="checkmark" size={16} color={t.colors.onPrimary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.duration(500).delay(300)}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: 34,
          backgroundColor: t.colors.surface,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          ...t.shadows.level3,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              title="Save Outfit"
              onPress={handleCreateOutfit}
              disabled={selectedItems.length === 0}
              accessibilityLabel="Save outfit"
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              title="Style with AI"
              onPress={handleStyleWithAI}
              icon="flash"
              accessibilityLabel="Style with AI"
              style={{ backgroundColor: t.colors.accent }}
            />
          </View>
        </View>
      </Animated.View>
    </Screen>
  );
};
