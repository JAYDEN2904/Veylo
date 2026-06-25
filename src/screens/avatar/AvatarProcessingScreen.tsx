import React, { useEffect, useState } from 'react';
import { View, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  cancelAnimation,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Screen, Typography, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { generateAvatar } from '../../services/avatarService';
import { useAuthStore } from '../../store/useAuthStore';
import { BodyType, AvatarGenerationResult } from '../../types';

const { width, height } = Dimensions.get('window');

const PROCESSING_STEPS = [
  { progress: 10, message: 'Uploading your photo...', icon: 'cloud-upload-outline' },
  { progress: 25, message: 'Analyzing facial features...', icon: 'scan-outline' },
  { progress: 40, message: 'Detecting face structure...', icon: 'eye-outline' },
  { progress: 55, message: 'Applying body type...', icon: 'body-outline' },
  { progress: 70, message: 'Generating avatar image...', icon: 'image-outline' },
  { progress: 85, message: 'Applying textures and details...', icon: 'color-palette-outline' },
  { progress: 95, message: 'Finalizing your avatar...', icon: 'checkmark-circle-outline' },
];

export const AvatarProcessingScreen = ({ navigation, route }: any) => {
  const { user, updateUser } = useAuthStore();
  const { photoUri, bodyType } = route.params;

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Animation setup
    rotation.value = withRepeat(withTiming(360, { duration: 3000 }), -1, false);

    scale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );

    pulseScale.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true
    );

    // Start avatar generation
    generateAvatarProcess();

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(scale);
      cancelAnimation(pulseScale);
    };
  }, []);

  // Update current step based on progress
  useEffect(() => {
    const stepIndex = PROCESSING_STEPS.findIndex((step) => progress <= step.progress);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex === 0 ? 0 : stepIndex - 1);
    } else {
      setCurrentStep(PROCESSING_STEPS.length - 1);
    }
  }, [progress]);

  const generateAvatarProcess = async () => {
    if (!user?.id) {
      setError('User not found');
      return;
    }

    try {
      const result: AvatarGenerationResult = await generateAvatar(
        {
          photoUri,
          bodyType,
          userId: user.id,
        },
        (currentProgress) => {
          setProgress(currentProgress);
        }
      );

      // Update user with new avatar
      await updateUser({
        avatarUrl: result.avatarUrl,
        avatarId: result.avatarId,
        bodyType,
      });

      // Navigate to result screen after a short delay
      setTimeout(() => {
        navigation.replace('AvatarResult', {
          avatarUrl: result.avatarUrl,
          avatarId: result.avatarId,
        });
      }, 500);
    } catch (err: any) {
      console.error('Avatar generation error:', err);
      setError(err.message || 'Failed to generate avatar. Please try again.');
    }
  };

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedCenterPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress}%`,
  }));

  if (error) {
    return (
      <Screen className="bg-background items-center justify-center px-6">
        <Animated.View entering={FadeInDown.duration(400)} className="items-center">
          <StyledView
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </StyledView>
          <Typography variant="header" className="text-2xl text-primary mb-4 text-center">
            Generation Failed
          </Typography>
          <Typography className="text-gray-500 text-center mb-6">{error}</Typography>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Typography className="text-white font-semibold">Go Back</Typography>
          </TouchableOpacity>
        </Animated.View>
      </Screen>
    );
  }

  const currentStepData = PROCESSING_STEPS[currentStep] || PROCESSING_STEPS[0];

  return (
    <Screen className="bg-background">
      <LinearGradient
        colors={[theme.colors.primary + '15', theme.colors.secondary + '08']}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Animated.View entering={FadeIn.duration(600)} className="items-center">
          {/* Animated Rings */}
          <StyledView className="items-center justify-center mb-8">
            <Animated.View
              style={[
                {
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 3,
                  borderColor: theme.colors.primary + '30',
                  position: 'absolute',
                },
                animatedRingStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  borderWidth: 2,
                  borderColor: theme.colors.secondary + '40',
                  position: 'absolute',
                },
                animatedPulseStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: theme.colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
                animatedCenterPulseStyle,
              ]}
            >
              <Ionicons name={currentStepData.icon as any} size={48} color="#FFFFFF" />
            </Animated.View>
          </StyledView>

          {/* Progress Text */}
          <Typography variant="header" className="text-3xl text-primary mb-2 text-center">
            Creating Your Avatar
          </Typography>
          <Typography className="text-gray-500 text-lg mb-8 text-center">
            {currentStepData.message}
          </Typography>

          {/* Progress Bar */}
          <StyledView
            style={{
              width: width - 80,
              height: 8,
              backgroundColor: theme.colors.background,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            <Animated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: theme.colors.primary,
                  borderRadius: 4,
                },
                progressStyle,
              ]}
            />
          </StyledView>

          {/* Progress Percentage */}
          <Typography className="text-primary font-bold text-2xl">
            {Math.round(progress)}%
          </Typography>
        </Animated.View>
      </LinearGradient>
    </Screen>
  );
};
