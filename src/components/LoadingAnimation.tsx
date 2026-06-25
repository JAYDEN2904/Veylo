import React, { useEffect } from 'react';
import { View, ActivityIndicator, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Typography, StyledView } from './commonPrimitives';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface LoadingAnimationProps {
  message?: string;
  variant?: 'default' | 'outfit' | 'tryon' | 'scan';
  size?: 'small' | 'large';
}

export const LoadingAnimation = ({
  message,
  variant = 'default',
  size = 'large',
}: LoadingAnimationProps) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Rotation animation
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Pulse animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Fade animation
    opacity.value = withRepeat(
      withSequence(withTiming(0.6, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const getIcon = () => {
    switch (variant) {
      case 'outfit':
        return 'flash';
      case 'tryon':
        return 'body';
      case 'scan':
        return 'scan';
      default:
        return 'hourglass';
    }
  };

  const getDefaultMessage = () => {
    switch (variant) {
      case 'outfit':
        return 'Generating your perfect outfit...';
      case 'tryon':
        return 'Fitting clothes to your body...';
      case 'scan':
        return 'Analyzing your items...';
      default:
        return 'Loading...';
    }
  };

  const iconSize = size === 'large' ? 48 : 32;

  return (
    <StyledView
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
      }}
    >
      {/* Animated Icon */}
      <Animated.View style={animatedStyle}>
        <View
          style={{
            width: iconSize * 2,
            height: iconSize * 2,
            borderRadius: iconSize,
            backgroundColor: theme.colors.secondary + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <LinearGradient
            colors={[theme.colors.secondary, theme.colors.accent]}
            style={{
              width: iconSize * 1.5,
              height: iconSize * 1.5,
              borderRadius: iconSize * 0.75,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name={getIcon() as any} size={iconSize} color={theme.colors.primary} />
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Message */}
      <Typography
        style={{
          fontSize: size === 'large' ? 18 : 16,
          fontWeight: '600',
          color: theme.colors.text,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {message || getDefaultMessage()}
      </Typography>

      {/* Progress dots */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {[0, 1, 2].map((index) => (
          <AnimatedDot key={index} delay={index * 200} />
        ))}
      </View>
    </StyledView>
  );
};

// Animated dot component
const AnimatedDot = ({ delay }: { delay: number }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 600 }), withTiming(0.5, { duration: 600 })),
      -1,
      false
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.secondary,
        },
        dotStyle,
      ]}
    />
  );
};

// Full-screen loading overlay
interface LoadingOverlayProps extends LoadingAnimationProps {
  visible: boolean;
}

export const LoadingOverlay = ({ visible, ...props }: LoadingOverlayProps) => {
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <View
        style={{
          backgroundColor: theme.colors.background,
          borderRadius: 24,
          padding: 40,
          maxWidth: width - 80,
        }}
      >
        <LoadingAnimation {...props} />
      </View>
    </View>
  );
};
