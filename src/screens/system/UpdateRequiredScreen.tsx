import React from 'react';
import { ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Screen, Typography, Button, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const UpdateRequiredScreen = ({ navigation }: any) => {
  const scale = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSequence(withSpring(1.1, { damping: 8 }), withSpring(1, { damping: 8 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleUpdate = () => {
    const storeUrl =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/veylo'
        : 'https://play.google.com/store/apps/details?id=com.veylo.app';
    Linking.openURL(storeUrl);
  };

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        <Animated.View
          style={[{ alignItems: 'center' }, animatedStyle]}
          entering={FadeIn.duration(600)}
        >
          {/* Update Icon */}
          <LinearGradient
            colors={[theme.colors.accent, theme.colors.accent + 'CC']}
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 32,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <Ionicons name="arrow-down-circle" size={64} color="#FFF" />
          </LinearGradient>

          <Typography
            variant="header"
            className="text-3xl text-primary mb-4 text-center"
            style={{ fontWeight: '700' }}
          >
            Update Required
          </Typography>
          <Typography className="text-gray-500 text-center text-base mb-2 leading-6 px-4">
            A new version of Veylo is available with exciting features and improvements.
          </Typography>
          <Typography className="text-gray-400 text-center text-sm mb-12">
            Please update to continue using the app.
          </Typography>

          {/* Features List */}
          <StyledView style={{ width: '100%', gap: 12, marginBottom: 32 }}>
            {[
              { icon: 'flash', text: 'New AI features' },
              { icon: 'shield-checkmark', text: 'Security improvements' },
              { icon: 'speedometer', text: 'Performance enhancements' },
            ].map((feature, index) => (
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
                  name={feature.icon as any}
                  size={24}
                  color={theme.colors.accent}
                  style={{ marginRight: 12 }}
                />
                <Typography className="text-base text-primary">{feature.text}</Typography>
              </StyledView>
            ))}
          </StyledView>

          {/* Action Button */}
          <Button
            title="Update Now"
            onPress={handleUpdate}
            className="w-full shadow-lg shadow-indigo-500/20"
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
