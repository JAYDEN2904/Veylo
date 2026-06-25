import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, FlatList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card, StyledImage } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

const TimelineItem = ({ item, index }: any) => {
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isThisWeek(date)) return format(date, 'EEEE');
    if (isThisMonth(date)) return format(date, 'MMM d');
    return format(date, 'MMM d, yyyy');
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
      <Card className="p-4 mb-4 border-0 shadow-lg">
        <StyledView className="flex-row">
          <StyledView
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              backgroundColor: theme.colors.background,
              marginRight: 16,
            }}
          />
          <StyledView className="flex-1">
            <Typography className="text-primary font-semibold text-lg mb-1">
              {item.category}
            </Typography>
            <Typography className="text-gray-500 text-sm mb-2">
              {item.brand || 'No Brand'}
            </Typography>
            <StyledView className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Typography className="text-gray-500 text-xs ml-1">
                Last worn: {item.lastWorn ? formatDate(item.lastWorn) : 'Never'}
              </Typography>
            </StyledView>
            <StyledView className="flex-row items-center mt-2">
              <Ionicons name="repeat-outline" size={16} color={theme.colors.accent} />
              <Typography className="text-accent text-xs ml-1 font-semibold">
                Worn {item.wornCount} {item.wornCount === 1 ? 'time' : 'times'}
              </Typography>
            </StyledView>
          </StyledView>
        </StyledView>
      </Card>
    </Animated.View>
  );
};

export const ItemTimelineScreen = ({ navigation }: any) => {
  const { items } = useWardrobeStore();
  const [sortBy, setSortBy] = useState<'recent' | 'most-worn' | 'least-worn'>('recent');

  const sortedItems = [...items].sort((a: any, b: any) => {
    if (sortBy === 'most-worn') return b.wornCount - a.wornCount;
    if (sortBy === 'least-worn') return a.wornCount - b.wornCount;
    // Recent by last worn date
    if (!a.lastWorn && !b.lastWorn) return 0;
    if (!a.lastWorn) return 1;
    if (!b.lastWorn) return -1;
    return new Date(b.lastWorn).getTime() - new Date(a.lastWorn).getTime();
  });

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
            Item Timeline
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Track when and how often you wear items
          </Typography>
        </Animated.View>

        {/* Sort Options */}
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
              { key: 'recent', label: 'Recent' },
              { key: 'most-worn', label: 'Most Worn' },
              { key: 'least-worn', label: 'Least Worn' },
            ].map((option) => {
              const isSelected = sortBy === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setSortBy(option.key as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    className="font-semibold text-sm"
                    style={{ color: isSelected ? '#FFF' : theme.colors.textSecondary }}
                  >
                    {option.label}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </StyledView>
        </Animated.View>

        {/* Timeline List */}
        {sortedItems.length > 0 ? (
          sortedItems.map((item: any, index: number) => (
            <TimelineItem key={item.id} item={item} index={index} />
          ))
        ) : (
          <Card className="p-8 border-0 shadow-lg">
            <StyledView className="items-center">
              <Ionicons
                name="time-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.3, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center mb-2">No items yet</Typography>
              <Typography className="text-gray-400 text-center text-sm">
                Start adding items to track your wearing patterns
              </Typography>
            </StyledView>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
};
