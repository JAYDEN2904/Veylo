import React, { useEffect, useState, useMemo } from 'react';
import type { ListRenderItem } from 'react-native';
import { TouchableOpacity, ScrollView, Dimensions, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, Typography, StyledView, ClothingTile } from '../../components/common';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { weatherService } from '../../services/weatherService';
import { WeatherData, ClothingItem } from '../../types';
import type { WardrobeStackScreenProps } from '../../navigation/screenProps';
import * as Location from 'expo-location';
import { EmptyStates } from '../../components/EmptyState';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { normalizeCategory } from '../../services/outfitCategoryNormalize';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding
const CARD_HEIGHT = CARD_WIDTH * 1.2; // Slightly taller than wide

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear'];

type Props = WardrobeStackScreenProps<'WardrobeHome'>;

export const WardrobeHomeScreen = ({ navigation }: Props) => {
  const tabPad = useTabScreenPadding();
  const { items } = useWardrobeStore();
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    setWeatherLoading(true);
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Location permission denied');
        // Use user's saved location or default to San Francisco
        const defaultLat = 37.7749;
        const defaultLon = -122.4194;
        const weatherData = await weatherService.getCurrentWeather(defaultLat, defaultLon);
        setWeather(weatherData);
        setWeatherLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const weatherData = await weatherService.getCurrentWeather(
        location.coords.latitude,
        location.coords.longitude
      );

      setWeather(weatherData);

      // Update user location if available
      if (user && weatherData) {
        // This would update user location in auth store
        // await useAuthStore.getState().updateUser({
        //   location: {
        //     latitude: location.coords.latitude,
        //     longitude: location.coords.longitude,
        //   }
        // });
      }
    } catch (error) {
      console.error('Error loading weather:', error);
      // Fallback to mock/default weather
      const defaultLat = 37.7749;
      const defaultLon = -122.4194;
      const weatherData = await weatherService.getCurrentWeather(defaultLat, defaultLon);
      setWeather(weatherData);
    } finally {
      setWeatherLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return items.filter((item) => normalizeCategory(item.category) === selectedCategory);
  }, [items, selectedCategory]);

  const renderCategoryPill = (category: string) => {
    const isSelected = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category}
        onPress={() => setSelectedCategory(category)}
        accessibilityRole="button"
        accessibilityLabel={`Filter by ${category}`}
        style={{
          backgroundColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.surface,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 30,
          marginRight: 10,
          borderWidth: 1,
          borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
        }}
      >
        <Typography
          style={{
            color: isSelected ? currentTheme.colors.onPrimary : currentTheme.colors.textSecondary,
            fontWeight: isSelected ? '600' : '400',
            fontSize: 14,
          }}
        >
          {category}
        </Typography>
      </TouchableOpacity>
    );
  };

  const renderItem: ListRenderItem<ClothingItem> = ({ item, index }) => (
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: currentTheme.colors.background }}
      edges={['top']}
    >
      <Screen>
        <StyledView className="px-5 pt-6 pb-3">
          <StyledView className="flex-row justify-between items-center mb-5">
            <StyledView>
              <Typography
                style={{
                  color: currentTheme.colors.textSecondary,
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                Good Morning,
              </Typography>
              <Typography
                variant="header"
                style={{ color: currentTheme.colors.text, fontSize: 24, fontWeight: '700' }}
              >
                {user?.name?.split(' ')[0] ?? 'there'}
              </Typography>
            </StyledView>
            <StyledView style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Collections')}
                accessibilityRole="button"
                accessibilityLabel="Collections"
                style={{
                  backgroundColor: currentTheme.colors.surface,
                  padding: 10,
                  borderRadius: 50,
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                }}
              >
                <Ionicons name="folder" size={22} color={currentTheme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('WardrobeSearch')}
                accessibilityRole="button"
                accessibilityLabel="Search wardrobe"
                style={{
                  backgroundColor: currentTheme.colors.surface,
                  padding: 10,
                  borderRadius: 50,
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                }}
              >
                <Ionicons name="search" size={22} color={currentTheme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('OutfitOrganization')}
                accessibilityRole="button"
                accessibilityLabel="Organize outfits"
                style={{
                  backgroundColor: currentTheme.colors.surface,
                  padding: 10,
                  borderRadius: 50,
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                }}
              >
                <Ionicons name="shirt" size={22} color={currentTheme.colors.primary} />
              </TouchableOpacity>
            </StyledView>
          </StyledView>

          <LinearGradient
            colors={[currentTheme.colors.primary, currentTheme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, padding: 16, marginBottom: 20 }}
          >
            <StyledView className="flex-row justify-between items-center">
              <StyledView style={{ flex: 1 }}>
                {weatherLoading ? (
                  <>
                    <Typography
                      style={{
                        color: currentTheme.colors.secondary,
                        fontWeight: '700',
                        fontSize: 16,
                        marginBottom: 4,
                      }}
                    >
                      Loading weather...
                    </Typography>
                    <Typography
                      style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18 }}
                    >
                      Getting your local forecast
                    </Typography>
                  </>
                ) : weather ? (
                  <>
                    <Typography
                      style={{
                        color: currentTheme.colors.secondary,
                        fontWeight: '700',
                        fontSize: 16,
                        marginBottom: 4,
                      }}
                    >
                      {weather.temperature}°F • {weather.condition}
                    </Typography>
                    <Typography
                      style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18 }}
                    >
                      {weatherService.getWeatherOutfitDescription(weather)}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography
                      style={{
                        color: currentTheme.colors.secondary,
                        fontWeight: '700',
                        fontSize: 16,
                        marginBottom: 4,
                      }}
                    >
                      Weather unavailable
                    </Typography>
                    <Typography
                      style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18 }}
                    >
                      Enable location to get weather-based recommendations
                    </Typography>
                  </>
                )}
              </StyledView>
              <Ionicons
                name={(weather?.icon as never) || 'partly-sunny'}
                size={28}
                color={currentTheme.colors.secondary}
                style={{ marginLeft: 12 }}
              />
            </StyledView>
          </LinearGradient>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {CATEGORIES.map(renderCategoryPill)}
          </ScrollView>
        </StyledView>

        {/* Grid — ScrollView instead of FlatList: RN FlatList was mounting with undefined props (_checkProps / getItem crash). */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: tabPad.paddingBottom,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={weatherLoading}
              onRefresh={loadWeather}
              tintColor={currentTheme.colors.primary}
            />
          }
        >
          {filteredItems.length === 0 ? (
            <EmptyStates.Wardrobe
              onScan={() =>
                navigation.getParent()?.navigate('ScanStack', { screen: 'LiveCameraScan' })
              }
            />
          ) : (
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}
            >
              {filteredItems.map((item, index) =>
                renderItem({
                  item,
                  index,
                  separators: {
                    highlight: () => {},
                    unhighlight: () => {},
                    updateProps: () => {},
                  },
                })
              )}
            </View>
          )}
        </ScrollView>
      </Screen>
    </SafeAreaView>
  );
};
