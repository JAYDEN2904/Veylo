import React, { useEffect } from 'react';
import { View, Animated } from 'react-native';
import { Screen, Typography } from '../../components/common';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

export const SplashScreen = ({ navigation }: any) => {
  const { isAuthenticated } = useAuthStore();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigation logic
    const checkAuth = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait for animation + delay

      if (!isAuthenticated) {
        navigation.replace('Welcome');
      }
    };

    checkAuth();
  }, [isAuthenticated, navigation]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.colors.primary, '#000000']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <Typography
            variant="header"
            className="text-6xl tracking-widest text-center"
            style={{
              color: theme.colors.secondary,
              fontWeight: '700',
              textShadowColor: 'rgba(243, 229, 171, 0.3)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20,
            }}
          >
            VEYLO
          </Typography>
          <Typography
            className="text-gray-400 text-sm tracking-[4px] text-center mt-4 uppercase"
            style={{ fontWeight: '400' }}
          >
            Smart Closet
          </Typography>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};
