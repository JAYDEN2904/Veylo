import React from 'react';
import { View, Dimensions, ImageBackground } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Typography,
  StyledView,
  StyledTouchableOpacity,
  PrimaryButton,
} from '../../components/common';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const WELCOME_HERO = require('../../../assets/marketing/welcome-hero.jpg');

const SLIDE = {
  title: 'Your closet.\nYour style.\nUnlocked.',
  description: 'Discover the outfits hiding in your wardrobe — powered by AI.',
};

export const WelcomeCarouselScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
      <Animated.View entering={FadeIn.duration(600)} style={{ flex: 1 }}>
        <ImageBackground
          source={WELCOME_HERO}
          style={{ flex: 1, width, height }}
          resizeMode="cover"
        />
      </Animated.View>

      <LinearGradient
        colors={['transparent', 'rgba(26,28,30,0.25)', 'rgba(26,28,30,0.92)', '#1A1C1E']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.65,
          padding: 28,
          paddingBottom: insets.bottom + 40,
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Typography
            variant="header"
            style={{
              fontSize: 42,
              fontWeight: '800',
              color: '#FFFFFF',
              lineHeight: 48,
              marginBottom: 14,
              letterSpacing: -0.5,
              textShadowColor: 'rgba(0,0,0,0.4)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            {SLIDE.title}
          </Typography>
          <Typography
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 16,
              lineHeight: 24,
              fontWeight: '500',
              marginBottom: 36,
            }}
          >
            {SLIDE.description}
          </Typography>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(220)}>
          <StyledView style={{ gap: 14 }}>
            <PrimaryButton
              title="Find My Style DNA →"
              onPress={() => navigation.navigate('StyleQuiz')}
              accessibilityLabel="Start style quiz"
            />

            <StyledTouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{ paddingVertical: 8 }}
            >
              <Typography
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                Already have an account?{' '}
                <Typography
                  style={{
                    color: theme.colors.secondary,
                    fontWeight: '700',
                    fontSize: 14,
                  }}
                >
                  Log In
                </Typography>
              </Typography>
            </StyledTouchableOpacity>
          </StyledView>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};
