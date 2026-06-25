import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeInDown,
  FadeIn,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  Screen,
  Typography,
  Button,
  StyledView,
  Card,
  StyledImage,
  PrimaryButton,
} from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTryOnStore } from '../../store/useTryOnStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useAuthStore } from '../../store/useAuthStore';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// Sample body type silhouettes for selection
const BODY_POSES = [
  {
    id: 'front',
    label: 'Front View',
    icon: 'person-outline',
    description: 'Stand facing the camera',
  },
  {
    id: 'side',
    label: 'Side View',
    icon: 'person-outline',
    description: 'Turn to your side',
  },
];

// Tips for best results
const PHOTO_TIPS = [
  { icon: 'sunny-outline', text: 'Good lighting' },
  { icon: 'body-outline', text: 'Full body visible' },
  { icon: 'square-outline', text: 'Plain background' },
  { icon: 'shirt-outline', text: 'Fitted clothing' },
];

export const VirtualTryOnScreen = ({ navigation, route }: any) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useAvatar, setUseAvatar] = useState(false);

  const { startSession, processVirtualTryOn, currentSession } = useTryOnStore();
  const { generatedOutfit, outfits } = useOutfitStore();
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();

  // Check if user has an avatar
  const hasAvatar = !!user?.avatarUrl;

  // Get outfit from params or use generated outfit
  const outfitId = route.params?.outfitId;
  const outfit = outfitId ? outfits.find((o) => o.id === outfitId) : generatedOutfit;

  // Animation for the scanning effect
  const scanLine = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (selectedPhoto) {
      // Scanning animation
      scanLine.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 1500 }), withTiming(1, { duration: 1500 })),
        -1,
        true
      );
    }

    return () => {
      cancelAnimation(scanLine);
      cancelAnimation(pulseScale);
    };
  }, [selectedPhoto]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLine.value * 100}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const pickImage = async (useCamera: boolean) => {
    try {
      // Request permissions
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

      const result = await (useCamera
        ? ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
          }));

      if (!result.canceled && result.assets[0]) {
        setSelectedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleStartTryOn = async () => {
    if ((!selectedPhoto && !useAvatar) || !outfit?.items) return;

    setIsLoading(true);
    startSession(selectedPhoto, outfit.items, outfit, useAvatar);

    // Navigate to processing screen
    navigation.navigate('TryOnProcessing');
  };

  // Auto-select avatar if available and no photo selected
  useEffect(() => {
    if (hasAvatar && !selectedPhoto) {
      setUseAvatar(true);
    }
  }, [hasAvatar, selectedPhoto]);

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <LinearGradient
          colors={[currentTheme.colors.primary, '#2A2D31', currentTheme.colors.background]}
          style={{ paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Typography
                variant="header"
                style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}
              >
                Virtual Try-On
              </Typography>
              <Typography style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                See yourself in this outfit
              </Typography>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: currentTheme.colors.secondary + '30',
              }}
            >
              <Typography
                style={{ color: currentTheme.colors.secondary, fontSize: 12, fontWeight: '600' }}
              >
                AI Powered
              </Typography>
            </View>
          </View>

          {/* Outfit Preview */}
          {outfit && (
            <Animated.View entering={FadeInDown.duration(500)}>
              <Typography
                style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 }}
              >
                OUTFIT TO TRY
              </Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {outfit.items?.map((item: any, index: number) => (
                  <View
                    key={item.id}
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 16,
                      overflow: 'hidden',
                      marginRight: 10,
                      borderWidth: 2,
                      borderColor: currentTheme.colors.secondary,
                    }}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </LinearGradient>

        {/* Photo Selection Area */}
        <View style={{ padding: 24 }}>
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Typography
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: currentTheme.colors.primary,
                marginBottom: 16,
              }}
            >
              Upload Your Photo
            </Typography>

            {/* Photo Preview or Upload Button */}
            {selectedPhoto || (useAvatar && user?.avatarUrl) ? (
              <Animated.View style={pulseStyle}>
                <View
                  style={{
                    borderRadius: 24,
                    overflow: 'hidden',
                    backgroundColor: currentTheme.colors.surface,
                    shadowColor: currentTheme.colors.secondary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                  }}
                >
                  <Image
                    source={{
                      uri: useAvatar && user?.avatarUrl ? user.avatarUrl : selectedPhoto || '',
                    }}
                    style={{
                      width: '100%',
                      height: width * 1.2,
                      backgroundColor: currentTheme.colors.background,
                    }}
                    contentFit="cover"
                  />

                  {/* Scanning overlay effect */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  >
                    <Animated.View
                      style={[
                        {
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 2,
                        },
                        scanLineStyle,
                      ]}
                    >
                      <LinearGradient
                        colors={['transparent', currentTheme.colors.secondary, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                      />
                    </Animated.View>
                  </View>

                  {/* Change Photo Button */}
                  {useAvatar && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        backgroundColor: currentTheme.colors.secondary + 'DD',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons
                        name="person-circle"
                        size={16}
                        color={currentTheme.colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Typography
                        style={{
                          color: currentTheme.colors.primary,
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        Using Avatar
                      </Typography>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPhoto(null);
                      setUseAvatar(false);
                    }}
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Typography style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                      Change
                    </Typography>
                  </TouchableOpacity>

                  {/* Body Detection Badge */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      right: 16,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      padding: 12,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: currentTheme.colors.success + '30',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="checkmark" size={18} color={currentTheme.colors.success} />
                    </View>
                    <View>
                      <Typography style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                        Photo Ready
                      </Typography>
                      <Typography style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                        Body detected successfully
                      </Typography>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ) : (
              <View style={{ gap: 12 }}>
                {/* Camera Button */}
                <TouchableOpacity
                  onPress={() => pickImage(true)}
                  style={{
                    height: 180,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: currentTheme.colors.secondary,
                    borderStyle: 'dashed',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: currentTheme.colors.secondary + '10',
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: currentTheme.colors.secondary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="camera" size={28} color={currentTheme.colors.primary} />
                  </View>
                  <Typography
                    style={{ fontSize: 16, fontWeight: '700', color: currentTheme.colors.primary }}
                  >
                    Take a Photo
                  </Typography>
                  <Typography
                    style={{ fontSize: 12, color: currentTheme.colors.textSecondary, marginTop: 4 }}
                  >
                    Full body, front-facing
                  </Typography>
                </TouchableOpacity>

                {/* Gallery Button */}
                <TouchableOpacity
                  onPress={() => pickImage(false)}
                  style={{
                    height: 70,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: currentTheme.colors.surface,
                  }}
                >
                  <Ionicons
                    name="images-outline"
                    size={24}
                    color={currentTheme.colors.primary}
                    style={{ marginRight: 12 }}
                  />
                  <Typography
                    style={{ fontSize: 16, fontWeight: '600', color: currentTheme.colors.primary }}
                  >
                    Choose from Gallery
                  </Typography>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Photo Tips */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={{ marginTop: 24 }}>
            <Typography
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: currentTheme.colors.textSecondary,
                marginBottom: 12,
              }}
            >
              TIPS FOR BEST RESULTS
            </Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PHOTO_TIPS.map((tip, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentTheme.colors.surface,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                  }}
                >
                  <Ionicons
                    name={tip.icon as any}
                    size={16}
                    color={currentTheme.colors.secondary}
                    style={{ marginRight: 6 }}
                  />
                  <Typography style={{ fontSize: 12, color: currentTheme.colors.text }}>
                    {tip.text}
                  </Typography>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* How it Works */}
          <Animated.View entering={FadeInDown.duration(500).delay(600)} style={{ marginTop: 32 }}>
            <Typography
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: currentTheme.colors.textSecondary,
                marginBottom: 16,
              }}
            >
              HOW IT WORKS
            </Typography>
            <View style={{ gap: 16 }}>
              {[
                { step: '1', title: 'Upload Photo', desc: 'Take or select a full-body photo' },
                {
                  step: '2',
                  title: 'AI Analysis',
                  desc: 'We detect your body pose and measurements',
                },
                { step: '3', title: 'Try On', desc: 'See the outfit fitted to your body' },
              ].map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentTheme.colors.surface,
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: currentTheme.colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: currentTheme.colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 16,
                    }}
                  >
                    <Typography
                      style={{
                        color: currentTheme.colors.secondary,
                        fontSize: 18,
                        fontWeight: '700',
                      }}
                    >
                      {item.step}
                    </Typography>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: currentTheme.colors.primary,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography style={{ fontSize: 12, color: currentTheme.colors.textSecondary }}>
                      {item.desc}
                    </Typography>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      {(selectedPhoto || useAvatar) && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <LinearGradient
            colors={['transparent', currentTheme.colors.background, currentTheme.colors.background]}
            style={{
              paddingHorizontal: 24,
              paddingBottom: 40,
              paddingTop: 40,
            }}
          >
            <PrimaryButton
              title="Generate Try-On"
              icon="flash"
              onPress={handleStartTryOn}
              loading={isLoading}
              disabled={isLoading}
              accessibilityLabel="Generate virtual try-on"
            />
          </LinearGradient>
        </Animated.View>
      )}
    </Screen>
  );
};
