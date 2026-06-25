import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Button, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const CameraPermissionScreen = ({ navigation }: any) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        navigation.replace('LiveCameraScan');
      } else {
        Alert.alert(
          'Permission Required',
          'Camera access is required to scan items. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request camera permission. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
        <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
          {/* Icon */}
          <LinearGradient
            colors={[theme.colors.accent, theme.colors.accent + 'CC']}
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 32,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <Ionicons name="camera" size={70} color="#FFF" />
          </LinearGradient>

          <Typography
            variant="header"
            className="text-3xl text-primary mb-4 text-center"
            style={{ fontWeight: '700' }}
          >
            Camera Access Needed
          </Typography>
          <Typography className="text-gray-500 text-center text-base mb-2 leading-6 px-4">
            Veylo needs access to your camera to scan and add items to your digital closet.
          </Typography>
          <Typography className="text-gray-400 text-center text-sm mb-12">
            Your photos are stored securely and never shared.
          </Typography>

          {/* Benefits */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <StyledView style={{ width: '100%', gap: 16, marginBottom: 32 }}>
              {[
                { icon: 'scan', text: 'AI-powered item recognition' },
                { icon: 'flash', text: 'Instant categorization' },
                { icon: 'lock-closed', text: 'Private and secure' },
              ].map((benefit, index) => (
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
                    name={benefit.icon as any}
                    size={24}
                    color={theme.colors.accent}
                    style={{ marginRight: 12 }}
                  />
                  <Typography className="text-base text-primary">{benefit.text}</Typography>
                </StyledView>
              ))}
            </StyledView>
          </Animated.View>

          {/* Action Button */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Button
              title="Enable Camera Access"
              onPress={handleRequestPermission}
              loading={isRequesting}
              className="w-full shadow-lg shadow-indigo-500/20"
            />
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
