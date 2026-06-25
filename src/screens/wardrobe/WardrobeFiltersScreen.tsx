import React, { useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Screen,
  Typography,
  Button,
  StyledView,
  StyledTouchableOpacity,
} from '../../components/common';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Navy', value: '#1E3A8A' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Brown', value: '#92400E' },
  { name: 'Beige', value: '#F5F5DC' },
];

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

export const WardrobeFiltersScreen = ({ navigation, route }: any) => {
  const { filters, setFilter } = useWardrobeStore();
  const [selectedColors, setSelectedColors] = useState<string[]>(
    filters.color ? [filters.color] : []
  );
  const [selectedSeason, setSelectedSeason] = useState<string | null>(filters.season || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(filters.category || null);

  const handleApply = () => {
    if (selectedColors.length > 0) {
      setFilter('color', selectedColors[0]);
    } else {
      setFilter('color', undefined);
    }
    setFilter('season', selectedSeason || undefined);
    setFilter('category', selectedCategory || undefined);
    navigation.goBack();
  };

  const handleClear = () => {
    setSelectedColors([]);
    setSelectedSeason(null);
    setSelectedCategory(null);
    setFilter('color', undefined);
    setFilter('season', undefined);
    setFilter('category', undefined);
  };

  const toggleColor = (color: string) => {
    setSelectedColors(
      (prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [color]) // Single selection
    );
  };

  return (
    <Screen className="bg-background">
      {/* Header */}
      <StyledView
        style={{
          padding: 24,
          paddingTop: 60,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Typography variant="header" className="text-2xl text-primary">
          Filters
        </Typography>
        <TouchableOpacity onPress={handleClear}>
          <Typography className="text-accent font-semibold">Clear</Typography>
        </TouchableOpacity>
      </StyledView>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        {/* Category Filter */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Typography className="text-lg font-semibold text-primary mb-4">Category</Typography>
          <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            {['All', 'Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear'].map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 24,
                  backgroundColor:
                    selectedCategory === cat || (cat === 'All' && selectedCategory === null)
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderWidth: 2,
                  borderColor:
                    selectedCategory === cat || (cat === 'All' && selectedCategory === null)
                      ? theme.colors.secondary
                      : theme.colors.border,
                }}
              >
                <Typography
                  className="text-sm font-semibold"
                  style={{
                    color:
                      selectedCategory === cat || (cat === 'All' && selectedCategory === null)
                        ? '#FFF'
                        : theme.colors.text,
                  }}
                >
                  {cat}
                </Typography>
              </TouchableOpacity>
            ))}
          </StyledView>
        </Animated.View>

        {/* Color Filter */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Typography className="text-lg font-semibold text-primary mb-4">Color</Typography>
          <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            {COLORS.map((color) => {
              const isSelected = selectedColors.includes(color.name);
              return (
                <TouchableOpacity
                  key={color.name}
                  onPress={() => toggleColor(color.name)}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: color.value,
                    borderWidth: 3,
                    borderColor: isSelected ? theme.colors.secondary : theme.colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={24}
                      color={color.value === '#FFFFFF' ? theme.colors.primary : '#FFF'}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </StyledView>
        </Animated.View>

        {/* Season Filter */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Typography className="text-lg font-semibold text-primary mb-4">Season</Typography>
          <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            {SEASONS.map((season) => {
              const isSelected = selectedSeason === season;
              return (
                <TouchableOpacity
                  key={season}
                  onPress={() => setSelectedSeason(isSelected ? null : season)}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 24,
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderWidth: 2,
                    borderColor: isSelected ? theme.colors.secondary : theme.colors.border,
                  }}
                >
                  <Typography
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? '#FFF' : theme.colors.text }}
                  >
                    {season}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </StyledView>
        </Animated.View>
      </ScrollView>

      {/* Apply Button */}
      <StyledView
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 24,
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <Button
          title="Apply Filters"
          onPress={handleApply}
          className="shadow-lg shadow-indigo-500/20"
        />
      </StyledView>
    </Screen>
  );
};
