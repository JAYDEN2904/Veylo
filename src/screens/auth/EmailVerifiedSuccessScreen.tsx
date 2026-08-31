import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Dimensions, Platform, Pressable, View } from 'react-native';
import Animated, {
  Extrapolate,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../../components/common';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { hapticService } from '../../utils/haptics';

const { width, height } = Dimensions.get('window');

const FEATURE_CHIPS = [
  { key: 'ai', label: '✦ AI outfit ideas' },
  { key: 'scan', label: '📷 Scan your wardrobe' },
  { key: 'tryon', label: '🪞 Virtual try-on' },
] as const;

function firstNameFromUser(name?: string | null, email?: string | null): string | null {
  const trimmed = name?.trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (first) return first;
  }
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return null;
}

const FloatingOrb = ({
  delay = 0,
  size = 100,
  top,
  left,
  right,
  bottom,
}: {
  delay?: number;
  size?: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.55, { duration: 1000 }));
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
        colors={[`${theme.colors.secondary}40`, `${theme.colors.secondary}10`]}
        style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
      />
    </Animated.View>
  );
};

const Particle = ({
  delay,
  startX,
  startY,
  endX,
  endY,
  color,
}: {
  delay: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}) => {
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
    progress.value = withDelay(delay, withTiming(1, { duration: 1100 }));
    rotation.value = withDelay(delay, withTiming(Math.random() * 720 - 360, { duration: 1100 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [startX, endX], Extrapolate.CLAMP);
    const translateY = interpolate(
      progress.value,
      [0, 0.4, 1],
      [startY, startY - 150, endY],
      Extrapolate.CLAMP
    );
    const scale = interpolate(progress.value, [0, 0.2, 1], [0, 1, 0.3], Extrapolate.CLAMP);
    const particleOpacity = interpolate(progress.value, [0.7, 1], [1, 0], Extrapolate.CLAMP);

    return {
      opacity: opacity.value * particleOpacity,
      transform: [{ translateX }, { translateY }, { scale }, { rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

const ConfettiBurst = () => {
  const particles = useMemo(() => {
    const colors = [
      theme.colors.secondary,
      '#E8D89A',
      '#FFD700',
      '#F3E5AB',
      '#FFFFFF',
      theme.colors.accent,
    ];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      delay: Math.random() * 220,
      startX: width / 2 - 5,
      startY: height * 0.28,
      endX: Math.random() * width,
      endY: height * 0.28 + Math.random() * 280,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {particles.map((particle) => (
        <Particle key={particle.id} {...particle} />
      ))}
    </View>
  );
};

const HeroMedallion = () => {
  const circleScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const [showClosetIcon, setShowClosetIcon] = useState(false);

  useEffect(() => {
    circleScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    glowOpacity.value = withDelay(
      400,
      withSequence(withTiming(0.55, { duration: 350 }), withTiming(0.28, { duration: 600 }))
    );
    const timer = setTimeout(() => setShowClosetIcon(true), 900);
    return () => clearTimeout(timer);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: theme.colors.secondary,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={circleStyle}>
        <LinearGradient
          colors={[theme.colors.secondary, '#E8D89A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: theme.colors.secondary,
            shadowOpacity: 0.55,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        >
          <Ionicons
            name={showClosetIcon ? 'shirt-outline' : 'checkmark'}
            size={showClosetIcon ? 48 : 56}
            color={theme.colors.primary}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

export const EmailVerifiedSuccessScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const emailParam: string | undefined = route?.params?.email;
  const pendingVerifiedUser = useAuthStore((s) => s.pendingVerifiedUser);
  const completePendingAuth = useAuthStore((s) => s.completePendingAuth);
  const [isContinuing, setIsContinuing] = useState(false);

  const firstName = firstNameFromUser(
    pendingVerifiedUser?.name,
    pendingVerifiedUser?.email ?? emailParam
  );
  const headline = firstName ? `You're in, ${firstName}.` : "You're in.";

  useEffect(() => {
    hapticService.success();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleContinue = async () => {
    if (isContinuing) return;
    setIsContinuing(true);
    hapticService.medium();
    try {
      const pending = useAuthStore.getState().pendingVerifiedUser;
      if (!pending) {
        navigation.navigate('Login');
        return;
      }
      await completePendingAuth();
      // RootNavigator swaps to App when isAuthenticated becomes true.
    } catch {
      setIsContinuing(false);
      navigation.navigate('Login');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
      <LinearGradient
        colors={[theme.colors.primary, '#0A0B0C', theme.colors.primary]}
        style={{ flex: 1 }}
      >
        <FloatingOrb delay={0} size={160} top={-20} left={-40} />
        <FloatingOrb delay={300} size={120} top={height * 0.18} right={-30} />
        <FloatingOrb delay={600} size={90} bottom={120} left={width * 0.15} />

        <ConfettiBurst />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
            paddingTop: insets.top + 12,
          }}
        >
          <HeroMedallion />

          <Animated.View
            entering={FadeIn.duration(400).delay(250)}
            style={{ alignItems: 'center' }}
          >
            <Typography
              style={{
                color: theme.colors.secondary,
                fontSize: 12,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                fontWeight: '700',
                marginBottom: 12,
              }}
            >
              Member Verified
            </Typography>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(450).delay(350)}
            style={{ alignItems: 'center' }}
          >
            <Typography
              variant="header"
              style={{
                color: '#FFFFFF',
                fontSize: 32,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: 38,
                marginBottom: 14,
              }}
            >
              {headline}
            </Typography>
            <Typography
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
                maxWidth: 320,
                marginBottom: 32,
              }}
            >
              Your closet is about to get smarter. Scan it, style it, try it on — all in one place.
            </Typography>
          </Animated.View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            {FEATURE_CHIPS.map((chip, index) => (
              <Animated.View
                key={chip.key}
                entering={FadeInDown.duration(400).delay(500 + index * 120)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: `${theme.colors.secondary}18`,
                  borderWidth: 1,
                  borderColor: `${theme.colors.secondary}40`,
                }}
              >
                <Typography
                  style={{
                    color: theme.colors.secondary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {chip.label}
                </Typography>
              </Animated.View>
            ))}
          </View>
        </View>

        <Animated.View
          entering={FadeInDown.duration(450).delay(750)}
          style={{
            paddingHorizontal: 28,
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 24 : 20),
          }}
        >
          <Pressable
            onPress={() => void handleContinue()}
            disabled={isContinuing}
            accessibilityLabel="Step into your closet"
            style={({ pressed }) => ({
              opacity: isContinuing ? 0.7 : pressed ? 0.9 : 1,
              borderRadius: 16,
              overflow: 'hidden',
              minHeight: 56,
              shadowColor: theme.colors.secondary,
              shadowOpacity: 0.35,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            })}
          >
            <LinearGradient
              colors={[theme.colors.secondary, '#E8D89A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                minHeight: 56,
              }}
            >
              <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
              <Typography
                style={{
                  color: theme.colors.primary,
                  fontSize: 17,
                  fontWeight: '700',
                }}
              >
                {isContinuing ? 'Opening your closet…' : 'Step into your closet'}
              </Typography>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};
