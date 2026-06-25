import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  Screen,
  Typography,
  Button,
  Input,
  StyledView,
  StyledTouchableOpacity,
} from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { isValidEmail } from '../../utils/emailValidation';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleReset = async () => {
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setEmailSent(true);
    }, 1500);
  };

  if (emailSent) {
    return (
      <Screen className="bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
            <LinearGradient
              colors={[theme.colors.secondary, '#E8D89A']}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 32,
                shadowColor: theme.colors.secondary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
              }}
            >
              <Ionicons name="mail" size={48} color={theme.colors.primary} />
            </LinearGradient>

            <Typography variant="header" className="text-3xl mb-4 text-center text-primary">
              Check Your Email
            </Typography>
            <Typography className="text-gray-500 text-center text-base mb-8 leading-6">
              We've sent password reset instructions to{'\n'}
              <Typography className="font-semibold text-primary">{email}</Typography>
            </Typography>

            <Button
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              className="w-full mb-4"
            />
            <StyledTouchableOpacity onPress={() => setEmailSent(false)}>
              <Typography className="text-accent font-semibold text-center">
                Resend Email
              </Typography>
            </StyledTouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen className="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 32, width: 40 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <StyledView className="mb-10">
              <Typography variant="header" className="text-4xl mb-2 text-primary">
                Reset Password
              </Typography>
              <Typography className="text-gray-500 text-base leading-6">
                Enter your email address and we'll send you instructions to reset your password.
              </Typography>
            </StyledView>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <Input
              label="Email Address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setEmailError('');
              }}
              placeholder="hello@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mb-8"
              error={emailError}
            />
          </Animated.View>

          {/* Action Button */}
          <Animated.View entering={FadeInDown.duration(600).delay(300)}>
            <Button
              title="Send Reset Link"
              onPress={handleReset}
              loading={isLoading}
              disabled={!email}
              className="mb-6 shadow-lg shadow-indigo-500/20"
            />
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.duration(600).delay(400)}>
            <StyledView className="flex-row justify-center items-center mt-auto">
              <Typography className="text-gray-500">Remember your password? </Typography>
              <StyledTouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Typography className="text-accent font-bold">Log In</Typography>
              </StyledTouchableOpacity>
            </StyledView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};
