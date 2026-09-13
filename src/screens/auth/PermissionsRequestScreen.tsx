import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Typography, Button, StyledView, StyledTouchableOpacity } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { requestNotificationPermissions } from '../../services/notificationService';

const PERMISSIONS = [
  {
    id: 'camera' as const,
    title: 'Camera Access',
    description: 'Scan and add items to your closet',
    icon: 'camera' as const,
  },
  {
    id: 'photos' as const,
    title: 'Photo Library',
    description: 'Import existing photos of your wardrobe items',
    icon: 'images' as const,
  },
  {
    id: 'notifications' as const,
    title: 'Notifications',
    description: 'Get outfit suggestions and style tips',
    icon: 'notifications' as const,
  },
];

export const PermissionsRequestScreen = ({ navigation }: any) => {
  const { currentTheme } = useThemeStore();
  const [granted, setGranted] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermission = async (id: string) => {
    try {
      if (id === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === 'granted') {
          setGranted((prev) => [...prev.filter((p) => p !== id), id]);
        } else {
          Alert.alert(
            'Permission needed',
            'Camera access is needed to scan items. You can enable it in Settings.'
          );
        }
        return;
      }
      if (id === 'photos') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status === 'granted') {
          setGranted((prev) => [...prev.filter((p) => p !== id), id]);
        } else {
          Alert.alert(
            'Permission needed',
            'Photo library access is needed to import items. You can enable it in Settings.'
          );
        }
        return;
      }
      const ok = await requestNotificationPermissions();
      if (ok) {
        setGranted((prev) => [...prev.filter((p) => p !== id), id]);
      } else {
        Alert.alert(
          'Permission needed',
          'Notifications are optional. Enable them in Settings if you want daily outfit reminders.'
        );
      }
    } catch (error) {
      if (__DEV__) console.error('[PermissionsRequest]', error);
    }
  };

  const handleContinue = () => {
    setIsLoading(true);
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.navigate('Signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Typography
            variant="header"
            style={{ fontSize: 34, marginBottom: 8, color: currentTheme.colors.text }}
          >
            Enable Permissions
          </Typography>
          <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 16, marginBottom: 32 }}>
            Grant permissions to unlock scanning and reminders. You can skip and enable them later.
          </Typography>

          <StyledView style={{ marginBottom: 32 }}>
            {PERMISSIONS.map((permission, index) => {
              const isGranted = granted.includes(permission.id);
              return (
                <Animated.View
                  key={permission.id}
                  entering={FadeInDown.duration(400).delay(index * 150)}
                >
                  <StyledView
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 20,
                      borderRadius: 16,
                      backgroundColor: currentTheme.colors.surface,
                      marginBottom: 16,
                      borderWidth: 2,
                      borderColor: isGranted ? currentTheme.colors.success : currentTheme.colors.border,
                    }}
                  >
                    <StyledView
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: currentTheme.colors.mutedSurface,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 16,
                      }}
                    >
                      <Ionicons name={permission.icon} size={28} color={currentTheme.colors.primary} />
                    </StyledView>

                    <StyledView style={{ flex: 1 }}>
                      <Typography
                        style={{ fontSize: 17, fontWeight: '600', color: currentTheme.colors.text, marginBottom: 4 }}
                      >
                        {permission.title}
                      </Typography>
                      <Typography style={{ fontSize: 13, color: currentTheme.colors.textSecondary }}>
                        {permission.description}
                      </Typography>
                    </StyledView>

                    {isGranted ? (
                      <Ionicons name="checkmark-circle" size={32} color={currentTheme.colors.success} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          void requestPermission(permission.id);
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          minHeight: 44,
                          borderRadius: 20,
                          justifyContent: 'center',
                          backgroundColor: currentTheme.colors.accent,
                        }}
                      >
                        <Typography
                          style={{ color: currentTheme.colors.onPrimary, fontSize: 13, fontWeight: '600' }}
                        >
                          Enable
                        </Typography>
                      </TouchableOpacity>
                    )}
                  </StyledView>
                </Animated.View>
              );
            })}
          </StyledView>

          <Button title="Continue" onPress={handleContinue} loading={isLoading} style={{ marginBottom: 16 }} />

          <StyledTouchableOpacity onPress={() => Linking.openSettings()}>
            <Typography style={{ color: currentTheme.colors.textSecondary, textAlign: 'center', fontSize: 14 }}>
              Manage permissions in Settings
            </Typography>
          </StyledTouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
