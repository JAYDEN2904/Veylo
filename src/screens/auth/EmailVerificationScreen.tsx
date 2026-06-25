import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import {
  Screen,
  Typography,
  Button,
  StyledView,
  StyledTouchableOpacity,
} from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const EmailVerificationScreen = ({ navigation, route }: any) => {
  const [resendCooldown, setResendCooldown] = useState(0);
  const scale = useSharedValue(1);
  const email: string | undefined = route?.params?.email;

  useEffect(() => {
    // Pulse animation for email icon
    scale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleResend = () => {
    if (resendCooldown === 0) {
      setResendCooldown(60);
      // Trigger resend logic here
    }
  };

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
          {/* Animated Email Icon */}
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
              <Ionicons name="mail-open" size={56} color={theme.colors.primary} />
            </LinearGradient>
          </Animated.View>

          <Typography variant="header" className="text-3xl mb-4 text-center text-primary">
            Verify Your Email
          </Typography>
          <Typography className="text-gray-500 text-center text-base mb-2 leading-6 px-4">
            {email
              ? `We've sent a verification link to ${email}. Please check your inbox and click the link to verify your account.`
              : "We've sent a verification link to your email address. Please check your inbox and click the link to verify your account."}
          </Typography>
          <Typography className="text-gray-400 text-center text-sm mb-8">
            This helps us keep your account secure.
          </Typography>

          {/* Resend Section */}
          <StyledView className="w-full mb-8">
            <Typography className="text-gray-500 text-center text-sm mb-4">
              Didn't receive the email?
            </Typography>
            {resendCooldown > 0 ? (
              <Typography className="text-gray-400 text-center text-sm">
                Resend in {resendCooldown}s
              </Typography>
            ) : (
              <StyledTouchableOpacity onPress={handleResend}>
                <Typography className="text-accent font-semibold text-center">
                  Resend Verification Email
                </Typography>
              </StyledTouchableOpacity>
            )}
          </StyledView>

          <Button
            title="Continue to App"
            onPress={() => navigation.replace('App')}
            className="w-full mb-4 shadow-lg shadow-indigo-500/20"
          />

          <StyledTouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Typography className="text-gray-500 text-center">Back to Login</Typography>
          </StyledTouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
