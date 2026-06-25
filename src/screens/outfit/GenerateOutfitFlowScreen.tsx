import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { Screen, Typography } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { OUTFIT_OCCASION_IDS, OUTFIT_STYLE_MOOD_IDS } from '../../constants/outfitSignals';

const { width, height } = Dimensions.get('window');

const OCCASIONS = [
  { id: 'casual', label: 'Casual', icon: 'cafe-outline', color: '#10B981' },
  { id: 'work', label: 'Work', icon: 'briefcase-outline', color: '#4338CA' },
  { id: 'date', label: 'Date Night', icon: 'heart-outline', color: '#EC4899' },
  { id: 'party', label: 'Party', icon: 'flame-outline', color: '#F59E0B' },
  { id: 'sport', label: 'Active', icon: 'fitness-outline', color: '#3B82F6' },
  { id: 'formal', label: 'Formal', icon: 'ribbon-outline', color: '#8B5CF6' },
];

const STYLES = [
  { id: 'minimal', label: 'Minimalist' },
  { id: 'classic', label: 'Classic' },
  { id: 'trendy', label: 'Trendy' },
  { id: 'bold', label: 'Bold' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'elegant', label: 'Elegant' },
];

const COLORS = [
  { id: 'neutral', label: 'Neutrals', colors: ['#FFFFFF', '#000000', '#9CA3AF'] },
  { id: 'earth', label: 'Earth Tones', colors: ['#92400E', '#78350F', '#A3A3A3'] },
  { id: 'bright', label: 'Bright', colors: ['#EF4444', '#3B82F6', '#22C55E'] },
  { id: 'pastel', label: 'Pastels', colors: ['#FCA5A5', '#93C5FD', '#BBF7D0'] },
  { id: 'mono', label: 'Monochrome', colors: ['#1F2937', '#4B5563', '#9CA3AF'] },
];

const WEATHER = [
  { id: 'sunny', label: 'Sunny', icon: 'sunny-outline', temp: '75°F' },
  { id: 'cloudy', label: 'Cloudy', icon: 'cloudy-outline', temp: '65°F' },
  { id: 'rainy', label: 'Rainy', icon: 'rainy-outline', temp: '55°F' },
  { id: 'cold', label: 'Cold', icon: 'snow-outline', temp: '35°F' },
];

// Selection chip component
const SelectionChip = ({ label, selected, onPress, icon, color, delay = 0 }: any) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 12 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 12 });
    }, 100);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(delay)} style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderRadius: 16,
          backgroundColor: selected ? color || theme.colors.primary : theme.colors.surface,
          borderWidth: 2,
          borderColor: selected ? color || theme.colors.secondary : theme.colors.border,
          marginRight: 12,
          marginBottom: 12,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={selected ? '#FFFFFF' : theme.colors.textSecondary}
            style={{ marginRight: 8 }}
          />
        )}
        <Typography
          className="font-semibold"
          style={{ color: selected ? '#FFFFFF' : theme.colors.text }}
        >
          {label}
        </Typography>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Color palette chip
const ColorPaletteChip = ({ item, selected, onPress, delay = 0 }: any) => (
  <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: selected ? theme.colors.secondary : theme.colors.border,
        marginRight: 16,
        width: 100,
      }}
    >
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {item.colors.map((color: string, i: number) => (
          <View
            key={i}
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: color,
              marginLeft: i > 0 ? -8 : 0,
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}
          />
        ))}
      </View>
      <Typography
        className="text-xs font-medium"
        style={{ color: selected ? theme.colors.secondary : theme.colors.textSecondary }}
      >
        {item.label}
      </Typography>
    </TouchableOpacity>
  </Animated.View>
);

// Progress indicator
const ProgressIndicator = ({ step, totalSteps }: { step: number; totalSteps: number }) => (
  <Animated.View
    entering={FadeIn.duration(400)}
    style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}
  >
    {Array.from({ length: totalSteps }).map((_, i) => (
      <View
        key={i}
        style={{
          width: i <= step ? 32 : 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: i <= step ? theme.colors.secondary : theme.colors.border,
          marginHorizontal: 4,
        }}
      />
    ))}
  </Animated.View>
);

export const GenerateOutfitFlowScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(0);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<string | null>('sunny');

  const { generateOutfit, isGenerating } = useOutfitStore();
  const { items } = useWardrobeStore();

  // Ref for style auto-advance timer
  const styleAutoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance when occasion is selected
  const handleOccasionSelect = (occasionId: string) => {
    setSelectedOccasion(occasionId);
    // Auto-advance to next step after a brief delay for visual feedback
    setTimeout(() => {
      setStep(1);
    }, 300);
  };

  // Auto-advance when palette is selected
  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    // Auto-advance to generate after a brief delay, passing the palette directly
    setTimeout(() => {
      handleGenerateWithPalette(paletteId);
    }, 300);
  };

  const toggleStyle = (styleId: string) => {
    // Clear any existing auto-advance timer
    if (styleAutoAdvanceTimer.current) {
      clearTimeout(styleAutoAdvanceTimer.current);
    }

    setSelectedStyles((prev) => {
      const newStyles = prev.includes(styleId)
        ? prev.filter((s) => s !== styleId)
        : prev.length < 3
          ? [...prev, styleId]
          : prev;

      // Auto-advance after 1 second if at least one style is selected
      if (newStyles.length > 0) {
        styleAutoAdvanceTimer.current = setTimeout(() => {
          setStep(2);
        }, 1000);
      }

      return newStyles;
    });
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (styleAutoAdvanceTimer.current) {
        clearTimeout(styleAutoAdvanceTimer.current);
      }
    };
  }, []);

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleGenerateWithPalette = async (paletteId: string) => {
    generateOutfit({
      occasion: selectedOccasion,
      styles: selectedStyles,
      palette: paletteId,
      weather: selectedWeather,
      /** Shared ids with recommendation engine / outfitSignals */
      vocabulary: { occasions: [...OUTFIT_OCCASION_IDS], styleMoods: [...OUTFIT_STYLE_MOOD_IDS] },
    });
    navigation.replace('OutfitLoading');
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Animated.View entering={SlideInRight.duration(400)}>
            <Typography variant="header" className="text-3xl text-primary mb-2">
              What's the occasion?
            </Typography>
            <Typography className="text-gray-500 mb-8">
              Help us find the perfect outfit for your plans.
            </Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {OCCASIONS.map((occasion, index) => (
                <SelectionChip
                  key={occasion.id}
                  label={occasion.label}
                  icon={occasion.icon}
                  color={occasion.color}
                  selected={selectedOccasion === occasion.id}
                  onPress={() => handleOccasionSelect(occasion.id)}
                  delay={index * 50}
                />
              ))}
            </View>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View entering={SlideInRight.duration(400)}>
            <Typography variant="header" className="text-3xl text-primary mb-2">
              Choose your vibe
            </Typography>
            <Typography className="text-gray-500 mb-8">
              Select up to 3 style preferences.
            </Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {STYLES.map((style, index) => (
                <SelectionChip
                  key={style.id}
                  label={style.label}
                  selected={selectedStyles.includes(style.id)}
                  onPress={() => toggleStyle(style.id)}
                  delay={index * 50}
                />
              ))}
            </View>

            {/* Weather */}
            <Typography className="text-lg font-semibold text-primary mt-8 mb-4">
              Today's Weather
            </Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {WEATHER.map((weather, index) => (
                <TouchableOpacity
                  key={weather.id}
                  onPress={() => setSelectedWeather(weather.id)}
                  style={{
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor:
                      selectedWeather === weather.id ? theme.colors.primary : theme.colors.surface,
                    borderWidth: 2,
                    borderColor:
                      selectedWeather === weather.id ? theme.colors.secondary : theme.colors.border,
                    marginRight: 12,
                    width: 90,
                  }}
                >
                  <Ionicons
                    name={weather.icon as any}
                    size={28}
                    color={
                      selectedWeather === weather.id
                        ? theme.colors.secondary
                        : theme.colors.textSecondary
                    }
                    style={{ marginBottom: 8 }}
                  />
                  <Typography
                    className="text-xs font-semibold"
                    style={{
                      color: selectedWeather === weather.id ? '#FFFFFF' : theme.colors.text,
                    }}
                  >
                    {weather.label}
                  </Typography>
                  <Typography
                    className="text-xs"
                    style={{
                      color:
                        selectedWeather === weather.id
                          ? 'rgba(255,255,255,0.7)'
                          : theme.colors.textSecondary,
                    }}
                  >
                    {weather.temp}
                  </Typography>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View entering={SlideInRight.duration(400)}>
            <Typography variant="header" className="text-3xl text-primary mb-2">
              Color palette
            </Typography>
            <Typography className="text-gray-500 mb-8">
              What colors are you feeling today?
            </Typography>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 32 }}
            >
              {COLORS.map((palette, index) => (
                <ColorPaletteChip
                  key={palette.id}
                  item={palette}
                  selected={selectedPalette === palette.id}
                  onPress={() => handlePaletteSelect(palette.id)}
                  delay={index * 50}
                />
              ))}
            </ScrollView>

            {/* Preview wardrobe items */}
            <Typography className="text-lg font-semibold text-primary mb-4">
              Your Wardrobe ({items.length} items)
            </Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {items.slice(0, 5).map((item: any) => (
                <View
                  key={item.id}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    marginRight: 8,
                    marginBottom: 8,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 60, height: 60 }}
                    contentFit="cover"
                  />
                </View>
              ))}
              {items.length > 5 && (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    backgroundColor: theme.colors.surface,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Typography className="text-sm font-bold text-primary">
                    +{items.length - 5}
                  </Typography>
                </View>
              )}
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <Screen className="bg-background">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 20,
          paddingTop: 60,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ProgressIndicator step={step} totalSteps={3} />
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 16,
          }}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </Screen>
  );
};
