import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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
import { useThemeStore } from '../../store/useThemeStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { weatherService } from '../../services/weatherService';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { ionIconName } from '../../utils/ionIcon';
import type { TodayStackScreenProps } from '../../navigation/screenProps';
import type { ClothingItem, OutfitEvent, WeatherData } from '../../types';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = TodayStackScreenProps<'Today'>;

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
  const { currentTheme } = useThemeStore();
  const { items: wardrobeItems } = useWardrobeStore();
  const { user } = useAuthStore();
  const {
    generatedOutfit,
    outfitVariations,
    isGenerating,
    generateOutfit,
    todayOccasion,
    setTodayOccasion,
    setGeneratedOutfit,
  } = useOutfitStore();
  const recordOutfitWear = useOutfitStore((s) => s.recordOutfitWear);
  const calendar = useCalendarStore((s) => s.calendar);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherAttempted, setWeatherAttempted] = useState(false);
  const [hasGeneratedThisSession, setHasGeneratedThisSession] = useState(false);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [isLoggingWear, setIsLoggingWear] = useState(false);
  const [swapSheetVisible, setSwapSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const now = useMemo(() => new Date(), []);
  const greeting = greetingForHour(now.getHours());
  const dateLabel = formatDateLabel(now);

  const todaysEvent = useMemo<OutfitEvent | undefined>(() => {
    const today = now.toDateString();
    return calendar.events.find((e) => new Date(e.date).toDateString() === today);
  }, [calendar.events, now]);

  const loadWeather = useCallback(async (): Promise<void> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWeather(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const data = await weatherService.getCurrentWeather(
        loc.coords.latitude,
        loc.coords.longitude
      );
      setWeather(data);
    } catch (err) {
      if (__DEV__) console.warn('[TodayScreen] loadWeather', err);
      setWeather(null);
    } finally {
      setWeatherAttempted(true);
    }
  }, []);

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
    if (!weatherAttempted || wardrobeItems.length === 0 || hasGeneratedThisSession) return;
    setHasGeneratedThisSession(true);
    void generateOutfit({ occasion: todayOccasion, weather: weatherPayload });
  }, [
    weatherAttempted,
    wardrobeItems.length,
    hasGeneratedThisSession,
    generateOutfit,
    todayOccasion,
    weatherPayload,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadWeather(),
        generateOutfit({ occasion: todayOccasion, weather: weatherPayload }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [generateOutfit, loadWeather, todayOccasion]);

  const handleWear = useCallback(async () => {
    if (!generatedOutfit || isLoggingWear) return;
    setIsLoggingWear(true);
    try {
      await recordOutfitWear(generatedOutfit);
      setHasLoggedToday(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not log this outfit.';
      Alert.alert('Could not log wear', message);
    } finally {
      setIsLoggingWear(false);
    }
  }, [generatedOutfit, isLoggingWear, recordOutfitWear]);

  const handleSwap = useCallback(() => {
    if (!generatedOutfit) return;
    setSwapSheetVisible(true);
  }, [generatedOutfit]);

  const handleSwapItem = useCallback(
    async (_item: ClothingItem) => {
      setSwapSheetVisible(false);
      try {
        await generateOutfit({ occasion: todayOccasion, weather: weatherPayload });
        setHasLoggedToday(false);
      } catch (err) {
        if (__DEV__) console.warn('[TodayScreen] swap regenerate', err);
      }
    },
    [generateOutfit, todayOccasion, weatherPayload]
  );

  const handleGenerateAnother = useCallback(async () => {
    try {
      await generateOutfit({ occasion: todayOccasion, weather: weatherPayload });
      setHasLoggedToday(false);
    } catch (err) {
      if (__DEV__) console.warn('[TodayScreen] regenerate', err);
    }
  }, [generateOutfit, todayOccasion]);

  const handleOccasionSelect = useCallback(
    async (occasionId: string) => {
      setTodayOccasion(occasionId);
      setHasGeneratedThisSession(false);
      setHasLoggedToday(false);
      try {
        await generateOutfit({ occasion: occasionId, weather: weatherPayload });
        setHasGeneratedThisSession(true);
      } catch (err) {
        if (__DEV__) console.warn('[TodayScreen] occasion regenerate', err);
      }
    },
    [generateOutfit, setTodayOccasion, weatherPayload]
  );

  const handleViewFullWardrobe = useCallback(() => {
    navigation.navigate('WardrobeHome');
  }, [navigation]);

  if (wardrobeItems.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: currentTheme.colors.background }}
        edges={['top']}
      >
        <Screen>
          <View style={{ padding: 24, paddingTop: 32 }}>
            <Typography
              style={{ color: currentTheme.colors.textSecondary, fontSize: 14, fontWeight: '500' }}
            >
              {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
            </Typography>
            <Typography
              variant="header"
              style={{
                color: currentTheme.colors.text,
                fontSize: 34,
                fontWeight: '700',
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
        <ScrollView
          showsVerticalScrollIndicator={false}
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
              style={{ color: currentTheme.colors.textSecondary, fontSize: 13, fontWeight: '500' }}
            >
              {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
            </Typography>
            <Typography
              variant="header"
              style={{
                color: currentTheme.colors.text,
                fontSize: 34,
                fontWeight: '700',
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
              label={
                weather ? `${weather.temperature}°F · ${weather.condition}` : 'Loading weather…'
              }
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

            {isGenerating && !generatedOutfit ? (
              <HeroPlaceholder theme={currentTheme} />
            ) : generatedOutfit ? (
              <View>
                <Typography
                  style={{
                    color: currentTheme.colors.text,
                    fontSize: 24,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  {generatedOutfit.occasion ?? 'Curated for today'}
                </Typography>
                <OutfitFlatLay items={generatedOutfit.items} width={SCREEN_WIDTH - 40} />

                {generatedOutfit.fitReasoning && generatedOutfit.fitReasoning.length > 0 ? (
                  <View style={{ marginTop: 16, gap: 6 }}>
                    <Typography
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
                            <Pressable
                              key={look.id}
                              onPress={() => setGeneratedOutfit(look)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isActive }}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
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
                                style={{
                                  fontSize: 13,
                                  fontWeight: '600',
                                  color: isActive ? '#FFF' : currentTheme.colors.text,
                                }}
                              >
                                Look {index + 1}
                              </Typography>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : (
              <HeroPlaceholder theme={currentTheme} />
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
        </ScrollView>
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
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: currentTheme.colors.border,
                marginBottom: 16,
              }}
            />
            <Typography
              style={{
                color: currentTheme.colors.text,
                fontSize: 20,
                fontWeight: '700',
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
}

const ContextChip = ({ icon, label }: ContextChipProps) => {
  const { currentTheme } = useThemeStore();
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <StyledView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 18,
          backgroundColor: currentTheme.colors.mutedSurface,
          gap: 6,
        }}
      >
        <Ionicons name={ionIconName(icon)} size={14} color={currentTheme.colors.primary} />
        <Typography style={{ color: currentTheme.colors.text, fontSize: 12, fontWeight: '600' }}>
          {label}
        </Typography>
      </StyledView>
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
    <Pressable
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: selected ? currentTheme.colors.primary : currentTheme.colors.mutedSurface,
        borderWidth: 1.5,
        borderColor: selected ? currentTheme.colors.secondary : 'transparent',
      }}
    >
      <Ionicons
        name={ionIconName(icon)}
        size={13}
        color={selected ? '#FFF' : currentTheme.colors.textSecondary}
      />
      <Typography
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: selected ? '#FFF' : currentTheme.colors.text,
        }}
      >
        {label}
      </Typography>
    </Pressable>
  );
};

const HeroPlaceholder = ({
  theme,
}: {
  theme: ReturnType<typeof useThemeStore.getState>['currentTheme'];
}) => (
  <View
    style={{
      width: SCREEN_WIDTH - 40,
      height: (SCREEN_WIDTH - 40) * 1.1,
      borderRadius: 24,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Ionicons name={ionIconName('sparkles-outline')} size={36} color={theme.colors.iconMuted} />
    <Typography
      style={{
        marginTop: 12,
        color: theme.colors.textSecondary,
        fontSize: 13,
      }}
    >
      Putting together a look…
    </Typography>
  </View>
);
