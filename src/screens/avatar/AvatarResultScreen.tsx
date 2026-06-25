import React from 'react';
import { ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Screen, Typography, Button, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

export const AvatarResultScreen = ({ navigation, route }: any) => {
  const { user } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { avatarUrl, avatarId } = route.params;

  const handleDone = () => {
    navigation.navigate('Profile');
  };

  const handleRegenerate = () => {
    navigation.navigate('AvatarGeneration');
  };

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
      >
        {/* Success Header */}
        <Animated.View entering={FadeInDown.duration(400)} className="items-center mb-6">
          <StyledView
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#D1FAE5',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          </StyledView>
          <Typography variant="header" className="text-3xl text-primary mb-2 text-center">
            Avatar Created!
          </Typography>
          <Typography className="text-gray-500 text-center">
            Your personalized avatar has been generated successfully
          </Typography>
        </Animated.View>

        {/* Avatar Preview */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Card className="p-6 mb-6 border-0 shadow-lg items-center">
            <StyledView
              style={{
                width: width - 120,
                height: width - 120,
                borderRadius: 20,
                backgroundColor: currentTheme.colors.background,
                marginBottom: 20,
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: currentTheme.colors.primary,
              }}
            >
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                contentFit="contain"
              />
            </StyledView>

            <Typography className="text-primary font-semibold text-lg mb-2">
              {user?.name || 'Your Avatar'}
            </Typography>
            <Typography className="text-gray-500 text-sm">
              Your avatar will appear in your profile
            </Typography>
          </Card>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Card className="p-6 mb-6 border-0 shadow-lg">
            <Typography className="text-primary font-semibold text-lg mb-4">
              What's Next?
            </Typography>

            <StyledView className="gap-4">
              <StyledView className="flex-row items-center">
                <StyledView
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: currentTheme.colors.primary + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="person-outline" size={24} color={currentTheme.colors.primary} />
                </StyledView>
                <StyledView className="flex-1">
                  <Typography className="text-primary font-semibold">Profile Avatar</Typography>
                  <Typography className="text-gray-500 text-sm">
                    Your avatar will be displayed on your profile
                  </Typography>
                </StyledView>
              </StyledView>

              <StyledView className="flex-row items-center">
                <StyledView
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: currentTheme.colors.secondary + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="shirt-outline" size={24} color={currentTheme.colors.secondary} />
                </StyledView>
                <StyledView className="flex-1">
                  <Typography className="text-primary font-semibold">Virtual Try-On</Typography>
                  <Typography className="text-gray-500 text-sm">
                    Use your avatar for virtual outfit try-ons
                  </Typography>
                </StyledView>
              </StyledView>

              <StyledView className="flex-row items-center">
                <StyledView
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: currentTheme.colors.primary + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="refresh-outline" size={24} color={currentTheme.colors.primary} />
                </StyledView>
                <StyledView className="flex-1">
                  <Typography className="text-primary font-semibold">Update Anytime</Typography>
                  <Typography className="text-gray-500 text-sm">
                    Generate a new avatar whenever you want
                  </Typography>
                </StyledView>
              </StyledView>
            </StyledView>
          </Card>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} className="gap-3">
          <Button onPress={handleDone} title="Done" className="w-full py-4 rounded-2xl" />

          <TouchableOpacity
            onPress={handleRegenerate}
            style={{
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: currentTheme.colors.background,
              borderWidth: 1,
              borderColor: currentTheme.colors.textSecondary,
              alignItems: 'center',
            }}
          >
            <StyledView className="flex-row items-center">
              <Ionicons name="refresh" size={20} color={currentTheme.colors.primary} />
              <Typography className="text-primary font-semibold ml-2">
                Create Another Avatar
              </Typography>
            </StyledView>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
