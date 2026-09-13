import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Button, StyledView } from '../../components/common';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { uploadClothingItemPhoto } from '../../services/imageUpload';
import { updateClothingItem } from '../../services/wardrobeRepository';
import { isSupabaseConfigured } from '../../services/supabase';

const GARMENT_ASPECT: [number, number] = [3, 4];

export const ChangeItemPhotoScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const { items, updateItem } = useWardrobeStore();
  const user = useAuthStore((s) => s.user);
  const item = items.find((i) => i.id === route.params?.id);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  if (!item) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Typography style={{ color: currentTheme.colors.textSecondary }}>Item not found</Typography>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const pickImage = async (source: 'camera' | 'library') => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera access needed', 'Allow camera access to take a new photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: GARMENT_ASPECT,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          setNewImageUri(result.assets[0].uri);
        }
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo access needed', 'Allow photo library access to choose a new image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: GARMENT_ASPECT,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setNewImageUri(result.assets[0].uri);
      }
    } catch (error) {
      if (__DEV__) console.error('[ChangeItemPhoto] pickImage', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleSave = async () => {
    if (!newImageUri) return;
    setIsLoading(true);
    try {
      if (isSupabaseConfigured() && user?.id) {
        const filename = `item-${item.id}-${Date.now()}.jpg`;
        const upload = await uploadClothingItemPhoto(user.id, newImageUri, filename);
        await updateClothingItem(item.id, { image_path: upload.path });
        await updateItem(item.id, {
          imageUrl: upload.publicUrl ?? newImageUri,
          imagePath: upload.path,
          thumbnailUrl: upload.thumbnailUrl ?? upload.publicUrl ?? newImageUri,
        });
      } else {
        await updateItem(item.id, { imageUrl: newImageUri });
      }
      navigation.goBack();
    } catch (err) {
      if (__DEV__) console.error('[ChangeItemPhoto] save', err);
      Alert.alert('Save failed', 'Could not update this photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayImage = newImageUri || item.imageUrl;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 12, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" style={{ fontSize: 24, color: currentTheme.colors.text }}>
            Change Photo
          </Typography>
        </StyledView>

        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', marginBottom: 32 }}>
          <StyledView
            style={{
              width: '100%',
              height: 400,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: currentTheme.colors.surface,
            }}
          >
            <Image
              source={{ uri: displayImage }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </StyledView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <StyledView style={{ gap: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => {
                void pickImage('camera');
              }}
              disabled={isPicking}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                minHeight: 72,
                borderRadius: 16,
                backgroundColor: currentTheme.colors.surface,
                borderWidth: 2,
                borderColor: currentTheme.colors.border,
              }}
            >
              <Ionicons
                name="camera"
                size={24}
                color={currentTheme.colors.primary}
                style={{ marginRight: 12 }}
              />
              <Typography style={{ fontSize: 17, fontWeight: '600', color: currentTheme.colors.text }}>
                Take Photo
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void pickImage('library');
              }}
              disabled={isPicking}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                minHeight: 72,
                borderRadius: 16,
                backgroundColor: currentTheme.colors.surface,
                borderWidth: 2,
                borderColor: currentTheme.colors.border,
              }}
            >
              <Ionicons
                name="images"
                size={24}
                color={currentTheme.colors.primary}
                style={{ marginRight: 12 }}
              />
              <Typography style={{ fontSize: 17, fontWeight: '600', color: currentTheme.colors.text }}>
                Choose from Library
              </Typography>
            </TouchableOpacity>
          </StyledView>
        </Animated.View>

        {newImageUri ? (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Button title="Save Photo" onPress={() => void handleSave()} loading={isLoading} />
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};
