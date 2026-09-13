import React, { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

type PermissionKey = 'camera' | 'photos' | 'notifications' | 'location';
type PermissionStatus = 'granted' | 'denied' | 'undetermined';

function mapStatus(status?: string): PermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export const PrivacyPermissionsScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { currentTheme } = useThemeStore();
  const [permissions, setPermissions] = useState<Record<PermissionKey, PermissionStatus>>({
    camera: 'undetermined',
    photos: 'undetermined',
    notifications: 'undetermined',
    location: 'undetermined',
  });

  const refreshPermissions = useCallback(async () => {
    try {
      const [camera, photos, notifications, location] = await Promise.all([
        ImagePicker.getCameraPermissionsAsync(),
        ImagePicker.getMediaLibraryPermissionsAsync(),
        Notifications.getPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);
      setPermissions({
        camera: mapStatus(camera.status),
        photos: mapStatus(photos.status),
        notifications: mapStatus(notifications.status),
        location: mapStatus(location.status),
      });
    } catch (err) {
      if (__DEV__) console.warn('[PrivacyPermissions] refresh', err);
    }
  }, []);

  useEffect(() => {
    void refreshPermissions();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshPermissions();
    });
    return () => sub.remove();
  }, [refreshPermissions]);

  const handlePermissionRequest = async (key: PermissionKey) => {
    try {
      if (permissions[key] === 'granted') {
        Alert.alert('Already enabled', 'This permission is already granted. You can change it in iOS or Android Settings.');
        return;
      }

      if (key === 'camera') {
        const result = await ImagePicker.requestCameraPermissionsAsync();
        setPermissions((prev) => ({ ...prev, camera: mapStatus(result.status) }));
        if (result.status !== 'granted') Linking.openSettings();
        return;
      }
      if (key === 'photos') {
        const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setPermissions((prev) => ({ ...prev, photos: mapStatus(result.status) }));
        if (result.status !== 'granted') Linking.openSettings();
        return;
      }
      if (key === 'notifications') {
        const result = await Notifications.requestPermissionsAsync();
        setPermissions((prev) => ({ ...prev, notifications: mapStatus(result.status) }));
        if (result.status !== 'granted') Linking.openSettings();
        return;
      }
      const result = await Location.requestForegroundPermissionsAsync();
      setPermissions((prev) => ({ ...prev, location: mapStatus(result.status) }));
      if (result.status !== 'granted') Linking.openSettings();
    } catch (err) {
      if (__DEV__) console.warn('[PrivacyPermissions] request', err);
      Alert.alert('Permission error', 'Could not update this permission. Try again from Settings.');
    }
  };

  const rows: Array<{
    key: PermissionKey;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
  }> = [
    { key: 'camera', icon: 'camera', label: 'Camera', description: 'Scan garments into your closet' },
    { key: 'photos', icon: 'images', label: 'Photo Library', description: 'Import existing wardrobe photos' },
    {
      key: 'notifications',
      icon: 'notifications',
      label: 'Notifications',
      description: 'Outfit reminders and weather prompts',
    },
    { key: 'location', icon: 'location', label: 'Location', description: 'Weather-based outfit suggestions' },
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 24, width: 44, minHeight: 44 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography
            variant="header"
            style={{ color: currentTheme.colors.text, fontSize: 34, fontWeight: '700', marginBottom: 8 }}
          >
            Privacy & Permissions
          </Typography>
          <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 16, marginBottom: 24 }}>
            These statuses come from iOS / Android, not from a guessed default.
          </Typography>
        </Animated.View>

        {rows.map((row) => {
          const status = permissions[row.key];
          return (
            <Card key={row.key} style={{ marginBottom: 12, padding: 16 }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                  <StyledView
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: currentTheme.colors.mutedSurface,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={row.icon} size={20} color={currentTheme.colors.primary} />
                  </StyledView>
                  <StyledView style={{ flex: 1 }}>
                    <Typography style={{ color: currentTheme.colors.text, fontWeight: '600' }}>
                      {row.label}
                    </Typography>
                    <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {row.description}
                    </Typography>
                  </StyledView>
                </StyledView>
                <TouchableOpacity
                  onPress={() => {
                    void handlePermissionRequest(row.key);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    minHeight: 44,
                    borderRadius: 20,
                    justifyContent: 'center',
                    backgroundColor:
                      status === 'granted' ? currentTheme.colors.success : currentTheme.colors.primary,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.label} ${status === 'granted' ? 'granted' : 'enable'}`}
                >
                  <Typography style={{ color: currentTheme.colors.onPrimary, fontSize: 13, fontWeight: '600' }}>
                    {status === 'granted' ? 'Granted' : 'Enable'}
                  </Typography>
                </TouchableOpacity>
              </StyledView>
            </Card>
          );
        })}

        <Card style={{ marginTop: 16, padding: 20, backgroundColor: currentTheme.colors.surface }}>
          <Ionicons
            name="shield-checkmark"
            size={28}
            color={currentTheme.colors.accent}
            style={{ marginBottom: 12 }}
          />
          <Typography style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 17, marginBottom: 8 }}>
            Your privacy matters
          </Typography>
          <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Veylo uses these permissions only to scan clothes, suggest outfits, and send the reminders you enable.
          </Typography>
        </Card>
      </ScrollView>
    </Screen>
  );
};
