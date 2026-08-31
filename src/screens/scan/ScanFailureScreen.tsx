import React from 'react';
import { ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import {
  Screen,
  Typography,
  PrimaryButton,
  GhostButton,
  StyledView,
} from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const ScanFailureScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const error = route.params?.error || 'Unable to process image';
  const scale = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSequence(withSpring(1.1, { damping: 8 }), withSpring(1, { damping: 8 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        <Animated.View
          style={[{ alignItems: 'center' }, animatedStyle]}
          entering={FadeIn.duration(600)}
        >
          {/* Error Icon */}
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 32,
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <Ionicons name="close-circle" size={64} color={currentTheme.colors.onPrimary} />
          </LinearGradient>

          <Typography
            variant="header"
            className="text-3xl text-primary mb-4 text-center"
            style={{ fontWeight: '700' }}
          >
            Scan Failed
          </Typography>
          <Typography
            className="text-center text-base mb-2 leading-6 px-4"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            {error}
          </Typography>
          <Typography
            className="text-center text-sm mb-12"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Please try again with better lighting or a clearer image.
          </Typography>

          {/* Tips */}
          <StyledView style={{ width: '100%', gap: 12, marginBottom: 32 }}>
            {[
              { icon: 'sunny', text: 'Ensure good lighting' },
              { icon: 'camera', text: 'Keep item in focus' },
              { icon: 'square', text: 'Use a plain background' },
            ].map((tip, index) => (
              <StyledView
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: currentTheme.colors.surface,
                  borderWidth: 1,
                  borderColor: currentTheme.colors.border,
                }}
              >
                <Ionicons
                  name={tip.icon as any}
                  size={24}
                  color={currentTheme.colors.accent}
                  style={{ marginRight: 12 }}
                />
                <Typography className="text-base text-primary">{tip.text}</Typography>
              </StyledView>
            ))}
          </StyledView>

          {/* Action Buttons */}
          <StyledView style={{ width: '100%', gap: 12 }}>
            <PrimaryButton
              title="Try Again"
              onPress={() => navigation.navigate('LiveCameraScan')}
            />
            <GhostButton
              title="Cancel"
              fullWidth
              onPress={() => {
                const parent = navigation.getParent?.();
                if (parent) {
                  parent.navigate('TodayStack', { screen: 'WardrobeHome' });
                } else {
                  navigation.goBack();
                }
              }}
            />
          </StyledView>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
