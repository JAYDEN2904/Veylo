import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Screen,
  Typography,
  Button,
  StyledView,
  StyledTouchableOpacity,
  StyledImage,
} from '../../components/common';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/common';
import { format } from 'date-fns';
import { Accessibility } from '../../utils/accessibility';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AppRootStackParamList } from '../../navigation/types';
import { DeleteItemModal } from './DeleteItemModal';

const { width } = Dimensions.get('window');

type Props = StackScreenProps<AppRootStackParamList, 'ItemDetails'>;

export const ItemDetailsScreen = ({ navigation, route }: Props) => {
  const itemId = route.params?.itemId ?? route.params?.id;
  const { items, deleteItem, toggleItemFavorite, isItemFavorite } = useWardrobeStore();
  const item = items.find((i) => i.id === itemId);
  const isFavorite = item ? isItemFavorite(item.id) : false;
  const scale = useSharedValue(1);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  useEffect(() => {
    scale.value = withSpring(1.05, { damping: 8 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 8 });
    }, 200);
  }, []);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!item) {
    return (
      <Screen className="bg-background justify-center items-center">
        <Typography className="text-gray-500">Item not found</Typography>
        <Button title="Go Back" onPress={() => navigation.goBack()} className="mt-4" />
      </Screen>
    );
  }

  const handleRequestDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteModalVisible(false);
    try {
      await deleteItem(item.id);
      navigation.goBack();
    } catch (err) {
      if (__DEV__) console.error('[ItemDetailsScreen] deleteItem failed:', err);
      Alert.alert('Delete failed', 'Could not remove this item. Please try again.');
    }
  };

  return (
    <Screen className="bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <Animated.View style={animatedImageStyle}>
          <StyledImage
            source={{ uri: item.imageUrl }}
            style={{ width, height: width * 1.2 }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
            }}
          />
        </Animated.View>

        {/* Header Actions */}
        <StyledView
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={Accessibility.labels.backButton}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.9)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => item && toggleItemFavorite(item.id)}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite
                ? Accessibility.labels.unfavoriteButton
                : Accessibility.labels.favoriteButton
            }
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.9)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? '#EF4444' : theme.colors.primary}
            />
          </TouchableOpacity>
        </StyledView>

        {/* Content */}
        <StyledView
          style={{
            padding: 24,
            marginTop: -40,
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
          }}
        >
          {/* Title Section */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <StyledView
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <StyledView style={{ flex: 1 }}>
                <Typography variant="header" className="text-3xl text-primary mb-2">
                  {item.category}
                </Typography>
                {item.brand && (
                  <Typography className="text-lg text-gray-500">{item.brand}</Typography>
                )}
              </StyledView>
            </StyledView>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <StyledView style={{ flexDirection: 'row', marginBottom: 24, gap: 16 }}>
              <Card className="flex-1 p-4">
                <Typography className="text-2xl font-bold text-primary mb-1">
                  {item.wornCount || 0}
                </Typography>
                <Typography className="text-xs text-gray-500">Times Worn</Typography>
              </Card>
              <Card className="flex-1 p-4">
                <Typography className="text-2xl font-bold text-primary mb-1">
                  {item.lastWorn ? format(new Date(item.lastWorn), 'MMM d') : 'Never'}
                </Typography>
                <Typography className="text-xs text-gray-500">Last Worn</Typography>
              </Card>
            </StyledView>
          </Animated.View>

          {/* Colors */}
          {item.colors && item.colors.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <Typography className="text-lg font-semibold text-primary mb-3">Colors</Typography>
              <StyledView
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}
              >
                {item.colors.map((color, index) => (
                  <StyledView
                    key={index}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Typography className="text-sm text-gray-700">{color}</Typography>
                  </StyledView>
                ))}
              </StyledView>
            </Animated.View>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <Typography className="text-lg font-semibold text-primary mb-3">Tags</Typography>
              <StyledView
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}
              >
                {item.tags.map((tag, index) => (
                  <StyledView
                    key={index}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: theme.colors.primary + '10',
                    }}
                  >
                    <Typography className="text-sm text-primary font-medium">{tag}</Typography>
                  </StyledView>
                ))}
              </StyledView>
            </Animated.View>
          )}

          {/* Metadata */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <Card className="p-4 mb-6">
              <StyledView
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}
              >
                <Typography className="text-sm text-gray-500">Added</Typography>
                <Typography className="text-sm text-primary font-medium">
                  {format(new Date(item.createdAt), 'MMMM d, yyyy')}
                </Typography>
              </StyledView>
              {item.season && item.season.length > 0 && (
                <StyledView style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Typography className="text-sm text-gray-500">Season</Typography>
                  <Typography className="text-sm text-primary font-medium">
                    {item.season.join(', ')}
                  </Typography>
                </StyledView>
              )}
            </Card>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <StyledView style={{ gap: 12, marginBottom: 24 }}>
              <Button
                title="Edit Item"
                onPress={() => navigation.navigate('EditItem', { id: item.id })}
                variant="outline"
                className="w-full"
              />
              <Button
                title="Delete Item"
                onPress={handleRequestDelete}
                variant="ghost"
                className="w-full"
              />
            </StyledView>
          </Animated.View>
        </StyledView>
      </ScrollView>
      <DeleteItemModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={handleConfirmDelete}
        itemName={item.brand ? `${item.brand} ${item.category}` : item.category}
      />
    </Screen>
  );
};
