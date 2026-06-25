import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PermissionItem = ({ icon, label, description, status, onPress, color }: any) => (
  <Card className="p-4 mb-3 border-0 shadow-sm">
    <StyledView className="flex-row items-center justify-between">
      <StyledView className="flex-row items-center flex-1">
        <LinearGradient
          colors={[color, color + 'CC']}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name={icon} size={20} color="#FFF" />
        </LinearGradient>
        <StyledView className="flex-1">
          <Typography className="text-primary font-semibold">{label}</Typography>
          {description && (
            <Typography className="text-gray-500 text-sm mt-0.5">{description}</Typography>
          )}
        </StyledView>
      </StyledView>
      <TouchableOpacity
        onPress={onPress}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: status === 'granted' ? theme.colors.success : theme.colors.primary,
        }}
      >
        <Typography className="text-white text-sm font-semibold">
          {status === 'granted' ? 'Granted' : 'Enable'}
        </Typography>
      </TouchableOpacity>
    </StyledView>
  </Card>
);

export const PrivacyPermissionsScreen = ({ navigation }: any) => {
  const [permissions, setPermissions] = useState({
    camera: 'granted',
    photos: 'granted',
    location: 'denied',
    notifications: 'granted',
  });

  const handlePermissionRequest = (key: string) => {
    if (permissions[key as keyof typeof permissions] === 'granted') {
      Alert.alert('Permission Already Granted', 'This permission is already enabled.');
      return;
    }

    Alert.alert(
      'Permission Required',
      `Veylo needs ${key} permission to function properly. Would you like to enable it in Settings?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
            // In a real app, you'd check the permission status after returning
            setPermissions((prev) => ({ ...prev, [key]: 'granted' }));
          },
        },
      ]
    );
  };

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 24, width: 40 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-4xl text-primary mb-2">
            Privacy & Permissions
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Manage what Veylo can access on your device
          </Typography>
        </Animated.View>

        {/* Permissions List */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <PermissionItem
            icon="camera"
            label="Camera"
            description="Scan and add items to your closet"
            status={permissions.camera}
            onPress={() => handlePermissionRequest('camera')}
            color={theme.colors.accent}
          />
          <PermissionItem
            icon="images"
            label="Photo Library"
            description="Import existing photos of your wardrobe"
            status={permissions.photos}
            onPress={() => handlePermissionRequest('photos')}
            color={theme.colors.secondary}
          />
          <PermissionItem
            icon="notifications"
            label="Notifications"
            description="Receive outfit suggestions and updates"
            status={permissions.notifications}
            onPress={() => handlePermissionRequest('notifications')}
            color="#10B981"
          />
          <PermissionItem
            icon="location"
            label="Location"
            description="Get weather-based outfit suggestions"
            status={permissions.location}
            onPress={() => handlePermissionRequest('location')}
            color="#F59E0B"
          />
        </Animated.View>

        {/* Privacy Info */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Card
            className="p-5 mt-6 border-0 shadow-sm"
            style={{ backgroundColor: theme.colors.background }}
          >
            <Ionicons
              name="shield-checkmark"
              size={32}
              color={theme.colors.accent}
              style={{ marginBottom: 12 }}
            />
            <Typography className="text-primary font-semibold text-lg mb-2">
              Your Privacy Matters
            </Typography>
            <Typography className="text-gray-600 text-sm leading-5">
              We only use permissions to provide you with the best experience. Your data is
              encrypted and never shared with third parties.
            </Typography>
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
