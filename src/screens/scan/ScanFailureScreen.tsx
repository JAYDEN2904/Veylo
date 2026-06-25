import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
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

export const ScanFailureScreen = ({ navigation, route }: any) => {
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
            <Ionicons name="close-circle" size={64} color="#FFF" />
          </LinearGradient>

          <Typography
            variant="header"
            className="text-3xl text-primary mb-4 text-center"
            style={{ fontWeight: '700' }}
          >
            Scan Failed
          </Typography>
          <Typography className="text-gray-500 text-center text-base mb-2 leading-6 px-4">
            {error}
          </Typography>
          <Typography className="text-gray-400 text-center text-sm mb-12">
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
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Ionicons
                  name={tip.icon as any}
                  size={24}
                  color={theme.colors.accent}
                  style={{ marginRight: 12 }}
                />
                <Typography className="text-base text-primary">{tip.text}</Typography>
              </StyledView>
            ))}
          </StyledView>

          {/* Action Buttons */}
          <StyledView style={{ width: '100%', gap: 12 }}>
            <Button
              title="Try Again"
              onPress={() => navigation.navigate('LiveCameraScan')}
              className="shadow-lg shadow-red-500/20"
            />
            <TouchableOpacity
              onPress={() => {
                const parent = navigation.getParent?.();
                if (parent) {
                  parent.navigate('TodayStack', { screen: 'WardrobeHome' });
                } else {
                  navigation.goBack();
                }
              }}
              style={{
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Typography className="text-gray-500 font-semibold">Cancel</Typography>
            </TouchableOpacity>
          </StyledView>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
