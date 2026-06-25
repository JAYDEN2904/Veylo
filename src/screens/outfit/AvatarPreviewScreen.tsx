import React from 'react';
import { ScrollView, TouchableOpacity, View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Button } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { ClothingItem } from '../../types';

const { width } = Dimensions.get('window');

interface AnatomicalSlot {
  /** Vertical position as a fraction of the avatar canvas height. */
  topRatio: number;
  /** Horizontal position as a fraction of the avatar canvas width. */
  leftRatio: number;
  /** Tile width as a fraction of canvas width. */
  sizeRatio: number;
  label: string;
}

const SLOT_BY_CATEGORY: Array<{ match: (cat: string) => boolean; slot: AnatomicalSlot }> = [
  {
    match: (c) => c.includes('dress'),
    slot: { topRatio: 0.32, leftRatio: 0.36, sizeRatio: 0.28, label: 'Dress' },
  },
  {
    match: (c) => c.includes('outer') || c.includes('jacket') || c.includes('coat'),
    slot: { topRatio: 0.28, leftRatio: 0.08, sizeRatio: 0.22, label: 'Outerwear' },
  },
  {
    match: (c) =>
      c.includes('top') || c.includes('shirt') || c.includes('blouse') || c.includes('hood'),
    slot: { topRatio: 0.3, leftRatio: 0.7, sizeRatio: 0.22, label: 'Top' },
  },
  {
    match: (c) =>
      c.includes('bottom') ||
      c.includes('pant') ||
      c.includes('jean') ||
      c.includes('skirt') ||
      c.includes('short'),
    slot: { topRatio: 0.55, leftRatio: 0.08, sizeRatio: 0.22, label: 'Bottom' },
  },
  {
    match: (c) => c.includes('shoe') || c.includes('sneak') || c.includes('boot'),
    slot: { topRatio: 0.82, leftRatio: 0.7, sizeRatio: 0.2, label: 'Shoes' },
  },
  {
    match: (c) =>
      c.includes('accessor') || c.includes('hat') || c.includes('bag') || c.includes('sunglass'),
    slot: { topRatio: 0.06, leftRatio: 0.72, sizeRatio: 0.18, label: 'Accessory' },
  },
];

const FALLBACK_SLOT: AnatomicalSlot = {
  topRatio: 0.5,
  leftRatio: 0.78,
  sizeRatio: 0.18,
  label: 'Item',
};

function slotForCategory(category: string | undefined): AnatomicalSlot {
  const c = (category ?? '').toLowerCase();
  const match = SLOT_BY_CATEGORY.find((s) => s.match(c));
  return match?.slot ?? FALLBACK_SLOT;
}

export const AvatarPreviewScreen = ({ navigation, route }: any) => {
  const { outfits, generatedOutfit } = useOutfitStore();
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const outfitId = route.params?.outfitId;

  const outfit = outfitId ? outfits.find((o) => o.id === outfitId) : generatedOutfit;
  const hasAvatar = !!user?.avatarUrl;

  if (!outfit) {
    return (
      <Screen className="bg-background justify-center items-center p-6">
        <Typography className="text-gray-500">Outfit not found</Typography>
        <Button title="Go Back" onPress={() => navigation.goBack()} className="mt-4" />
      </Screen>
    );
  }

  if (!hasAvatar) {
    return (
      <Screen className="bg-background">
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, alignItems: 'center' }}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ alignItems: 'center', marginTop: 40 }}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: currentTheme.colors.background,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Ionicons
                name="person-circle-outline"
                size={80}
                color={currentTheme.colors.textSecondary}
              />
            </View>
            <Typography variant="header" className="text-2xl text-primary mb-4 text-center">
              No Avatar Yet
            </Typography>
            <Typography className="text-gray-500 text-center mb-8">
              Create an avatar to preview outfits quickly
            </Typography>
            <Button
              title="Create Avatar"
              onPress={() => navigation.navigate('AvatarGeneration')}
              className="mb-4"
            />
            <Button
              title="Go to Full Try-On"
              onPress={() => navigation.replace('VirtualTryOn', { outfitId: outfit.id })}
              variant="outline"
            />
          </Animated.View>
        </ScrollView>
      </Screen>
    );
  }

  const handleFullTryOn = () => {
    navigation.replace('VirtualTryOn', { outfitId: outfit.id });
  };

  const canvasWidth = width - 48;
  const canvasHeight = canvasWidth * 1.35;
  const garments = (outfit.items ?? []) as ClothingItem[];

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <LinearGradient
          colors={[currentTheme.colors.primary, '#2A2D31', currentTheme.colors.background]}
          style={{ paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.15)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Typography
                variant="header"
                style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}
              >
                Outfit on Avatar
              </Typography>
              <Typography style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                Composed preview — for a fitted render, use Full Try-On
              </Typography>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 24 }}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Typography className="text-lg font-semibold text-primary mb-4">Preview</Typography>

            <View
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: currentTheme.colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  backgroundColor: currentTheme.colors.background,
                  position: 'relative',
                }}
              >
                <Image
                  source={{ uri: user?.avatarUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />

                {garments.map((item, idx) => {
                  const slot = slotForCategory(item.category);
                  const tileSize = canvasWidth * slot.sizeRatio;
                  return (
                    <Animated.View
                      key={item.id ?? idx}
                      entering={FadeInDown.delay(idx * 80).duration(420)}
                      style={{
                        position: 'absolute',
                        top: canvasHeight * slot.topRatio,
                        left: canvasWidth * slot.leftRatio,
                        width: tileSize,
                        height: tileSize,
                        borderRadius: 14,
                        overflow: 'hidden',
                        backgroundColor: currentTheme.colors.surface,
                        borderWidth: 2,
                        borderColor: currentTheme.colors.secondary,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                      }}
                    >
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          paddingHorizontal: 6,
                          paddingTop: 12,
                          paddingBottom: 4,
                        }}
                      >
                        <Typography
                          numberOfLines={1}
                          style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}
                        >
                          {item.category ?? slot.label}
                        </Typography>
                      </LinearGradient>
                    </Animated.View>
                  );
                })}

                <View
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    backgroundColor: currentTheme.colors.secondary + 'DD',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons
                    name="layers"
                    size={14}
                    color={currentTheme.colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Typography
                    style={{ color: currentTheme.colors.primary, fontSize: 12, fontWeight: '600' }}
                  >
                    Composed Preview
                  </Typography>
                </View>
              </View>

              <View style={{ padding: 20 }}>
                <Typography variant="header" className="text-xl text-primary mb-2">
                  {outfit.occasion || 'Your Outfit'}
                </Typography>
                <Typography className="text-gray-500 text-sm">
                  {garments.length} pieces on your avatar
                </Typography>
              </View>
            </View>

            <View
              style={{
                backgroundColor: currentTheme.colors.secondary + '15',
                padding: 16,
                borderRadius: 16,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: currentTheme.colors.secondary + '30',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={currentTheme.colors.secondary}
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Typography className="text-sm font-semibold text-primary mb-1">
                    What you are seeing
                  </Typography>
                  <Typography className="text-xs text-gray-600" style={{ lineHeight: 18 }}>
                    Items are composed over your avatar at anatomical positions, not stitched onto
                    the body. For a fitted render, run Full Virtual Try-On.
                  </Typography>
                </View>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Button title="Full Virtual Try-On" onPress={handleFullTryOn} className="w-full" />
              <Button
                title="Go Back"
                onPress={() => navigation.goBack()}
                variant="outline"
                className="w-full"
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </Screen>
  );
};
