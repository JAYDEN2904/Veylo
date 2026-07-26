import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Screen,
  Typography,
  StyledView,
  StyledTouchableOpacity,
  Card,
} from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';

const { width } = Dimensions.get('window');

const StatCard = ({ icon, label, value, color, delay = 0, onPress }: any) => {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(delay)} style={animatedStyle}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Card
          className="p-5 mb-4 border-0 shadow-lg"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <StyledView className="flex-row items-center justify-between">
            <StyledView className="flex-1">
              <Typography className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">
                {label}
              </Typography>
              <Typography variant="header" className="text-3xl text-primary">
                {value}
              </Typography>
            </StyledView>
            <LinearGradient
              colors={[color, color + 'CC']}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name={icon} size={28} color="#FFF" />
            </LinearGradient>
          </StyledView>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
};

const CategoryBreakdown = ({ data }: any) => {
  const maxValue = Math.max(...Object.values(data).map((v: any) => v));

  return (
    <Card className="p-5 mb-4 border-0 shadow-lg">
      <Typography variant="header" className="text-xl mb-4 text-primary">
        Category Breakdown
      </Typography>
      {Object.entries(data).map(([category, count]: [string, any], index) => {
        const percentage = (count / maxValue) * 100;
        return (
          <Animated.View
            key={category}
            entering={FadeInDown.duration(400).delay(index * 100)}
            style={{ marginBottom: 16 }}
          >
            <StyledView className="flex-row items-center justify-between mb-2">
              <Typography className="text-gray-700 font-medium">{category}</Typography>
              <Typography className="text-primary font-bold">{count}</Typography>
            </StyledView>
            <StyledView
              style={{
                height: 8,
                backgroundColor: theme.colors.background,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <Animated.View
                entering={FadeInDown.duration(600).delay(index * 100 + 200)}
                style={{
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: theme.colors.accent,
                  borderRadius: 4,
                }}
              />
            </StyledView>
          </Animated.View>
        );
      })}
    </Card>
  );
};

export const AnalyticsDashboardScreen = ({ navigation }: any) => {
  const { items } = useWardrobeStore();
  const { outfits } = useOutfitStore();
  const tabPad = useTabScreenPadding();
  const [refreshing, setRefreshing] = useState(false);

  const totalItems = items.length;
  const totalOutfits = outfits.length;
  const mostWorn = useMemo(
    () => [...items].sort((a, b) => (b.wornCount ?? 0) - (a.wornCount ?? 0)).slice(0, 3),
    [items]
  );
  const categoryBreakdown = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {}),
    [items]
  );

  const stats = [
    {
      icon: 'shirt',
      label: 'Total Items',
      value: totalItems,
      color: theme.colors.accent,
      onPress: () => navigation.getParent()?.navigate('TodayStack', { screen: 'WardrobeHome' }),
    },
    {
      icon: 'albums',
      label: 'Outfits',
      value: totalOutfits,
      color: theme.colors.secondary,
      onPress: () => navigation.getParent()?.navigate('OutfitsStack', { screen: 'OutfitHome' }),
    },
    {
      icon: 'calendar',
      label: 'This Month',
      value: '12',
      color: '#10B981',
      onPress: () => {},
    },
    {
      icon: 'trending-up',
      label: 'Most Worn',
      value: mostWorn[0]?.wornCount || 0,
      color: '#F59E0B',
      onPress: () => navigation.navigate('ItemTimeline'),
    },
  ];

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: tabPad.paddingTop,
          paddingBottom: tabPad.paddingBottom,
        }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <StyledView className="flex-row items-center justify-between mb-6">
            <StyledView>
              <Typography variant="header" className="text-4xl text-primary mb-1">
                Closet stats
              </Typography>
              <Typography className="text-gray-500 text-base">Charts and breakdowns</Typography>
            </StyledView>
            <TouchableOpacity
              onPress={() => navigation.navigate('ClosetComposition')}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: theme.colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name="stats-chart" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </StyledView>
        </Animated.View>

        {/* Stats Grid */}
        <StyledView>
          {stats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} delay={index * 100} />
          ))}
        </StyledView>

        {/* Category Breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <CategoryBreakdown data={categoryBreakdown} />
        )}

        {/* Most Worn Items */}
        {mostWorn.length > 0 && (
          <Card className="p-5 mb-4 border-0 shadow-lg">
            <Typography variant="header" className="text-xl mb-4 text-primary">
              Most Worn Items
            </Typography>
            {mostWorn.map((item: any, index: number) => (
              <Animated.View key={item.id} entering={FadeInDown.duration(400).delay(index * 100)}>
                <TouchableOpacity
                  onPress={() =>
                    navigation
                      .getParent()
                      ?.getParent()
                      ?.navigate('ItemDetails', { itemId: item.id })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < mostWorn.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <StyledView
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: theme.colors.background,
                      marginRight: 12,
                    }}
                  />
                  <StyledView className="flex-1">
                    <Typography className="text-primary font-semibold">{item.category}</Typography>
                    <Typography className="text-gray-500 text-sm">
                      {item.brand || 'No Brand'}
                    </Typography>
                  </StyledView>
                  <StyledView className="items-end">
                    <Typography className="text-primary font-bold">{item.wornCount}x</Typography>
                    <Typography className="text-gray-400 text-xs">worn</Typography>
                  </StyledView>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Card>
        )}

        {/* Quick Actions */}
        <StyledView className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={() => navigation.navigate('ClosetComposition')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="pie-chart"
              size={24}
              color={theme.colors.accent}
              style={{ marginBottom: 8 }}
            />
            <Typography className="text-sm font-semibold text-primary">Composition</Typography>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ItemTimeline')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="time"
              size={24}
              color={theme.colors.secondary}
              style={{ marginBottom: 8 }}
            />
            <Typography className="text-sm font-semibold text-primary">Timeline</Typography>
          </TouchableOpacity>
        </StyledView>

        {/* Shopping & gaps */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Recommendations')}
          style={{
            padding: 20,
            borderRadius: 16,
            backgroundColor: theme.colors.primary,
            marginTop: 12,
          }}
        >
          <StyledView
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <StyledView style={{ flex: 1 }}>
              <Typography
                style={{
                  color: theme.colors.secondary,
                  fontWeight: '700',
                  fontSize: 18,
                  marginBottom: 4,
                }}
              >
                Shopping & gaps
              </Typography>
              <Typography style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                Pairings, purchase ideas, and what to add next
              </Typography>
            </StyledView>
            <Ionicons name="arrow-forward" size={24} color={theme.colors.secondary} />
          </StyledView>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};
