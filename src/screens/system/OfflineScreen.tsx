import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { Screen, Typography, Button, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface OfflineScreenProps {
  /** When set, calls goBack() after connectivity returns (e.g. modal stack). */
  navigation?: { goBack: () => void };
}

export const OfflineScreen = ({ navigation }: OfflineScreenProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && navigation?.goBack) {
        navigation.goBack();
      }
    });

    return () => unsubscribe();
  }, [navigation, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      if (state.isConnected && navigation?.goBack) {
        navigation.goBack();
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        <Animated.View
          style={[{ alignItems: 'center' }, animatedStyle]}
          entering={FadeIn.duration(600)}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 32,
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <Ionicons name="cloud-offline" size={64} color="#FFF" />
          </LinearGradient>

          <Typography
            variant="header"
            className="text-3xl text-primary mb-4 text-center"
            style={{ fontWeight: '700' }}
          >
            You're Offline
          </Typography>
          <Typography className="text-gray-500 text-center text-base mb-2 leading-6 px-4">
            It looks like you've lost your internet connection.
          </Typography>
          <Typography className="text-gray-400 text-center text-sm mb-12">
            Please check your connection and try again.
          </Typography>

          <StyledView style={{ width: '100%', gap: 12, marginBottom: 32 }}>
            {[
              { icon: 'wifi' as const, text: 'Check your Wi-Fi connection' },
              { icon: 'phone-portrait' as const, text: 'Check your mobile data' },
              { icon: 'refresh' as const, text: 'Try refreshing the app' },
            ].map((tip, index) => (
              <StyledView
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Ionicons
                  name={tip.icon}
                  size={24}
                  color={theme.colors.accent}
                  style={{ marginRight: 12 }}
                />
                <Typography className="text-base text-primary">{tip.text}</Typography>
              </StyledView>
            ))}
          </StyledView>

          <Button
            title={isChecking ? 'Checking…' : 'Retry connection'}
            onPress={handleRetry}
            disabled={isChecking}
            className="w-full shadow-lg shadow-orange-500/20"
          />
          {navigation?.goBack && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginTop: 16, padding: 12 }}
            >
              <Typography className="text-gray-500 text-center">Dismiss</Typography>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
