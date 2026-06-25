import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';

const { width } = Dimensions.get('window');

const PieSegment = ({ percentage, color, label, delay = 0 }: any) => {
  const scale = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={animatedStyle}
      className="flex-row items-center mb-4"
    >
      <StyledView
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: color,
          marginRight: 12,
        }}
      />
      <StyledView className="flex-1">
        <StyledView className="flex-row items-center justify-between mb-1">
          <Typography className="text-primary font-semibold">{label}</Typography>
          <Typography className="text-gray-600 font-bold">{percentage}%</Typography>
        </StyledView>
        <StyledView
          style={{
            height: 6,
            backgroundColor: theme.colors.background,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: color,
              borderRadius: 3,
            }}
          />
        </StyledView>
      </StyledView>
    </Animated.View>
  );
};

export const ClosetCompositionScreen = ({ navigation }: any) => {
  const { items } = useWardrobeStore();
  const [viewMode, setViewMode] = useState<'category' | 'color' | 'season'>('category');

  const categoryData = items.reduce((acc: any, item: any) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const colorData = items.reduce((acc: any, item: any) => {
    item.colors.forEach((color: string) => {
      acc[color] = (acc[color] || 0) + 1;
    });
    return acc;
  }, {});

  const total = items.length;
  const colors = [
    theme.colors.accent,
    theme.colors.secondary,
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
  ];

  const getDataForView = () => {
    if (viewMode === 'category') return categoryData;
    if (viewMode === 'color') return colorData;
    return {};
  };

  const data = getDataForView();
  const entries = Object.entries(data)
    .map(([key, value]: [string, any]) => ({
      label: key,
      count: value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 24, width: 40 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-4xl text-primary mb-2">
            Closet Composition
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Visualize your wardrobe breakdown
          </Typography>
        </Animated.View>

        {/* View Mode Selector */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <StyledView
            style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 4,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            {[
              { key: 'category', label: 'Category' },
              { key: 'color', label: 'Color' },
              { key: 'season', label: 'Season' },
            ].map((mode) => {
              const isSelected = viewMode === mode.key;
              return (
                <TouchableOpacity
                  key={mode.key}
                  onPress={() => setViewMode(mode.key as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    className="font-semibold"
                    style={{ color: isSelected ? '#FFF' : theme.colors.textSecondary }}
                  >
                    {mode.label}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </StyledView>
        </Animated.View>

        {/* Summary Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Card className="p-6 mb-6 border-0 shadow-lg">
            <LinearGradient
              colors={[theme.colors.primary, '#2A2D31']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 24,
                alignItems: 'center',
              }}
            >
              <Typography className="text-gray-300 text-sm mb-2 uppercase tracking-wide">
                Total Items
              </Typography>
              <Typography variant="header" className="text-5xl text-secondary mb-4">
                {total}
              </Typography>
              <Typography className="text-gray-400 text-sm text-center">
                {viewMode === 'category' && 'Across all categories'}
                {viewMode === 'color' && 'In various colors'}
                {viewMode === 'season' && 'For all seasons'}
              </Typography>
            </LinearGradient>
          </Card>
        </Animated.View>

        {/* Breakdown List */}
        <Card className="p-5 border-0 shadow-lg">
          <Typography variant="header" className="text-xl mb-6 text-primary">
            Breakdown
          </Typography>
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <PieSegment
                key={entry.label}
                percentage={entry.percentage}
                color={colors[index % colors.length]}
                label={`${entry.label} (${entry.count})`}
                delay={index * 100}
              />
            ))
          ) : (
            <StyledView className="items-center py-8">
              <Ionicons
                name="pie-chart-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.3, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center">No data available</Typography>
            </StyledView>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
};
