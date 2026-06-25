import React, { useState, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  FadeInDown,
} from 'react-native-reanimated';
import {
  Screen,
  Typography,
  StyledView,
  StyledTouchableOpacity,
  PrimaryButton,
} from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { isValidEmail } from '../../utils/emailValidation';
import type { AuthStackScreenProps } from '../../navigation/screenProps';

const { width, height } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Floating orb decoration
const FloatingOrb = ({ delay = 0, size = 100, top, left, right, bottom }: any) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.6, { duration: 1000 }));
    translateY.value = withDelay(
      delay,
      withSequence(withTiming(-15, { duration: 2000 }), withTiming(15, { duration: 2000 }))
    );

    const interval = setInterval(() => {
      translateY.value = withSequence(
        withTiming(-15, { duration: 2000 }),
        withTiming(15, { duration: 2000 })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          right,
          bottom,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.secondary + '40', theme.colors.secondary + '10']}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: size / 2,
        }}
      />
    </Animated.View>
  );
};

// Custom Input with animations
const AnimatedInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  delay = 0,
  icon,
  error,
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderColor = useSharedValue(0);

  useEffect(() => {
    borderColor.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor:
      interpolate(borderColor.value, [0, 1], [0, 1]) === 1
        ? theme.colors.secondary
        : 'rgba(255,255,255,0.1)',
  }));

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(delay)}>
      <Typography className="text-gray-400 text-xs font-semibold mb-2 ml-1 uppercase tracking-wider">
        {label}
      </Typography>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            borderWidth: 2,
            paddingHorizontal: 16,
            height: 56,
          },
          animatedBorderStyle,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isFocused ? theme.colors.secondary : '#6B7280'}
          style={{ marginRight: 12 }}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            fontSize: 16,
            color: '#FFFFFF',
            fontWeight: '400',
          }}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? <Typography className="text-red-400 text-xs mt-2 ml-1">{error}</Typography> : null}
    </Animated.View>
  );
};

type LoginNav = AuthStackScreenProps<'Login'>;

export const LoginScreen = ({ navigation }: LoginNav) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const { login, loginWithGoogle, loginWithApple, isLoading } = useAuthStore();

  // Animations
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 12 });
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    await login(email, password);
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      Alert.alert('Google Sign-In', message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign-in failed.';
      Alert.alert('Apple Sign-In', message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
      {/* Background gradient */}
      <LinearGradient
        colors={[theme.colors.primary, '#0A0B0C', theme.colors.primary]}
        locations={[0, 0.5, 1]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Floating orbs */}
      <FloatingOrb delay={0} size={200} top={-50} right={-80} />
      <FloatingOrb delay={500} size={150} top={height * 0.3} left={-60} />
      <FloatingOrb delay={1000} size={100} bottom={100} right={-30} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                position: 'absolute',
                top: 20,
                left: 0,
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Logo Section */}
          <Animated.View
            style={[{ alignItems: 'center', marginBottom: 48, marginTop: 80 }, logoAnimatedStyle]}
          >
            {/* Logo badge */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                marginBottom: 24,
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.secondary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
              }}
            >
              <LinearGradient
                colors={[theme.colors.secondary, '#E8D89A']}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="shirt" size={36} color={theme.colors.primary} />
              </LinearGradient>
            </View>

            <Typography
              variant="header"
              className="text-4xl mb-3"
              style={{
                color: '#FFFFFF',
                fontWeight: '700',
              }}
            >
              Welcome Back
            </Typography>
            <Typography className="text-gray-400 text-center text-base" style={{ maxWidth: 280 }}>
              Sign in to continue your smart fashion journey
            </Typography>
          </Animated.View>

          {/* Form */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ marginBottom: 20 }}>
              <AnimatedInput
                label="Email"
                value={email}
                onChangeText={(t: string) => {
                  setEmail(t);
                  setEmailError('');
                }}
                placeholder="hello@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                delay={200}
                error={emailError}
              />
            </View>
            <View style={{ marginBottom: 12 }}>
              <AnimatedInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                icon="lock-closed-outline"
                delay={300}
              />
            </View>

            {/* Forgot Password */}
            <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={{ alignSelf: 'flex-end', paddingVertical: 8 }}
              >
                <Typography className="font-semibold" style={{ color: theme.colors.secondary }}>
                  Forgot Password?
                </Typography>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Animated.View
            entering={FadeInDown.duration(500).delay(500)}
            style={{ marginBottom: 24 }}
          >
            <PrimaryButton
              title={isLoading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={isLoading}
              disabled={!email || !password}
              accessibilityLabel="Sign in"
            />
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeInDown.duration(500).delay(600)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <Typography className="text-gray-500 mx-4 text-sm">or continue with</Typography>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            </View>
          </Animated.View>

          {/* Social Login */}
          <Animated.View entering={FadeInDown.duration(500).delay(700)}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={handleAppleSignIn}
                  disabled={isLoading}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <Ionicons name="logo-google" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Create Account */}
          <Animated.View entering={FadeInDown.duration(500).delay(800)}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 32,
              }}
            >
              <Typography className="text-gray-400">Don't have an account? </Typography>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Typography className="font-bold" style={{ color: theme.colors.secondary }}>
                  Sign Up
                </Typography>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
