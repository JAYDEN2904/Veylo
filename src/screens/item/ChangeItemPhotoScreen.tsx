import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
// import * as ImagePicker from 'expo-image-picker'; // TODO: Install expo-image-picker
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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
import { LinearGradient } from 'expo-linear-gradient';

export const ChangeItemPhotoScreen = ({ navigation, route }: any) => {
  const { items, updateItem } = useWardrobeStore();
  const item = items.find((i) => i.id === route.params?.id);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!item) {
    return (
      <Screen className="bg-background justify-center items-center">
        <Typography className="text-gray-500">Item not found</Typography>
        <Button title="Go Back" onPress={() => navigation.goBack()} className="mt-4" />
      </Screen>
    );
  }

  const pickImage = async (source: 'camera' | 'library') => {
    // TODO: Install expo-image-picker package
    Alert.alert(
      'Coming Soon',
      'Image picker functionality will be available soon. Please install expo-image-picker package.'
    );
    // try {
    //   let result;
    //   if (source === 'camera') {
    //     const { status } = await ImagePicker.requestCameraPermissionsAsync();
    //     if (status !== 'granted') {
    //       Alert.alert('Permission Required', 'Camera access is needed to take photos.');
    //       return;
    //     }
    //     result = await ImagePicker.launchCameraAsync({
    //       mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //       allowsEditing: true,
    //       aspect: [3, 4],
    //       quality: 0.8,
    //     });
    //   } else {
    //     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    //     if (status !== 'granted') {
    //       Alert.alert('Permission Required', 'Photo library access is needed to select photos.');
    //       return;
    //     }
    //     result = await ImagePicker.launchImageLibraryAsync({
    //       mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //       allowsEditing: true,
    //       aspect: [3, 4],
    //       quality: 0.8,
    //     });
    //   }

    //   if (!result.canceled && result.assets[0]) {
    //     setNewImageUri(result.assets[0].uri);
    //   }
    // } catch (error) {
    //   Alert.alert('Error', 'Failed to pick image. Please try again.');
    // }
  };

  const handleSave = async () => {
    if (!newImageUri) return;
    setIsLoading(true);
    // In a real app, you'd upload the image and get a URL
    updateItem(item.id, { imageUrl: newImageUri });
    setTimeout(() => {
      setIsLoading(false);
      navigation.goBack();
    }, 500);
  };

  const displayImage = newImageUri || item.imageUrl;

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        {/* Header */}
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-2xl text-primary">
            Change Photo
          </Typography>
        </StyledView>

        {/* Preview */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{ alignItems: 'center', marginBottom: 32 }}
        >
          <StyledView
            style={{
              width: '100%',
              height: 400,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: theme.colors.surface,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            }}
          >
            <Image
              source={{ uri: displayImage }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </StyledView>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <StyledView style={{ gap: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => pickImage('camera')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                borderRadius: 16,
                backgroundColor: theme.colors.surface,
                borderWidth: 2,
                borderColor: theme.colors.border,
              }}
            >
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.accent + 'CC']}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}
              >
                <Ionicons name="camera" size={24} color="#FFF" />
              </LinearGradient>
              <Typography className="text-lg font-semibold text-primary">Take Photo</Typography>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickImage('library')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                borderRadius: 16,
                backgroundColor: theme.colors.surface,
                borderWidth: 2,
                borderColor: theme.colors.border,
              }}
            >
              <LinearGradient
                colors={[theme.colors.secondary, '#E8D89A']}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}
              >
                <Ionicons name="images" size={24} color={theme.colors.primary} />
              </LinearGradient>
              <Typography className="text-lg font-semibold text-primary">
                Choose from Library
              </Typography>
            </TouchableOpacity>
          </StyledView>
        </Animated.View>

        {/* Save Button */}
        {newImageUri && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Button
              title="Save Photo"
              onPress={handleSave}
              loading={isLoading}
              className="shadow-lg shadow-indigo-500/20"
            />
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
};
