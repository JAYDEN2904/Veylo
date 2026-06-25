import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Screen, Typography, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const MaintenanceScreen = ({ navigation }: any) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Screen className="bg-background">
      <LinearGradient
        colors={[theme.colors.primary, '#2A2D31']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
          {/* Animated Icon */}
          <Animated.View style={animatedStyle}>
            <LinearGradient
              colors={[theme.colors.secondary, '#E8D89A']}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 32,
                shadowColor: theme.colors.secondary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
              }}
            >
              <Ionicons name="construct" size={56} color={theme.colors.primary} />
            </LinearGradient>
          </Animated.View>

          <Typography
            variant="header"
            className="text-4xl text-secondary mb-4 text-center"
            style={{ fontWeight: '700' }}
          >
            Under Maintenance
          </Typography>
          <Typography className="text-gray-300 text-center text-lg mb-2 leading-7 px-4">
            We're currently performing scheduled maintenance to improve your experience.
          </Typography>
          <Typography className="text-gray-400 text-center text-base mb-8">
            We'll be back shortly. Thank you for your patience!
          </Typography>

          {/* Info Card */}
          <StyledView
            style={{
              width: '100%',
              padding: 20,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons
                name="time-outline"
                size={24}
                color={theme.colors.secondary}
                style={{ marginRight: 12 }}
              />
              <Typography className="text-secondary font-semibold text-lg">
                Estimated Time
              </Typography>
            </StyledView>
            <Typography className="text-gray-300 text-base">
              We expect to be back online within the next 30 minutes.
            </Typography>
          </StyledView>
        </Animated.View>
      </LinearGradient>
    </Screen>
  );
};
