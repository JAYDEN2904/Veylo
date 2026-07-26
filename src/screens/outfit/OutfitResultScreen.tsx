import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeInDown,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import {
  Screen,
  Typography,
  Button,
  StyleMatchBadge,
  PrimaryButton,
  ClothingTile,
} from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useStyleStore } from '../../store/useStyleStore';
import { useAuthStore } from '../../store/useAuthStore';

const { width, height } = Dimensions.get('window');

// Outfit item card with reveal animation
const OutfitItemCard = ({ item, index }: { item: any; index: number }) => {
  const scale = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    scale.value = withDelay(index * 200, withSpring(1, { damping: 12 }));
    translateY.value = withDelay(index * 200, withSpring(0, { damping: 12 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const cardWidth = Math.floor((width - 72) / 3);
  const cardHeight = Math.floor(cardWidth * 1.3);

  return (
    <Animated.View style={[{ marginRight: 12, marginBottom: 12 }, animatedStyle]}>
      <ClothingTile item={item} width={cardWidth} height={cardHeight} showOverlay />
    </Animated.View>
  );
};

// Floating action buttons
const ActionButton = ({ icon, label, onPress, color, delay }: any) => (
  <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: 100,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: color + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Typography className="text-xs font-semibold text-primary">{label}</Typography>
    </TouchableOpacity>
  </Animated.View>
);

export const OutfitResultScreen = ({ navigation, route }: any) => {
  const { generatedOutfit, outfits, toggleFavorite, recordOutfitWear } = useOutfitStore();
  const { calculateStyleMatchScore } = useStyleStore();
  const outfitId = route.params?.outfitId;
  const [isLoggingWear, setIsLoggingWear] = useState(false);

  // Library outfit by id, else the in-memory generated look (OutfitLoading passes generated id).
  const fromLibrary = outfitId ? outfits.find((o) => o.id === outfitId) : undefined;
  const outfit = fromLibrary ?? generatedOutfit;

  const [isFavorite, setIsFavorite] = useState(outfit?.favorite || false);

  // Calculate style match score if not already set
  const styleMatchScore =
    outfit?.styleMatchScore ?? (outfit ? calculateStyleMatchScore(outfit) : 0);

  // Animations
  const headerOpacity = useSharedValue(0);
  const sparkleRotate = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 800 });
    sparkleRotate.value = withSequence(
      withTiming(10, { duration: 200 }),
      withTiming(-10, { duration: 200 }),
      withTiming(0, { duration: 200 })
    );
  }, []);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  const handleFavorite = () => {
    if (outfit) {
      toggleFavorite(outfit.id);
      setIsFavorite(!isFavorite);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this outfit I created with Veylo! 👗✨\n\n${outfit?.occasion || 'My Outfit'}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleWear = async () => {
    if (!outfit || isLoggingWear) return;
    setIsLoggingWear(true);
    try {
      await recordOutfitWear(outfit);
      Alert.alert(
        'Logged for today',
        `Marked ${outfit.items?.length ?? 0} item${
          (outfit.items?.length ?? 0) === 1 ? '' : 's'
        } as worn today. Check Calendar History to see it.`,
        [
          {
            text: 'Done',
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }),
          },
        ]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not log this outfit.';
      Alert.alert('Could not log wear', message);
    } finally {
      setIsLoggingWear(false);
    }
  };

  const { user } = useAuthStore();

  const handleTryOn = () => {
    // Navigate to Virtual Try-On with this outfit
    navigation.navigate('VirtualTryOn', { outfitId: outfit?.id });
  };

  const handleAvatarPreview = () => {
    // Navigate to Avatar Preview with this outfit
    navigation.navigate('AvatarPreview', { outfitId: outfit?.id });
  };

  if (!outfit) {
    return (
      <Screen className="bg-background justify-center items-center p-6">
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={theme.colors.textSecondary}
          style={{ marginBottom: 16 }}
        />
        <Typography className="text-gray-500 text-center mb-4">Outfit not found</Typography>
        <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </Screen>
    );
  }

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, '#2A2D31', theme.colors.background]}
          style={{ paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24 }}
        >
          {/* Navigation */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFavorite}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isFavorite ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? '#EF4444' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
            <Animated.View style={sparkleStyle}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  marginBottom: 16,
                }}
              >
                <LinearGradient
                  colors={[theme.colors.secondary, '#E8D89A']}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="flash" size={28} color={theme.colors.primary} />
                </LinearGradient>
              </View>
            </Animated.View>
            <Typography
              variant="header"
              className="text-3xl mb-2 text-center"
              style={{ color: '#FFFFFF', fontWeight: '700' }}
            >
              {outfit.occasion || 'Your Outfit'}
            </Typography>
            <Typography className="text-gray-400 text-center mb-3">
              {outfit.items?.length || 0} pieces • {outfit.season || 'All seasons'}
            </Typography>
            {/* Style Match Badge */}
            {styleMatchScore > 0 && (
              <View style={{ marginTop: 8 }}>
                <StyleMatchBadge score={styleMatchScore} size="medium" />
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* Why this works */}
        {outfit.fitReasoning && outfit.fitReasoning.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <Typography className="text-lg font-semibold text-primary mb-3">
                Why this works
              </Typography>
              {outfit.fitReasoning.map((line: string) => (
                <Typography
                  key={line}
                  className="text-gray-600 text-sm mb-2"
                  style={{ lineHeight: 20 }}
                >
                  {line}
                </Typography>
              ))}
            </Animated.View>
          </View>
        )}

        {/* Outfit Items */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Typography className="text-lg font-semibold text-primary mb-4">
              Outfit Pieces
            </Typography>
          </Animated.View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {outfit.items?.map((item: any, index: number) => (
              <OutfitItemCard key={item.id} item={item} index={index} />
            ))}
          </View>
        </View>

        {/* Tags */}
        {outfit.tags && outfit.tags.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <Animated.View entering={FadeInDown.duration(500).delay(600)}>
              <Typography className="text-lg font-semibold text-primary mb-4">
                Style Tags
              </Typography>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {outfit.tags.map((tag: string, index: number) => (
                  <View
                    key={index}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: theme.colors.primary + '10',
                    }}
                  >
                    <Typography className="text-sm text-primary font-medium">#{tag}</Typography>
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
          <Animated.View entering={FadeInDown.duration(500).delay(800)}>
            <Typography className="text-lg font-semibold text-primary mb-4">Actions</Typography>
          </Animated.View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {user?.avatarUrl && (
              <>
                <ActionButton
                  icon="person-circle-outline"
                  label="Preview"
                  onPress={handleAvatarPreview}
                  color={theme.colors.accent}
                  delay={900}
                />
                <View style={{ width: 12 }} />
              </>
            )}
            <ActionButton
              icon="body-outline"
              label="Try On"
              onPress={handleTryOn}
              color={theme.colors.secondary}
              delay={user?.avatarUrl ? 1000 : 900}
            />
            <View style={{ width: 12 }} />
            <ActionButton
              icon="checkmark-circle"
              label="Wear Today"
              onPress={handleWear}
              color={theme.colors.success}
              delay={1000}
            />
            <View style={{ width: 12 }} />
            <ActionButton
              icon="share-outline"
              label="Share"
              onPress={handleShare}
              color={theme.colors.accent}
              delay={1100}
            />
            <View style={{ width: 12 }} />
            <ActionButton
              icon="refresh"
              label="Regenerate"
              onPress={() => navigation.navigate('GenerateOutfitFlow')}
              color={theme.colors.warning}
              delay={1200}
            />
          </ScrollView>
        </View>
      </ScrollView>

      <LinearGradient
        colors={['transparent', theme.colors.background]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 40,
        }}
      >
        <Animated.View entering={FadeInDown.duration(500).delay(1300)}>
          <PrimaryButton
            title="Try On This Outfit"
            onPress={handleTryOn}
            icon="body-outline"
            accessibilityLabel="Try on this outfit"
          />
        </Animated.View>
      </LinearGradient>
    </Screen>
  );
};
