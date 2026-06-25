import React, { useEffect, useState } from 'react';
import { View, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeInDown,
  cancelAnimation,
} from 'react-native-reanimated';
import { Screen, Typography } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTryOnStore } from '../../store/useTryOnStore';

const { width, height } = Dimensions.get('window');

const PROCESSING_MESSAGES = [
  { progress: 0, message: 'Analyzing your photo...', icon: 'scan-outline' },
  { progress: 15, message: 'Detecting body pose...', icon: 'body-outline' },
  { progress: 30, message: 'Measuring proportions...', icon: 'resize-outline' },
  { progress: 45, message: 'Preparing garments...', icon: 'shirt-outline' },
  { progress: 60, message: 'Fitting clothes to your body...', icon: 'color-wand-outline' },
  { progress: 75, message: 'Adjusting for perfect fit...', icon: 'construct-outline' },
  { progress: 90, message: 'Rendering final image...', icon: 'image-outline' },
  { progress: 100, message: 'Almost there...', icon: 'checkmark-circle-outline' },
];

// Animated particle
const Particle = ({ delay, angle, distance }: any) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 500 })),
        -1,
        true
      );
      progress.value = withRepeat(withTiming(1, { duration: 2000 }), -1, false);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
      cancelAnimation(opacity);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const currentDistance = interpolate(progress.value, [0, 1], [0, distance], Extrapolate.CLAMP);
    const x = Math.cos((angle * Math.PI) / 180) * currentDistance;
    const y = Math.sin((angle * Math.PI) / 180) * currentDistance;
    const scale = interpolate(progress.value, [0, 0.5, 1], [0, 1, 0], Extrapolate.CLAMP);

    return {
      opacity: opacity.value,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.secondary,
        },
        animatedStyle,
      ]}
    />
  );
};

// Animated ring
const AnimatedRing = ({ size, delay, reverse }: any) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(reverse ? -360 : 360, { duration: 3000 + delay }),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0.9, { duration: 1500 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: theme.colors.secondary + '40',
          borderTopColor: theme.colors.secondary,
          borderRightColor: 'transparent',
        },
        animatedStyle,
      ]}
    />
  );
};

export const TryOnProcessingScreen = ({ navigation }: any) => {
  const { currentSession, processVirtualTryOn } = useTryOnStore();
  const [currentMessage, setCurrentMessage] = useState(PROCESSING_MESSAGES[0]);

  // Animations
  const pulseScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    // Start processing
    processVirtualTryOn();

    // Pulse animation
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );
  }, []);

  // Update message based on progress
  useEffect(() => {
    if (currentSession) {
      const progress = currentSession.progress;
      progressWidth.value = withTiming(progress, { duration: 300 });

      const messageObj = [...PROCESSING_MESSAGES].reverse().find((m) => progress >= m.progress);
      if (messageObj) {
        setCurrentMessage(messageObj);
      }

      if (currentSession.status === 'complete') {
        setTimeout(() => {
          navigation.replace('TryOnResult');
        }, 500);
      } else if (currentSession.status === 'pending') {
        Alert.alert(
          'Still processing',
          currentSession.errorMessage ||
            'Your try-on is still rendering. Check Try-On History in a minute to see it.',
          [
            { text: 'View history', onPress: () => navigation.replace('TryOnHistory') },
            { text: 'OK', style: 'cancel', onPress: () => navigation.goBack() },
          ]
        );
      } else if (currentSession.status === 'error') {
        const isComingSoon = currentSession.errorMessage?.toLowerCase().includes('coming soon');
        Alert.alert(
          isComingSoon ? 'Coming soon' : 'Try-on failed',
          currentSession.errorMessage || 'Something went wrong. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [currentSession?.progress, currentSession?.status]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <Screen className="bg-primary">
      <LinearGradient
        colors={[theme.colors.primary, '#0A0B0C', theme.colors.primary]}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        {/* User Photo Preview (small) */}
        {currentSession?.userPhotoUri && (
          <Animated.View
            entering={FadeIn.duration(800)}
            style={{
              position: 'absolute',
              top: 80,
              width: 80,
              height: 80,
              borderRadius: 40,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: theme.colors.secondary,
            }}
          >
            <Image
              source={{ uri: currentSession.userPhotoUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </Animated.View>
        )}

        {/* Animated Center */}
        <Animated.View
          style={[
            {
              width: 200,
              height: 200,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 48,
            },
            pulseStyle,
          ]}
        >
          {/* Rings */}
          <AnimatedRing size={200} delay={0} reverse={false} />
          <AnimatedRing size={160} delay={500} reverse={true} />
          <AnimatedRing size={120} delay={1000} reverse={false} />

          {/* Particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Particle key={i} delay={i * 100} angle={i * 30} distance={80 + Math.random() * 20} />
          ))}

          {/* Center Icon */}
          <LinearGradient
            colors={[theme.colors.secondary, '#E8D89A']}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name={currentMessage.icon as any} size={36} color={theme.colors.primary} />
          </LinearGradient>
        </Animated.View>

        {/* Progress Info */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={{ alignItems: 'center', width: '100%' }}
        >
          <Typography
            style={{
              color: theme.colors.secondary,
              fontSize: 24,
              fontWeight: '700',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {currentMessage.message}
          </Typography>

          <Typography
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              marginBottom: 32,
            }}
          >
            {currentSession?.progress || 0}% complete
          </Typography>

          {/* Progress Bar */}
          <View
            style={{
              width: '100%',
              height: 8,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            <Animated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 4,
                },
                progressStyle,
              ]}
            />
          </View>

          {/* Outfit items being processed */}
          {currentSession?.items && currentSession.items.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Typography
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                {currentSession.totalGarments && currentSession.totalGarments > 1
                  ? `FITTING GARMENT ${Math.min(
                      (currentSession.currentGarmentIndex ?? 0) + 1,
                      currentSession.totalGarments
                    )} OF ${currentSession.totalGarments}`
                  : `FITTING ${currentSession.items.length} ITEMS`}
              </Typography>
              <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                {currentSession.items.slice(0, 4).map((item, index) => (
                  <View
                    key={item.id}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      overflow: 'hidden',
                      marginHorizontal: 4,
                      borderWidth: 2,
                      borderColor: theme.colors.secondary + '50',
                    }}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Footer tip */}
        <View style={{ position: 'absolute', bottom: 60 }}>
          <Typography
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            ✨ Our AI is analyzing your body type and fitting the clothes
          </Typography>
        </View>
      </LinearGradient>
    </Screen>
  );
};
