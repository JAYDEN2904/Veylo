import React, { useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Screen,
  Typography,
  Button,
  Input,
  StyledView,
  StyledTouchableOpacity,
} from '../../components/common';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import type { ClothingItem } from '../../types';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { namedColorsToHsl } from '../../utils/hslColor';

const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear', 'Dresses', 'Bags'];
const COLORS = [
  'Black',
  'White',
  'Gray',
  'Navy',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Pink',
  'Purple',
  'Brown',
  'Beige',
];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

export const EditItemScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const { items, updateItem } = useWardrobeStore();
  const item = items.find((i) => i.id === route.params?.id);

  const [category, setCategory] = useState(item?.category || '');
  const [brand, setBrand] = useState(item?.brand || '');
  const [selectedColors, setSelectedColors] = useState<string[]>(item?.colors || []);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(item?.season || []);
  const [tags, setTags] = useState(item?.tags?.join(', ') || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [isLoading, setIsLoading] = useState(false);

  if (!item) {
    return (
      <Screen className="bg-background justify-center items-center">
        <Typography className="text-gray-500">Item not found</Typography>
        <Button title="Go Back" onPress={() => navigation.goBack()} className="mt-4" />
      </Screen>
    );
  }

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateItem(item.id, {
        category,
        brand: brand || undefined,
        colors: selectedColors,
        colorsHsl: namedColorsToHsl(selectedColors),
        season: selectedSeasons as ClothingItem['season'],
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Save failed', 'Could not update this item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen className="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          {/* Header */}
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <Typography variant="header" className="text-2xl text-primary">
              Edit Item
            </Typography>
          </StyledView>

          {/* Category */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <Typography className="text-sm font-medium text-gray-700 mb-2">Category</Typography>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 24 }}
            >
              <StyledView style={{ flexDirection: 'row', gap: 12 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 24,
                      backgroundColor:
                        category === cat
                          ? currentTheme.colors.primary
                          : currentTheme.colors.surface,
                      borderWidth: 2,
                      borderColor:
                        category === cat
                          ? currentTheme.colors.secondary
                          : currentTheme.colors.border,
                    }}
                  >
                    <Typography
                      className="text-sm font-semibold"
                      style={{ color: category === cat ? '#FFF' : currentTheme.colors.text }}
                    >
                      {cat}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </StyledView>
            </ScrollView>
          </Animated.View>

          {/* Brand */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Input
              label="Brand (Optional)"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., Zara, Nike"
              className="mb-6"
            />
          </Animated.View>

          {/* Colors */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Typography className="text-sm font-medium text-gray-700 mb-3">Colors</Typography>
            <StyledView
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}
            >
              {COLORS.map((color) => {
                const isSelected = selectedColors.includes(color);
                return (
                  <TouchableOpacity
                    key={color}
                    onPress={() => toggleColor(color)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isSelected
                        ? currentTheme.colors.primary
                        : currentTheme.colors.surface,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? currentTheme.colors.secondary
                        : currentTheme.colors.border,
                    }}
                  >
                    <Typography
                      className="text-sm font-medium"
                      style={{ color: isSelected ? '#FFF' : currentTheme.colors.text }}
                    >
                      {color}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </StyledView>
          </Animated.View>

          {/* Seasons */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Typography className="text-sm font-medium text-gray-700 mb-3">Seasons</Typography>
            <StyledView
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}
            >
              {SEASONS.map((season) => {
                const isSelected = selectedSeasons.includes(season);
                return (
                  <TouchableOpacity
                    key={season}
                    onPress={() => toggleSeason(season)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 24,
                      backgroundColor: isSelected
                        ? currentTheme.colors.primary
                        : currentTheme.colors.surface,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? currentTheme.colors.secondary
                        : currentTheme.colors.border,
                    }}
                  >
                    <Typography
                      className="text-sm font-semibold"
                      style={{ color: isSelected ? '#FFF' : currentTheme.colors.text }}
                    >
                      {season}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </StyledView>
          </Animated.View>

          {/* Tags */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <Input
              label="Tags (comma-separated)"
              value={tags}
              onChangeText={setTags}
              placeholder="e.g., casual, summer, favorite"
              className="mb-6"
            />
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInDown.duration(400).delay(450)}>
            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add personal notes about this item..."
              multiline
              numberOfLines={4}
              className="mb-6"
            />
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={isLoading}
              disabled={!category}
              className="shadow-lg shadow-indigo-500/20"
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};
