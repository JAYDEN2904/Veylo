import React, { useEffect, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  Extrapolate,
  runOnJS,
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { Screen, Typography, Button, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useScanStore } from '../../store/useScanStore';
import { isSupabaseConfigured } from '../../services/supabase';
import { detectDuplicates, DuplicateCandidate } from '../../services/duplicateDetectionService';
import type { ClothingItem } from '../../types';

const { width, height } = Dimensions.get('window');

// Confetti particle
const Particle = ({ delay, startX, startY, endX, endY, color }: any) => {
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
    progress.value = withDelay(delay, withTiming(1, { duration: 1000 }));
    rotation.value = withDelay(delay, withTiming(Math.random() * 720 - 360, { duration: 1000 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [startX, endX], Extrapolate.CLAMP);
    const translateY = interpolate(
      progress.value,
      [0, 0.4, 1],
      [startY, startY - 150, endY],
      Extrapolate.CLAMP
    );
    const scale = interpolate(progress.value, [0, 0.2, 1], [0, 1, 0.3], Extrapolate.CLAMP);
    const particleOpacity = interpolate(progress.value, [0.7, 1], [1, 0], Extrapolate.CLAMP);

    return {
      opacity: opacity.value * particleOpacity,
      transform: [{ translateX }, { translateY }, { scale }, { rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

// Confetti burst component
const ConfettiBurst = () => {
  const { currentTheme } = useThemeStore();
  const colors = [
    currentTheme.colors.secondary,
    '#FFD700',
    '#4338CA',
    '#10B981',
    '#F59E0B',
    '#EC4899',
  ];

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 200,
    startX: width / 2 - 6,
    startY: height / 2 - 100,
    endX: Math.random() * width,
    endY: height / 2 + Math.random() * 300,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
    >
      {particles.map((particle) => (
        <Particle key={particle.id} {...particle} />
      ))}
    </View>
  );
};

// Success checkmark animation
const SuccessCheckmark = () => {
  const { currentTheme } = useThemeStore();
  const circleScale = useSharedValue(0);
  const checkProgress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    circleScale.value = withSpring(1, { damping: 12 });
    checkProgress.value = withDelay(300, withTiming(1, { duration: 400 }));
    glowOpacity.value = withDelay(
      500,
      withSequence(withTiming(0.6, { duration: 300 }), withTiming(0.3, { duration: 500 }))
    );
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow effect */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: currentTheme.colors.secondary,
          },
          glowStyle,
        ]}
      />

      {/* Circle */}
      <Animated.View style={circleStyle}>
        <LinearGradient
          colors={[currentTheme.colors.secondary, '#E8D89A']}
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: currentTheme.colors.secondary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 30,
          }}
        >
          <Ionicons name="checkmark" size={60} color={currentTheme.colors.primary} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// Item preview card
const ItemPreviewCard = ({ imageUri, category, brand, tags }: any) => {
  const { currentTheme } = useThemeStore();
  return (
    <Animated.View entering={FadeInDown.duration(600).delay(700)}>
      <Card
        className="p-0 overflow-hidden"
        style={{
          borderRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          {/* Image */}
          <Image
            source={{ uri: imageUri }}
            style={{ width: 100, height: 100, backgroundColor: currentTheme.colors.background }}
            contentFit="cover"
          />

          {/* Info */}
          <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
            <Typography
              className="text-lg font-bold text-primary mb-1"
              style={{ fontWeight: '700' }}
            >
              {category}
            </Typography>
            {brand && <Typography className="text-sm text-gray-500 mb-2">{brand}</Typography>}
            {tags && tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {tags.slice(0, 3).map((tag: string, index: number) => (
                  <View
                    key={index}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: currentTheme.colors.background,
                    }}
                  >
                    <Typography className="text-xs text-gray-600">{tag}</Typography>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Card>
    </Animated.View>
  );
};

export const SaveItemConfirmationScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const params = route.params || {};
  const imageUri: string = typeof params.imageUri === 'string' ? params.imageUri : '';
  const category: string = params.category || 'Top';
  const brand: string | undefined = params.brand;
  const tags: string[] = params.tags || [];
  const itemId: string | undefined = params.itemId;

  const { items, fetchItems } = useWardrobeStore();
  const { clearQueue } = useScanStore();

  useEffect(() => {
    // Only refresh from the live wardrobe — never invent a local row.
    if (isSupabaseConfigured() && itemId) {
      void fetchItems();
    }
  }, []);

  const { totalItems, addedToday } = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    let added = 0;
    for (const i of items) {
      const created = i.createdAt ? new Date(i.createdAt).getTime() : NaN;
      if (!Number.isNaN(created) && created >= todayMs) added += 1;
    }
    return { totalItems: items.length, addedToday: added };
  }, [items]);

  const duplicateMatch = useMemo<{
    existing: ClothingItem;
    candidate: DuplicateCandidate;
  } | null>(() => {
    if (items.length < 2) return null;
    const newItem =
      (itemId ? items.find((i) => i.id === itemId) : undefined) ??
      items.find((i) => i.imageUrl === imageUri);
    if (!newItem) return null;
    const matches = detectDuplicates(items, 60).filter(
      (d) => d.item1.id === newItem.id || d.item2.id === newItem.id
    );
    if (matches.length === 0) return null;
    const best = matches[0];
    const existing = best.item1.id === newItem.id ? best.item2 : best.item1;
    return { existing, candidate: best };
  }, [items, itemId, imageUri]);

  const handleAddAnother = () => {
    navigation.navigate('ScanStack');
  };

  const handleViewCloset = () => {
    clearQueue();
    navigation.reset({
      index: 0,
      routes: [{ name: 'TodayStack' }],
    });
  };

  return (
    <Screen className="bg-background">
      <LinearGradient
        colors={[currentTheme.colors.primary, '#0A0B0C', currentTheme.colors.background]}
        locations={[0, 0.4, 0.8]}
        style={{ flex: 1 }}
      >
        {/* Confetti */}
        <ConfettiBurst />

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          {/* Success animation */}
          <View style={{ marginBottom: 40 }}>
            <SuccessCheckmark />
          </View>

          {/* Text */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(400)}
            style={{ alignItems: 'center' }}
          >
            <Typography
              variant="header"
              className="text-4xl mb-3 text-center"
              style={{ color: '#FFFFFF', fontWeight: '700' }}
            >
              Item Saved!
            </Typography>
            <Typography className="text-gray-400 text-center text-base" style={{ maxWidth: 280 }}>
              Your clothing item has been added to your digital closet.
            </Typography>
          </Animated.View>

          {/* Item Preview */}
          <View style={{ width: '100%', marginTop: 40, marginBottom: 24 }}>
            <ItemPreviewCard imageUri={imageUri} category={category} brand={brand} tags={tags} />
          </View>

          {/* Duplicate hint */}
          {duplicateMatch && (
            <Animated.View
              entering={FadeInDown.duration(500).delay(800)}
              style={{ width: '100%', marginBottom: 24 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: 'rgba(243, 229, 171, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(243, 229, 171, 0.3)',
                }}
              >
                <Image
                  source={{ uri: duplicateMatch.existing.imageUrl }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    marginRight: 12,
                    backgroundColor: currentTheme.colors.background,
                  }}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Typography
                    style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginBottom: 2 }}
                  >
                    Looks similar to your{' '}
                    {duplicateMatch.existing.brand
                      ? `${duplicateMatch.existing.brand} ${duplicateMatch.existing.category}`
                      : duplicateMatch.existing.category}
                  </Typography>
                  <Typography style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                    {duplicateMatch.candidate.similarityScore}% match ·{' '}
                    {duplicateMatch.candidate.reasons.slice(0, 2).join(' · ')}
                  </Typography>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Stats */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(900)}
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 40,
              marginBottom: 40,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Typography
                className="text-3xl font-bold mb-1"
                style={{ color: currentTheme.colors.secondary }}
              >
                {totalItems}
              </Typography>
              <Typography className="text-gray-500 text-xs">Total Items</Typography>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Typography
                className="text-3xl font-bold mb-1"
                style={{ color: currentTheme.colors.secondary }}
              >
                {addedToday}
              </Typography>
              <Typography className="text-gray-500 text-xs">Added Today</Typography>
            </View>
          </Animated.View>

          {/* Actions */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(1100)}
            style={{ width: '100%', gap: 12 }}
          >
            <Button
              title="Scan Another Item"
              onPress={handleAddAnother}
              variant="secondary"
              className="w-full rounded-full h-14"
            />
            <Button
              title="View My Closet"
              onPress={handleViewCloset}
              variant="outline"
              className="w-full rounded-full h-14"
            />
          </Animated.View>
        </View>
      </LinearGradient>
    </Screen>
  );
};
