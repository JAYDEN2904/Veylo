import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Typography, Button } from '../../components/common';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { resendSignupOtp } from '../../services/authService';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export const EmailVerificationScreen = ({ navigation, route }: any) => {
  const email: string | undefined = route?.params?.email;
  const verifySignupOtp = useAuthStore((s) => s.verifySignupOtp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const submittingRef = useRef(false);

  const code = digits.join('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const submitCode = async (token: string) => {
    if (!email) {
      setError('Missing email. Go back and sign up again.');
      return;
    }
    if (submittingRef.current || isLoading) return;
    submittingRef.current = true;
    setError('');
    try {
      await verifySignupOtp(email, token);
      navigation.replace('EmailVerifiedSuccess', { email });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setError(message);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      submittingRef.current = false;
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      setError('');
      return;
    }

    // Paste / autofill of full code into one box
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LENGTH).split('');
      const next = Array(OTP_LENGTH)
        .fill('')
        .map((_, i) => chars[i] ?? '');
      setDigits(next);
      setError('');
      if (chars.length >= OTP_LENGTH) {
        void submitCode(chars.join(''));
      } else {
        inputRefs.current[chars.length]?.focus();
      }
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError('');

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const joined = next.join('');
    if (joined.length === OTP_LENGTH && next.every((d) => d.length === 1)) {
      void submitCode(joined);
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    try {
      await resendSignupOtp(email);
      setResendCooldown(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not resend the code. Try again shortly.';
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Screen className="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center' }}>
            <LinearGradient
              colors={[theme.colors.secondary, '#E8D89A']}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 28,
              }}
            >
              <Ionicons name="mail-open" size={44} color={theme.colors.primary} />
            </LinearGradient>

            <Typography variant="header" className="text-3xl mb-3 text-center text-primary">
              Enter verification code
            </Typography>
            <Typography className="text-gray-500 text-center text-base mb-2 leading-6 px-2">
              {email
                ? `We sent a 6-digit code to ${email}. Enter it below — you can stay in the app.`
                : 'We sent a 6-digit code to your email. Enter it below to verify your account.'}
            </Typography>
            <Typography className="text-gray-400 text-center text-sm mb-8">
              The code expires in about an hour.
            </Typography>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16,
                width: '100%',
              }}
            >
              {digits.map((digit, index) => (
                <TextInput
                  key={`otp-${index}`}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(text) => handleDigitChange(index, text)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={index === 0 ? OTP_LENGTH : 1}
                  editable={!isLoading}
                  selectTextOnFocus
                  style={{
                    width: 48,
                    height: 56,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: error
                      ? '#EF4444'
                      : digit
                        ? theme.colors.secondary
                        : theme.colors.border,
                    backgroundColor: '#FFFFFF',
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: '600',
                    color: theme.colors.primary,
                  }}
                  accessibilityLabel={`Digit ${index + 1} of ${OTP_LENGTH}`}
                />
              ))}
            </View>

            {error ? (
              <Typography className="text-red-500 text-center text-sm mb-4 px-4">
                {error}
              </Typography>
            ) : (
              <View style={{ height: 28 }} />
            )}

            <Button
              title={isLoading ? 'Verifying…' : 'Verify'}
              onPress={() => void submitCode(code)}
              disabled={code.length !== OTP_LENGTH || isLoading || !email}
              className="w-full mb-6"
            />

            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginBottom: 16 }} />
            ) : null}

            <Typography className="text-gray-500 text-center text-sm mb-3">
              Didn&apos;t get the email?
            </Typography>
            {resendCooldown > 0 ? (
              <Typography className="text-gray-400 text-center text-sm mb-8">
                Resend in {resendCooldown}s
              </Typography>
            ) : (
              <TouchableOpacity
                onPress={() => void handleResend()}
                disabled={isResending || !email}
                style={{ marginBottom: 32 }}
              >
                <Typography className="text-accent font-semibold text-center">
                  {isResending ? 'Sending…' : 'Resend code'}
                </Typography>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Typography className="text-gray-500 text-center">Back to Login</Typography>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};
