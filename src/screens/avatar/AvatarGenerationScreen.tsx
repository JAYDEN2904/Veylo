import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Screen,
  Typography,
  StyledView,
  Card,
  PrimaryButton,
  SecondaryButton,
} from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { validatePhotoForAvatar } from '../../services/avatarService';
import { BodyType } from '../../types';

const { width } = Dimensions.get('window');

/** Tall crop guides users toward a head-to-toe frame. */
const FULL_BODY_ASPECT: [number, number] = [9, 16];

const BODY_TYPES: { value: BodyType; label: string; description: string; icon: string }[] = [
  { value: 'petite', label: 'Petite', description: 'Under 5\'4"', icon: 'person-outline' },
  { value: 'average', label: 'Average', description: '5\'4" - 5\'7"', icon: 'person-outline' },
  { value: 'tall', label: 'Tall', description: 'Over 5\'7"', icon: 'person-outline' },
  { value: 'curvy', label: 'Curvy', description: 'Curvy build', icon: 'person-outline' },
  { value: 'athletic', label: 'Athletic', description: 'Athletic build', icon: 'person-outline' },
  {
    value: 'plus-size',
    label: 'Plus Size',
    description: 'Plus size build',
    icon: 'person-outline',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Custom specifications',
    icon: 'settings-outline',
  },
];

const PHOTO_TIPS = [
  { icon: 'body-outline', text: 'Head to toe in frame — stand far enough back' },
  { icon: 'walk-outline', text: 'Stand facing the camera in a relaxed pose' },
  { icon: 'sunny-outline', text: 'Even lighting from head to feet' },
  { icon: 'shirt-outline', text: 'Fitted clothes so your shape is clear' },
  { icon: 'square-outline', text: 'Plain background — avoid busy rooms' },
  { icon: 'close-circle-outline', text: 'No face-only selfies or tight crops' },
];

export const AvatarGenerationScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedBodyType, setSelectedBodyType] = useState<BodyType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const applySelectedPhoto = async (uri: string) => {
    const validation = await validatePhotoForAvatar(uri);
    if (!validation.valid) {
      Alert.alert('Photo problem', validation.errors[0] ?? 'Please choose another photo.');
      return;
    }
    setSelectedPhoto(uri);
    if (validation.warnings.length > 0) {
      Alert.alert(
        'Use a full-body photo',
        `${validation.warnings[0]}\n\nYou can keep this photo or choose a better head-to-toe shot.`,
        [
          { text: 'Choose another', style: 'cancel', onPress: () => setSelectedPhoto(null) },
          { text: 'Keep photo' },
        ]
      );
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required.');
          return;
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: FULL_BODY_ASPECT,
        quality: 0.9,
      };

      const result = await (useCamera
        ? ImagePicker.launchCameraAsync(pickerOptions)
        : ImagePicker.launchImageLibraryAsync(pickerOptions));

      if (!result.canceled && result.assets[0]) {
        await applySelectedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const proceedToProcessing = () => {
    if (!selectedPhoto || !selectedBodyType) return;
    navigation.navigate('AvatarProcessing', {
      photoUri: selectedPhoto,
      bodyType: selectedBodyType,
    });
  };

  const handleGenerateAvatar = async () => {
    if (!selectedPhoto) {
      Alert.alert('Photo required', 'Add a full-body standing photo first.');
      return;
    }

    if (!selectedBodyType) {
      Alert.alert('Body type required', 'Select the option that best matches your build.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setIsLoading(true);
    try {
      const validation = await validatePhotoForAvatar(selectedPhoto);
      if (!validation.valid) {
        Alert.alert('Photo problem', validation.errors[0] ?? 'Please choose another photo.');
        return;
      }

      if (validation.warnings.length > 0) {
        Alert.alert(
          'Full-body photo recommended',
          `${validation.warnings[0]}\n\nContinue anyway, or change the photo for a better avatar and try-on fit?`,
          [
            { text: 'Change photo', style: 'cancel' },
            { text: 'Continue anyway', onPress: proceedToProcessing },
          ]
        );
        return;
      }

      proceedToProcessing();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Typography variant="header" className="text-4xl text-primary mb-2">
            Create Your Avatar
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Upload a full-body standing photo, then select your body type for a try-on-ready avatar
          </Typography>
        </Animated.View>

        {/* Photo Selection Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Card className="p-6 mb-6 border-0 shadow-lg">
            <Typography className="text-primary font-semibold text-lg mb-4">
              Step 1: Full-body photo
            </Typography>
            <Typography className="text-gray-500 text-sm mb-4">
              Stand so your head, torso, and legs are all visible. Face-only selfies produce weaker
              avatars and try-on results.
            </Typography>

            {selectedPhoto ? (
              <StyledView className="items-center mb-4">
                <Image
                  source={{ uri: selectedPhoto }}
                  style={{
                    width: width - 80,
                    height: (width - 80) * 1.3,
                    borderRadius: 16,
                    marginBottom: 16,
                  }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => setSelectedPhoto(null)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: currentTheme.colors.background,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.textSecondary,
                  }}
                >
                  <Typography className="text-primary font-medium">Change Photo</Typography>
                </TouchableOpacity>
              </StyledView>
            ) : (
              <StyledView className="items-center mb-4">
                <StyledView
                  style={{
                    width: width - 80,
                    height: (width - 80) * 1.3,
                    borderRadius: 16,
                    backgroundColor: currentTheme.colors.background,
                    borderWidth: 2,
                    borderColor: currentTheme.colors.textSecondary,
                    borderStyle: 'dashed',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Ionicons
                    name="body-outline"
                    size={64}
                    color={currentTheme.colors.textSecondary}
                  />
                  <Typography className="text-gray-500 text-center mt-4 px-4">
                    Your full-body photo will appear here
                  </Typography>
                </StyledView>

                <StyledView style={{ width: '100%', gap: 12 }}>
                  <PrimaryButton
                    title="Take full-body photo"
                    icon="camera"
                    onPress={() => pickImage(true)}
                    accessibilityLabel="Take full-body photo"
                  />
                  <SecondaryButton
                    title="Choose from library"
                    icon="images"
                    onPress={() => pickImage(false)}
                    accessibilityLabel="Choose full-body photo from library"
                  />
                </StyledView>
              </StyledView>
            )}

            {/* Photo Tips */}
            <StyledView className="mt-4">
              <Typography className="text-gray-500 text-sm mb-3 font-medium">
                Tips for best results:
              </Typography>
              <StyledView className="flex-row flex-wrap gap-3">
                {PHOTO_TIPS.map((tip, index) => (
                  <StyledView
                    key={index}
                    className="flex-row items-center bg-background px-3 py-2 rounded-lg"
                  >
                    <Ionicons
                      name={tip.icon as any}
                      size={16}
                      color={currentTheme.colors.primary}
                    />
                    <Typography className="text-gray-600 text-xs ml-2">{tip.text}</Typography>
                  </StyledView>
                ))}
              </StyledView>
            </StyledView>
          </Card>
        </Animated.View>

        {/* Body Type Selection Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Card className="p-6 mb-6 border-0 shadow-lg">
            <Typography className="text-primary font-semibold text-lg mb-4">
              Step 2: Select Body Type
            </Typography>
            <Typography className="text-gray-500 text-sm mb-4">
              Match the option closest to your build. Combined with your full-body photo, this
              shapes a more accurate avatar for virtual try-on.
            </Typography>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              {BODY_TYPES.map((bodyType) => (
                <TouchableOpacity
                  key={bodyType.value}
                  onPress={() => setSelectedBodyType(bodyType.value)}
                  style={{
                    marginRight: 12,
                    minWidth: 100,
                  }}
                >
                  <LinearGradient
                    colors={
                      selectedBodyType === bodyType.value
                        ? [currentTheme.colors.primary, currentTheme.colors.secondary]
                        : [currentTheme.colors.background, currentTheme.colors.background]
                    }
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor:
                        selectedBodyType === bodyType.value
                          ? currentTheme.colors.primary
                          : currentTheme.colors.textSecondary,
                    }}
                  >
                    <Ionicons
                      name={bodyType.icon as any}
                      size={32}
                      color={
                        selectedBodyType === bodyType.value
                          ? '#FFFFFF'
                          : currentTheme.colors.primary
                      }
                    />
                    <Typography
                      className={`font-semibold mt-2 ${
                        selectedBodyType === bodyType.value ? 'text-white' : 'text-primary'
                      }`}
                    >
                      {bodyType.label}
                    </Typography>
                    <Typography
                      className={`text-xs mt-1 ${
                        selectedBodyType === bodyType.value ? 'text-white/80' : 'text-gray-500'
                      }`}
                    >
                      {bodyType.description}
                    </Typography>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <PrimaryButton
            title="Generate Avatar"
            icon="flash"
            onPress={handleGenerateAvatar}
            disabled={!selectedPhoto || !selectedBodyType || isLoading}
            loading={isLoading}
            accessibilityLabel="Generate avatar"
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
