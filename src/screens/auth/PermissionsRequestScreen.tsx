import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
// import * as ImagePicker from 'expo-image-picker'; // TODO: Install expo-image-picker
import { Camera } from 'expo-camera';
import {
  Screen,
  Typography,
  Button,
  StyledView,
  StyledTouchableOpacity,
} from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PERMISSIONS = [
  {
    id: 'camera',
    title: 'Camera Access',
    description: 'Scan and add items to your closet with AI-powered recognition',
    icon: 'camera',
    color: theme.colors.accent,
  },
  {
    id: 'photos',
    title: 'Photo Library',
    description: 'Import existing photos of your wardrobe items',
    icon: 'images',
    color: theme.colors.secondary,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Get outfit suggestions and style tips delivered to you',
    icon: 'notifications',
    color: '#10B981',
  },
];

export const PermissionsRequestScreen = ({ navigation }: any) => {
  const [granted, setGranted] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermission = async (id: string) => {
    try {
      if (id === 'camera') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status === 'granted') {
          setGranted((prev) => [...prev.filter((p) => p !== id), id]);
        } else {
          Alert.alert(
            'Permission Required',
            'Camera access is needed to scan items. Please enable it in Settings.'
          );
        }
      } else if (id === 'photos') {
        // TODO: Install expo-image-picker package
        // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        // if (status === 'granted') {
        //   setGranted(prev => [...prev.filter(p => p !== id), id]);
        // } else {
        //   Alert.alert('Permission Required', 'Photo library access is needed to import items. Please enable it in Settings.');
        // }
        setGranted((prev) => [...prev.filter((p) => p !== id), id]);
      } else if (id === 'notifications') {
        // For notifications, you'd typically use expo-notifications
        setGranted((prev) => [...prev.filter((p) => p !== id), id]);
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    // Simulate processing
    setTimeout(() => {
      setIsLoading(false);
      navigation.replace('App');
    }, 1000);
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Typography variant="header" className="text-4xl mb-2 text-primary">
            Enable Permissions
          </Typography>
          <Typography className="text-gray-500 text-base mb-8">
            Grant permissions to unlock the full potential of Veylo.
          </Typography>

          {/* Permissions List */}
          <StyledView className="mb-8">
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
                      backgroundColor: theme.colors.surface,
                      marginBottom: 16,
                      borderWidth: 2,
                      borderColor: isGranted ? permission.color : theme.colors.border,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                    }}
                  >
                    <LinearGradient
                      colors={[permission.color, permission.color + 'CC']}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 16,
                      }}
                    >
                      <Ionicons name={permission.icon as any} size={28} color="#FFF" />
                    </LinearGradient>

                    <StyledView style={{ flex: 1 }}>
                      <Typography className="text-lg font-semibold text-primary mb-1">
                        {permission.title}
                      </Typography>
                      <Typography className="text-sm text-gray-500">
                        {permission.description}
                      </Typography>
                    </StyledView>

                    {isGranted ? (
                      <Ionicons name="checkmark-circle" size={32} color={permission.color} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => requestPermission(permission.id)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: permission.color,
                        }}
                      >
                        <Typography className="text-white text-sm font-semibold">Enable</Typography>
                      </TouchableOpacity>
                    )}
                  </StyledView>
                </Animated.View>
              );
            })}
          </StyledView>

          <Button
            title="Continue"
            onPress={handleContinue}
            loading={isLoading}
            className="mb-4 shadow-lg shadow-indigo-500/20"
          />

          <StyledTouchableOpacity onPress={openSettings}>
            <Typography className="text-gray-500 text-center text-sm">
              Manage permissions in Settings
            </Typography>
          </StyledTouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
