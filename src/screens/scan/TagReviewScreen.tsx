import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Button, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import {
  clothingItemUpdatesToPatch,
  fetchClothingItemById,
  signedUrlForItemPath,
  updateClothingItem,
} from '../../services/wardrobeRepository';
import { isSupabaseConfigured } from '../../services/supabase';
import { normalizeCategory } from '../../services/outfitCategoryNormalize';
import { namedColorsToHsl } from '../../utils/hslColor';

const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear'];
const COLOR_OPTIONS = [
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
const SUGGESTED_TAGS = ['white', 'linen', 'minimalist', 'everyday'];

const LOW_CONFIDENCE_THRESHOLD = 0.6;

export const TagReviewScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const itemId: string | undefined = route?.params?.itemId;
  const fallbackImage: string | undefined = route?.params?.imageUri;
  const aiConfidence: number | undefined = route?.params?.aiConfidence;
  const aiCategory: string | undefined = route?.params?.aiCategory;

  const isLowConfidence =
    typeof aiConfidence === 'number' && aiConfidence < LOW_CONFIDENCE_THRESHOLD;
  const [categoryConfirmed, setCategoryConfirmed] = useState(!isLowConfidence);

  const [loading, setLoading] = useState<boolean>(Boolean(itemId));
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string>(fallbackImage ?? '');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [category, setCategory] = useState<string>(
    aiCategory ? displayCategory(aiCategory) : 'Tops'
  );
  const [brand, setBrand] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [material, setMaterial] = useState('');

  useEffect(() => {
    if (!itemId || !isSupabaseConfigured()) {
      setDetectedTags([]);
      setSelectedTags([]);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const row = await fetchClothingItemById(itemId);
        if (!row) {
          setDetectedTags([]);
          setSelectedTags([]);
          return;
        }
        const url = await signedUrlForItemPath(row.image_path);
        if (url) setImageUri(url);
        const tags = row.tags ?? [];
        setDetectedTags(tags);
        setSelectedTags(tags);
        setCategory(displayCategory(row.category));
        if (row.brand) setBrand(row.brand);
        if (row.colors?.length) setSelectedColors(row.colors);
        if (row.material) setMaterial(row.material);
      } catch (err) {
        if (__DEV__) console.error('[TagReview] hydrate', err);
        setDetectedTags([]);
        setSelectedTags([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const value = customTag.trim();
    if (value && !selectedTags.includes(value)) {
      setSelectedTags((prev) => [...prev, value]);
      setCustomTag('');
    }
  };

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    if (isLowConfidence) setCategoryConfirmed(true);
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const handleSave = async () => {
    if (isLowConfidence && !categoryConfirmed) {
      Alert.alert(
        'Please confirm the category',
        "Our AI wasn't fully sure about this item. Tap a category above to confirm before saving.",
        [{ text: 'OK' }]
      );
      return;
    }
    const normalizedCategory = normalizeCategory(category);
    try {
      if (itemId && isSupabaseConfigured()) {
        setSaving(true);
        await updateClothingItem(
          itemId,
          clothingItemUpdatesToPatch({
            category: normalizedCategory,
            brand: brand.trim() ? brand.trim() : undefined,
            tags: selectedTags,
            colors: selectedColors,
            colorsHsl: namedColorsToHsl(selectedColors),
            material: material.trim() ? material.trim() : undefined,
          })
        );
      }
      navigation.navigate('SaveItemConfirmation', {
        itemId,
        imageUri,
        category: normalizedCategory,
        brand,
        tags: selectedTags,
      });
    } catch (err) {
      if (__DEV__) console.error('[TagReview] save', err);
      Alert.alert('Unable to save', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen className="bg-background">
        <StyledView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
          <Typography className="text-gray-500 mt-4">Loading tags...</Typography>
        </StyledView>
      </Screen>
    );
  }

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-2xl text-primary">
            Review & Tag
          </Typography>
        </StyledView>

        <Animated.View entering={FadeInDown.duration(400)}>
          <Card className="p-0 overflow-hidden mb-6">
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 300, borderRadius: 12 }}
                contentFit="cover"
              />
            ) : (
              <StyledView
                style={{
                  width: '100%',
                  height: 300,
                  borderRadius: 12,
                  backgroundColor: currentTheme.colors.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="image-outline"
                  size={48}
                  color={currentTheme.colors.textSecondary}
                />
                <Typography
                  className="text-sm mt-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Image unavailable
                </Typography>
              </StyledView>
            )}
          </Card>
        </Animated.View>

        {isLowConfidence && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <StyledView
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                backgroundColor: '#FFF7ED',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FED7AA',
                padding: 14,
                marginBottom: 20,
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color="#EA580C"
                style={{ marginTop: 1 }}
              />
              <StyledView style={{ flex: 1 }}>
                <Typography className="text-sm font-semibold" style={{ color: '#9A3412' }}>
                  We're not sure about this category
                </Typography>
                <Typography className="text-xs mt-1" style={{ color: '#C2410C' }}>
                  Our AI wasn't fully confident. Please pick the correct category below before
                  saving.
                </Typography>
              </StyledView>
            </StyledView>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Typography className="text-sm font-medium text-gray-700">Category</Typography>
            {isLowConfidence && !categoryConfirmed && (
              <StyledView
                style={{
                  marginLeft: 8,
                  backgroundColor: '#FED7AA',
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Typography className="text-xs font-semibold" style={{ color: '#9A3412' }}>
                  Tap to confirm
                </Typography>
              </StyledView>
            )}
          </StyledView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 24 }}
          >
            <StyledView style={{ flexDirection: 'row', gap: 12 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => handleCategorySelect(cat)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 24,
                    backgroundColor:
                      category === cat ? currentTheme.colors.primary : currentTheme.colors.surface,
                    borderWidth: 2,
                    borderColor:
                      category === cat ? currentTheme.colors.secondary : currentTheme.colors.border,
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

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <StyledView style={{ marginBottom: 24 }}>
            <Typography className="text-sm font-medium text-gray-700 mb-2">
              Brand (Optional)
            </Typography>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., Zara, Nike"
              placeholderTextColor={currentTheme.colors.textSecondary}
              style={{
                height: 48,
                paddingHorizontal: 16,
                backgroundColor: currentTheme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
                fontSize: 16,
                color: currentTheme.colors.text,
              }}
            />
          </StyledView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(250)}>
          <StyledView style={{ marginBottom: 24 }}>
            <Typography className="text-sm font-medium text-gray-700 mb-2">
              Material (optional)
            </Typography>
            <TextInput
              value={material}
              onChangeText={setMaterial}
              placeholder="e.g., Cotton, Linen, Wool"
              placeholderTextColor={currentTheme.colors.textSecondary}
              style={{
                height: 48,
                paddingHorizontal: 16,
                backgroundColor: currentTheme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
                fontSize: 16,
                color: currentTheme.colors.text,
              }}
            />
          </StyledView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(275)}>
          <Typography className="text-sm font-medium text-gray-700 mb-3">Colours</Typography>
          <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {COLOR_OPTIONS.map((color) => {
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

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Typography className="text-sm font-medium text-gray-700 mb-3">Detected Tags</Typography>
          <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {detectedTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
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
                    {tag}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </StyledView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Typography className="text-sm font-medium text-gray-700 mb-3">Suggested Tags</Typography>
          <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {SUGGESTED_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
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
                    {tag}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </StyledView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <Typography className="text-sm font-medium text-gray-700 mb-3">Add Custom Tag</Typography>
          <StyledView style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <TextInput
              value={customTag}
              onChangeText={setCustomTag}
              placeholder="Enter tag name"
              placeholderTextColor={currentTheme.colors.textSecondary}
              style={{
                flex: 1,
                height: 48,
                paddingHorizontal: 16,
                backgroundColor: currentTheme.colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
                fontSize: 16,
                color: currentTheme.colors.text,
              }}
              onSubmitEditing={addCustomTag}
            />
            <TouchableOpacity
              onPress={addCustomTag}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: currentTheme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </StyledView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(600)}>
          <Button
            title={saving ? 'Saving...' : 'Save Item'}
            onPress={handleSave}
            disabled={!category || saving || (isLowConfidence && !categoryConfirmed)}
            className="shadow-lg shadow-indigo-500/20"
          />
          {isLowConfidence && !categoryConfirmed && (
            <Typography
              className="text-xs text-center mt-2"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Confirm the category above to enable saving
            </Typography>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};

function displayCategory(raw: string): string {
  if (!raw) return 'Tops';
  const lower = raw.toLowerCase();
  if (lower === 'top') return 'Tops';
  if (lower === 'bottom') return 'Bottoms';
  if (lower === 'shoe' || lower === 'shoes') return 'Shoes';
  if (lower === 'outerwear') return 'Outerwear';
  if (lower === 'accessory' || lower === 'accessories') return 'Accessories';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
