import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import {
  Screen,
  StyledView,
  Typography,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  EmptyStates,
  ClothingTile,
} from '../../components/common';
import { OutfitFlatLay } from '../../components/OutfitFlatLay';
import { OutfitFlatLaySkeleton } from '../../components/OutfitFlatLaySkeleton';
import { PressableScale } from '../../components/PressableScale';
import { ConfettiBurst } from '../../components/motion/ConfettiBurst';
import { useThemeStore } from '../../store/useThemeStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { weatherService } from '../../services/weatherService';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ionIconName } from '../../utils/ionIcon';
import { hapticService } from '../../utils/haptics';
import { Fonts } from '../../theme/fonts';
import type { TodayStackScreenProps } from '../../navigation/screenProps';
import type { ClothingItem, OutfitEvent, WeatherData } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

type Props = TodayStackScreenProps<'Today'>;

type WeatherStatus = 'loading' | 'ready' | 'permission_denied' | 'unavailable';

const OCCASION_CHIPS = [
  { id: 'casual', label: 'Casual', icon: 'cafe-outline' },
  { id: 'work', label: 'Work', icon: 'briefcase-outline' },
  { id: 'date', label: 'Date', icon: 'heart-outline' },
  { id: 'party', label: 'Evening', icon: 'wine-outline' },
  { id: 'formal', label: 'Formal', icon: 'ribbon-outline' },
] as const;

const greetingForHour = (hour: number): string => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatDateLabel = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

export const TodayScreen = ({ navigation }: Props) => {
  const tabPad = useTabScreenPadding();
  const reducedMotion = useReducedMotion();
  const { currentTheme } = useThemeStore();
  const { items: wardrobeItems } = useWardrobeStore();
  const { user } = useAuthStore();
  const {
    generatedOutfit,
    outfitVariations,
    isGenerating,
    generateOutfit,
    generationError,
    clearGenerationError,
    todayOccasion,
    setTodayOccasion,
    setGeneratedOutfit,
  } = useOutfitStore();
  const recordOutfitWear = useOutfitStore((s) => s.recordOutfitWear);
  const calendar = useCalendarStore((s) => s.calendar);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>('loading');
  const [hasGeneratedThisSession, setHasGeneratedThisSession] = useState(false);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [isLoggingWear, setIsLoggingWear] = useState(false);
  const [showWearConfetti, setShowWearConfetti] = useState(false);
  const [swapSheetVisible, setSwapSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const heroParallaxStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return {};
    }
    return {
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 180], [0, 36], Extrapolate.CLAMP),
        },
        {
          scale: interpolate(scrollY.value, [-80, 0], [1.06, 1], Extrapolate.CLAMP),
        },
      ],
    };
  });

  const now = useMemo(() => new Date(), []);
  const greeting = greetingForHour(now.getHours());
  const dateLabel = formatDateLabel(now);

  const todaysEvent = useMemo<OutfitEvent | undefined>(() => {
    const today = now.toDateString();
    return calendar.events.find((e) => new Date(e.date).toDateString() === today);
  }, [calendar.events, now]);

  const loadWeather = useCallback(async (): Promise<void> => {
    setWeatherStatus('loading');
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWeather(null);
        setWeatherStatus('permission_denied');
        // Preserve canAskAgain for the chip handler via a module-level isn't needed —
        // request again on press; open settings if permanently denied.
        void canAskAgain;
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const data = await weatherService.getCurrentWeather(
        loc.coords.latitude,
        loc.coords.longitude
      );
      if (!data) {
        setWeather(null);
        setWeatherStatus('unavailable');
        return;
      }
      setWeather(data);
      setWeatherStatus('ready');
    } catch (err) {
      if (__DEV__) console.warn('[TodayScreen] loadWeather', err);
      setWeather(null);
      setWeatherStatus('unavailable');
    }
  }, []);

  const handleWeatherChipPress = useCallback(async () => {
    if (weatherStatus === 'permission_denied') {
      const current = await Location.getForegroundPermissionsAsync();
      if (!current.canAskAgain && current.status !== 'granted') {
        await Linking.openSettings();
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await loadWeather();
      } else {
        setWeatherStatus('permission_denied');
      }
      return;
    }
    if (weatherStatus === 'unavailable') {
      await loadWeather();
    }
  }, [loadWeather, weatherStatus]);

  const rankedOutfits = useMemo(() => {
    const list = [generatedOutfit, ...outfitVariations].filter(
      (o): o is NonNullable<typeof generatedOutfit> => o != null
    );
    return list;
  }, [generatedOutfit, outfitVariations]);

  const weatherPayload = useMemo(
    () =>
      weather ? { temperature: weather.temperature, condition: weather.condition } : undefined,
    [weather]
  );

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  useEffect(() => {
    if (weatherStatus === 'loading' || wardrobeItems.length === 0 || hasGeneratedThisSession)
      return;
    setHasGeneratedThisSession(true);
    void generateOutfit({ occasion: todayOccasion, weather: weatherPayload });
  }, [
    weatherStatus,
    wardrobeItems.length,
    hasGeneratedThisSession,
    generateOutfit,
    todayOccasion,
    weatherPayload,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      clearGenerationError();
      await Promise.all([
        loadWeather(),
        generateOutfit({ occasion: todayOccasion, weather: weatherPayload }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [clearGenerationError, generateOutfit, loadWeather, todayOccasion, weatherPayload]);

  const handleWear = useCallback(async () => {
    if (!generatedOutfit || isLoggingWear) return;
    setIsLoggingWear(true);
    try {
      await recordOutfitWear(generatedOutfit);
      setHasLoggedToday(true);
      hapticService.success();
      if (!reducedMotion) {
        setShowWearConfetti(true);
        setTimeout(() => setShowWearConfetti(false), 1400);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not log this outfit.';
      Alert.alert('Could not log wear', message);
    } finally {
      setIsLoggingWear(false);
    }
  }, [generatedOutfit, isLoggingWear, recordOutfitWear, reducedMotion]);

  const handleSwap = useCallback(() => {
    if (!generatedOutfit) return;
    setSwapSheetVisible(true);
  }, [generatedOutfit]);

  const handleSwapItem = useCallback(
    async (item: ClothingItem) => {
      setSwapSheetVisible(false);
      if (!generatedOutfit) return;
      const lockedIds = generatedOutfit.items
        .filter((piece) => piece.id !== item.id)
        .map((piece) => piece.id);
      try {
        clearGenerationError();
        await generateOutfit({
          occasion: todayOccasion,
          weather: weatherPayload,
          mustIncludeItemIds: lockedIds,
        });
        setHasLoggedToday(false);
      } catch (err) {
        if (__DEV__) console.warn('[TodayScreen] swap regenerate', err);
      }
    },
    [clearGenerationError, generateOutfit, generatedOutfit, todayOccasion, weatherPayload]
  );

  const handleGenerateAnother = useCallback(async () => {
    clearGenerationError();
    try {
      await generateOutfit({ occasion: todayOccasion, weather: weatherPayload });
      setHasLoggedToday(false);
    } catch (err) {
      if (__DEV__) console.warn('[TodayScreen] regenerate', err);
    }
  }, [clearGenerationError, generateOutfit, todayOccasion, weatherPayload]);

  const handleOccasionSelect = useCallback(
    async (occasionId: string) => {
      setTodayOccasion(occasionId);
      setHasGeneratedThisSession(false);
      setHasLoggedToday(false);
      clearGenerationError();
      try {
        await generateOutfit({ occasion: occasionId, weather: weatherPayload });
        setHasGeneratedThisSession(true);
      } catch (err) {
        if (__DEV__) console.warn('[TodayScreen] occasion regenerate', err);
      }
    },
    [clearGenerationError, generateOutfit, setTodayOccasion, weatherPayload]
  );

  const handleViewFullWardrobe = useCallback(() => {
    navigation.navigate('WardrobeHome');
  }, [navigation]);

  const weatherChipLabel = useMemo(() => {
    switch (weatherStatus) {
      case 'loading':
        return 'Loading weather…';
      case 'ready':
        return weather
          ? `${weather.temperature}°C · ${weather.condition}`
          : 'Weather unavailable · retry';
      case 'permission_denied':
        return 'Enable location for weather';
      case 'unavailable':
        return 'Weather unavailable · retry';
      default: {
        const _exhaustive: never = weatherStatus;
        return _exhaustive;
      }
    }
  }, [weather, weatherStatus]);

  const weatherChipPressable =
    weatherStatus === 'permission_denied' || weatherStatus === 'unavailable';

  if (wardrobeItems.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: currentTheme.colors.background }}
        edges={['top']}
      >
        <Screen>
          <View style={{ padding: 24, paddingTop: 32 }}>
            <Typography
              weight="500"
              style={{ color: currentTheme.colors.textSecondary, fontSize: 14 }}
            >
              {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
            </Typography>
            <Typography
              variant="header"
              weight="700"
              style={{
                color: currentTheme.colors.text,
                fontSize: 34,
                marginTop: 4,
                marginBottom: 8,
              }}
            >
              Today
            </Typography>
          </View>
          <EmptyStates.Wardrobe onScan={() => navigation.getParent()?.navigate('ScanStack')} />
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: currentTheme.colors.background }}
      edges={['top']}
    >
      <Screen>
        {showWearConfetti ? <ConfettiBurst originY={220} /> : null}
        <AnimatedScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: tabPad.paddingBottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={currentTheme.colors.primary}
            />
          }
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <Typography
              weight="500"
              style={{ color: currentTheme.colors.textSecondary, fontSize: 13 }}
            >
              {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
            </Typography>
            <Typography
              variant="header"
              weight="700"
              style={{
                color: currentTheme.colors.text,
                fontSize: 34,
                marginTop: 4,
              }}
            >
              {dateLabel}
            </Typography>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}
          >
            <ContextChip
              icon="sunny-outline"
              label={weatherChipLabel}
              onPress={weatherChipPressable ? handleWeatherChipPress : undefined}
            />
            {todaysEvent ? (
              <ContextChip icon="calendar-outline" label={todaysEvent.occasion ?? 'Event today'} />
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(140)} style={{ marginTop: 14 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                {OCCASION_CHIPS.map((chip) => (
                  <OccasionChip
                    key={chip.id}
                    id={chip.id}
                    label={chip.label}
                    icon={chip.icon}
                    selected={todayOccasion === chip.id}
                    onPress={handleOccasionSelect}
                  />
                ))}
              </View>
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(180)} style={{ marginTop: 28 }}>
            <Typography
              weight="500"
              style={{
                color: currentTheme.colors.textSecondary,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Today&apos;s look
            </Typography>

            {generationError && !isGenerating ? (
              <View
                style={{
                  borderRadius: 20,
                  padding: 20,
                  backgroundColor: currentTheme.colors.mutedSurface,
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                  gap: 12,
                }}
              >
                <Typography weight="700" style={{ color: currentTheme.colors.text, fontSize: 16 }}>
                  Couldn&apos;t build a look
                </Typography>
                <Typography
                  style={{ color: currentTheme.colors.textSecondary, fontSize: 14, lineHeight: 20 }}
                >
                  {generationError.message}
                </Typography>
                <SecondaryButton
                  title="Try again"
                  icon="refresh"
                  onPress={handleGenerateAnother}
                  accessibilityLabel="Try generating outfit again"
                />
              </View>
            ) : isGenerating && !generatedOutfit ? (
              <OutfitFlatLaySkeleton width={SCREEN_WIDTH - 40} itemCount={2} />
            ) : generatedOutfit ? (
              <View>
                <Typography
                  variant="header"
                  weight="700"
                  style={{
                    color: currentTheme.colors.text,
                    fontSize: 24,
                    marginBottom: 12,
                  }}
                >
                  {generatedOutfit.occasion ?? 'Curated for today'}
                </Typography>
                <Animated.View style={heroParallaxStyle}>
                  <OutfitFlatLay items={generatedOutfit.items} width={SCREEN_WIDTH - 40} />
                </Animated.View>

                {generatedOutfit.fitReasoning && generatedOutfit.fitReasoning.length > 0 ? (
                  <View style={{ marginTop: 16, gap: 6 }}>
                    <Typography
                      weight="500"
                      style={{
                        color: currentTheme.colors.textSecondary,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      Why this works
                    </Typography>
                    {generatedOutfit.fitReasoning.map((line) => (
                      <Typography
                        key={line}
                        style={{ color: currentTheme.colors.text, fontSize: 14, lineHeight: 20 }}
                      >
                        {line}
                      </Typography>
                    ))}
                  </View>
                ) : null}

                {rankedOutfits.length > 1 ? (
                  <View style={{ marginTop: 20 }}>
                    <Typography
                      weight="500"
                      style={{
                        color: currentTheme.colors.textSecondary,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 10,
                      }}
                    >
                      More suggestions
                    </Typography>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {rankedOutfits.map((look, index) => {
                          const isActive = look.id === generatedOutfit.id;
                          return (
                            <PressableScale
                              key={look.id}
                              onPress={() => setGeneratedOutfit(look)}
                              haptic="selection"
                              accessibilityRole="button"
                              accessibilityState={{ selected: isActive }}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                minHeight: 44,
                                justifyContent: 'center',
                                borderRadius: 16,
                                backgroundColor: isActive
                                  ? currentTheme.colors.primary
                                  : currentTheme.colors.mutedSurface,
                                borderWidth: 1.5,
                                borderColor: isActive
                                  ? currentTheme.colors.secondary
                                  : 'transparent',
                              }}
                            >
                              <Typography
                                weight="600"
                                style={{
                                  fontSize: 13,
                                  color: isActive
                                    ? currentTheme.colors.onPrimary
                                    : currentTheme.colors.text,
                                }}
                              >
                                Look {index + 1}
                              </Typography>
                            </PressableScale>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : (
              <OutfitFlatLaySkeleton width={SCREEN_WIDTH - 40} itemCount={2} />
            )}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(260)}
            style={{ marginTop: 24, gap: 12 }}
          >
            <PrimaryButton
              title={hasLoggedToday ? 'Logged for today' : isLoggingWear ? 'Logging…' : 'Wear it'}
              icon={hasLoggedToday ? 'checkmark-circle' : 'shirt-outline'}
              onPress={handleWear}
              loading={isLoggingWear}
              disabled={!generatedOutfit || isLoggingWear || hasLoggedToday}
              accessibilityLabel="Wear today's outfit"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <SecondaryButton
                  title="Swap one piece"
                  icon="swap-horizontal-outline"
                  onPress={handleSwap}
                  disabled={!generatedOutfit || isGenerating}
                  accessibilityLabel="Swap a single piece"
                />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton
                  title="Generate another"
                  icon="refresh"
                  onPress={handleGenerateAnother}
                  disabled={isGenerating}
                  loading={isGenerating}
                  accessibilityLabel="Generate another outfit"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(340)}
            style={{ marginTop: 32, alignItems: 'center' }}
          >
            <GhostButton
              title="View full wardrobe"
              icon="grid-outline"
              onPress={handleViewFullWardrobe}
              accessibilityLabel="View full wardrobe"
            />
          </Animated.View>
        </AnimatedScrollView>
      </Screen>

      <Modal
        visible={swapSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSwapSheetVisible(false)}
      >
        <Pressable
          onPress={() => setSwapSheetVisible(false)}
          style={{
            flex: 1,
            backgroundColor: currentTheme.colors.overlayStrong,
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: currentTheme.colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
              maxHeight: '70%',
            }}
          >
            <Typography
              weight="700"
              style={{
                color: currentTheme.colors.text,
                fontSize: 20,
                marginBottom: 4,
              }}
            >
              Swap a piece
            </Typography>
            <Typography
              style={{
                color: currentTheme.colors.textSecondary,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Tap an item to regenerate around the rest of today&apos;s look.
            </Typography>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingBottom: 16,
                }}
              >
                {generatedOutfit?.items.map((item) => (
                  <View key={item.id} style={{ width: (SCREEN_WIDTH - 64) / 3 }}>
                    <ClothingTile
                      item={item}
                      height={((SCREEN_WIDTH - 64) / 3) * 1.25}
                      onPress={() => handleSwapItem(item)}
                      showOverlay
                      accessibilityLabel={`Swap ${item.category}`}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

interface ContextChipProps {
  icon: string;
  label: string;
  onPress?: () => void;
}

const ContextChip = ({ icon, label, onPress }: ContextChipProps) => {
  const { currentTheme } = useThemeStore();
  const content = (
    <StyledView
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
        borderRadius: 18,
        backgroundColor: currentTheme.colors.mutedSurface,
        gap: 6,
      }}
    >
      <Ionicons name={ionIconName(icon)} size={14} color={currentTheme.colors.primary} />
      <Typography weight="600" style={{ color: currentTheme.colors.text, fontSize: 12 }}>
        {label}
      </Typography>
    </StyledView>
  );

  if (!onPress) {
    return <Animated.View entering={FadeIn.duration(300)}>{content}</Animated.View>;
  }

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <PressableScale onPress={onPress} haptic="selection" accessibilityRole="button">
        {content}
      </PressableScale>
    </Animated.View>
  );
};

interface OccasionChipProps {
  id: string;
  label: string;
  icon: string;
  selected: boolean;
  onPress: (id: string) => void;
}

const OccasionChip = ({ id, label, icon, selected, onPress }: OccasionChipProps) => {
  const { currentTheme } = useThemeStore();
  return (
    <PressableScale
      onPress={() => onPress(id)}
      haptic="selection"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 44,
        borderRadius: 20,
        backgroundColor: selected ? currentTheme.colors.primary : currentTheme.colors.mutedSurface,
        borderWidth: 1.5,
        borderColor: selected ? currentTheme.colors.secondary : 'transparent',
      }}
    >
      <Ionicons
        name={ionIconName(icon)}
        size={13}
        color={selected ? currentTheme.colors.onPrimary : currentTheme.colors.textSecondary}
      />
      <Typography
        weight="600"
        style={{
          fontSize: 12,
          fontFamily: Fonts.bodySemiBold,
          color: selected ? currentTheme.colors.onPrimary : currentTheme.colors.text,
        }}
      >
        {label}
      </Typography>
    </PressableScale>
  );
};
