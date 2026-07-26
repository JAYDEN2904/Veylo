import React, { useCallback, useState } from 'react';
import { Alert, Platform, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Typography, PrimaryButton, SecondaryButton } from '../../components/common';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';
import {
  getMainTabBarFloatingStyle,
  MAIN_TAB_BAR_HIDDEN_STYLE,
} from '../../navigation/tabBarStyles';
import { getBottomTabNavigatorNavigation } from '../../navigation/screenProps';
import { theme } from '../../theme';

/** Square crop helps keep garments centered like the old viewfinder. */
const GARMENT_ASPECT: [number, number] = [1, 1];

const SCAN_TIPS = [
  { icon: 'sunny-outline' as const, text: 'Good lighting' },
  { icon: 'crop-outline' as const, text: 'Center the item' },
  { icon: 'square-outline' as const, text: 'Flat, plain background' },
];

export const LiveCameraScanScreen = ({ navigation }: any) => {
  const { currentTheme, mode } = useThemeStore();
  const [isBusy, setIsBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const tabNavigation = getBottomTabNavigatorNavigation(navigation);
      if (!tabNavigation?.setOptions) {
        return;
      }
      tabNavigation.setOptions({
        tabBarStyle: MAIN_TAB_BAR_HIDDEN_STYLE,
      });
      return () => {
        tabNavigation.setOptions({
          tabBarStyle: getMainTabBarFloatingStyle(mode, currentTheme.colors.surface),
        });
      };
    }, [navigation, mode, currentTheme.colors.surface])
  );

  const handleCloseScan = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const tabNavigation = getBottomTabNavigatorNavigation(navigation);
    tabNavigation?.navigate('TodayStack' as never);
  }, [navigation]);

  const routeCapturedUris = (uris: string[]) => {
    if (uris.length === 0) return;
    if (uris.length === 1) {
      navigation.navigate('ScanProcessing', { imageUri: uris[0] });
      return;
    }
    navigation.navigate('BatchScanQueue', { uris });
  };

  const takePicture = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera access needed',
          'To scan your wardrobe, Veylo needs access to your camera.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: GARMENT_ASPECT,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      routeCapturedUris([result.assets[0].uri]);
    } catch (err) {
      if (__DEV__) console.error('[LiveCameraScan] takePicture', err);
      Alert.alert('Error', 'Could not open the camera. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo library access needed',
          'Allow photo access to import wardrobe items from your library.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (result.canceled) return;
      const uris = (result.assets ?? []).map((asset) => asset.uri).filter(Boolean);
      routeCapturedUris(uris);
    } catch (err) {
      if (__DEV__) console.error('[LiveCameraScan] gallery pick failed:', err);
      Alert.alert('Error', 'Could not open your photo library. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Screen className="flex-1" style={{ backgroundColor: currentTheme.colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: Platform.OS === 'ios' ? 56 : 40,
          paddingHorizontal: 20,
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={handleCloseScan}
          accessibilityRole="button"
          accessibilityLabel="Close scan"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: currentTheme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="close" size={22} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Typography style={{ fontSize: 18, fontWeight: '700', color: currentTheme.colors.text }}>
          Scan Item
        </Typography>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{ alignItems: 'center', marginBottom: 32 }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: theme.colors.secondary + '33',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Ionicons name="shirt-outline" size={44} color={theme.colors.primary} />
          </View>
          <Typography
            variant="header"
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: currentTheme.colors.text,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Add to your closet
          </Typography>
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              textAlign: 'center',
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Take a clear photo of one garment, or import several from your library.
          </Typography>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 28,
          }}
        >
          {SCAN_TIPS.map((tip) => (
            <View
              key={tip.text}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: currentTheme.colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Ionicons
                name={tip.icon}
                size={14}
                color={theme.colors.primary}
                style={{ marginRight: 6 }}
              />
              <Typography
                style={{ fontSize: 12, fontWeight: '500', color: currentTheme.colors.text }}
              >
                {tip.text}
              </Typography>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={{ gap: 12 }}>
          <PrimaryButton
            title="Take photo"
            icon="camera"
            onPress={takePicture}
            loading={isBusy}
            disabled={isBusy}
            accessibilityLabel="Take photo of clothing item"
          />
          <SecondaryButton
            title="Import from library"
            icon="images"
            onPress={pickFromGallery}
            disabled={isBusy}
            accessibilityLabel="Import photos from library"
          />
        </Animated.View>
      </View>
    </Screen>
  );
};
