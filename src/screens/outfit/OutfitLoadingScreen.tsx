import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { Screen, Typography, StyledView, Button } from '../../components/common';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useOutfitStore } from '../../store/useOutfitStore';

// Loading dot component with proper animation cleanup
const LoadingDot = ({ delay }: { delay: number }) => {
  const dotOpacity = useSharedValue(0.3);

  useEffect(() => {
    const timer = setTimeout(() => {
      dotOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.3, { duration: 600 })),
        -1,
        false
      );
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimation(dotOpacity);
    };
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: theme.colors.secondary,
        },
        dotStyle,
      ]}
    />
  );
};

export const OutfitLoadingScreen = ({ navigation }: any) => {
  const { generatedOutfit, isGenerating, generationError, clearGenerationError } = useOutfitStore();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Rotation animation
    rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false);

    // Pulse animation
    scale.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true
    );

    // Fade animation
    opacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );

    // Cleanup animations on unmount
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  // Navigate when generation is complete
  useEffect(() => {
    if (!isGenerating && generatedOutfit) {
      setTimeout(() => {
        navigation.replace('OutfitResult', { outfitId: generatedOutfit.id });
      }, 500);
    }
  }, [isGenerating, generatedOutfit]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!isGenerating && generationError) {
    return (
      <Screen className="bg-background">
        <LinearGradient
          colors={[theme.colors.primary, '#2A2D31']}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <StyledView style={{ alignItems: 'center', maxWidth: 340 }}>
            <Typography
              variant="header"
              className="text-2xl text-secondary mb-3 text-center"
              style={{ fontWeight: '700' }}
            >
              {"Couldn't build an outfit"}
            </Typography>
            <Typography className="text-gray-300 text-center text-base leading-6 mb-8">
              {generationError.message}
            </Typography>
            <Button
              title="Go back"
              onPress={() => {
                clearGenerationError();
                navigation.goBack();
              }}
              className="w-full rounded-full h-12"
              variant="secondary"
            />
          </StyledView>
        </LinearGradient>
      </Screen>
    );
  }

  return (
    <Screen className="bg-background">
      <LinearGradient
        colors={[theme.colors.primary, '#2A2D31']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <StyledView style={{ alignItems: 'center' }}>
          {/* Animated Rings */}
          <StyledView
            style={{
              position: 'relative',
              width: 200,
              height: 200,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 48,
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 3,
                  borderColor: theme.colors.secondary,
                  borderTopColor: 'transparent',
                },
                animatedRingStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  borderWidth: 3,
                  borderColor: theme.colors.secondary + '80',
                  borderBottomColor: 'transparent',
                },
                animatedRingStyle,
              ]}
            />
            <Animated.View style={animatedPulseStyle}>
              <LinearGradient
                colors={[theme.colors.secondary, '#E8D89A']}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography
                  className="text-4xl"
                  style={{
                    color: theme.colors.primary,
                    fontWeight: '700',
                  }}
                >
                  AI
                </Typography>
              </LinearGradient>
            </Animated.View>
          </StyledView>

          {/* Text */}
          <Animated.View style={animatedTextStyle}>
            <Typography
              variant="header"
              className="text-3xl text-secondary mb-4 text-center"
              style={{ fontWeight: '700' }}
            >
              Creating Your Outfit
            </Typography>
            <Typography className="text-gray-300 text-center text-base leading-6">
              Our AI is analyzing your wardrobe{'\n'}
              and crafting the perfect combination...
            </Typography>
          </Animated.View>

          {/* Loading Dots */}
          <StyledView style={{ flexDirection: 'row', marginTop: 32, gap: 8 }}>
            <LoadingDot delay={0} />
            <LoadingDot delay={200} />
            <LoadingDot delay={400} />
          </StyledView>
        </StyledView>
      </LinearGradient>
    </Screen>
  );
};
