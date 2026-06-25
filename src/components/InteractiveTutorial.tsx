import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Typography, StyledView, Button } from './commonPrimitives';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticService } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // Element identifier
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
  icon?: string;
}

interface InteractiveTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip?: () => void;
  visible: boolean;
}

export const InteractiveTutorial = ({
  steps,
  onComplete,
  onSkip,
  visible,
}: InteractiveTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        false
      );
    }
  }, [visible]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleNext = () => {
    hapticService.light();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    hapticService.light();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    hapticService.success();
    setOverlayVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    hapticService.medium();
    setOverlayVisible(false);
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  if (!visible || !overlayVisible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleSkip}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Tutorial Card */}
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={{
            position: 'absolute',
            bottom: 100,
            left: 20,
            right: 20,
            backgroundColor: theme.colors.background,
            borderRadius: 24,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {/* Progress Indicator */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginBottom: 20,
              gap: 4,
            }}
          >
            {steps.map((_, index) => (
              <View
                key={index}
                style={{
                  width: index === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    index === currentStep ? theme.colors.secondary : theme.colors.border,
                }}
              />
            ))}
          </View>

          {/* Icon */}
          {step.icon && (
            <Animated.View style={[{ alignItems: 'center', marginBottom: 16 }, pulseStyle]}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: theme.colors.secondary + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name={step.icon as any} size={32} color={theme.colors.secondary} />
              </View>
            </Animated.View>
          )}

          {/* Title */}
          <Typography
            variant="header"
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: theme.colors.text,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {step.title}
          </Typography>

          {/* Description */}
          <Typography
            style={{
              fontSize: 16,
              color: theme.colors.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 24,
            }}
          >
            {step.description}
          </Typography>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {!isFirst && (
              <Button
                title="Previous"
                onPress={handlePrevious}
                variant="outline"
                style={{ flex: 1 }}
              />
            )}
            <Button
              title={isLast ? 'Got it!' : 'Next'}
              onPress={handleNext}
              style={{ flex: isFirst ? 1 : 1 }}
            />
          </View>

          {/* Skip Button */}
          <TouchableOpacity
            onPress={handleSkip}
            style={{
              marginTop: 16,
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Typography
              style={{
                fontSize: 14,
                color: theme.colors.textSecondary,
              }}
            >
              Skip Tutorial
            </Typography>
          </TouchableOpacity>
        </Animated.View>

        {/* Step Counter */}
        <View
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Typography
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.colors.text,
            }}
          >
            {currentStep + 1} / {steps.length}
          </Typography>
        </View>
      </View>
    </Modal>
  );
};

// Pre-configured tutorials
export const Tutorials = {
  FirstScan: (onComplete: () => void, onSkip?: () => void) => ({
    steps: [
      {
        id: '1',
        title: 'Scan Your First Item',
        description:
          'Tap the camera button to scan your clothes. Hold your phone steady and make sure the item is well-lit.',
        icon: 'camera',
      },
      {
        id: '2',
        title: 'Review Details',
        description:
          'Our AI will detect colors, category, and more. You can edit these details before saving.',
        icon: 'create',
      },
      {
        id: '3',
        title: 'Add to Wardrobe',
        description:
          'Save your item to start building your digital wardrobe. You can always edit or delete items later.',
        icon: 'checkmark-circle',
      },
    ],
    onComplete,
    onSkip,
  }),

  GenerateOutfit: (onComplete: () => void, onSkip?: () => void) => ({
    steps: [
      {
        id: '1',
        title: 'Generate Your First Outfit',
        description:
          'Tap "Generate Outfit" to let AI create a stylish combination from your wardrobe.',
        icon: 'flash',
      },
      {
        id: '2',
        title: 'Review & Customize',
        description:
          'See what items were selected and get suggestions. You can generate variations or customize.',
        icon: 'options',
      },
      {
        id: '3',
        title: 'Try It On',
        description: 'Use virtual try-on to see how the outfit looks before you wear it!',
        icon: 'body',
      },
    ],
    onComplete,
    onSkip,
  }),

  VirtualTryOn: (onComplete: () => void, onSkip?: () => void) => ({
    steps: [
      {
        id: '1',
        title: 'Virtual Try-On',
        description:
          'See how outfits look on you before wearing them. Use your avatar or upload a photo.',
        icon: 'person-circle',
      },
      {
        id: '2',
        title: 'Get Perfect Fit',
        description: 'Our AI adjusts the clothes to match your body type and proportions.',
        icon: 'resize',
      },
      {
        id: '3',
        title: 'Save & Share',
        description:
          'Save your favorite try-ons to compare later, or share with friends for feedback.',
        icon: 'share-social',
      },
    ],
    onComplete,
    onSkip,
  }),
};
