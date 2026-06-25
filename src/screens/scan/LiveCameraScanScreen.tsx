import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  FadeInDown,
  interpolate,
  Extrapolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Typography, Button, StyledView } from '../../components/common';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '../../store/useScanStore';
import { useThemeStore } from '../../store/useThemeStore';
import {
  getMainTabBarFloatingStyle,
  MAIN_TAB_BAR_HIDDEN_STYLE,
} from '../../navigation/tabBarStyles';
import { getBottomTabNavigatorNavigation } from '../../navigation/screenProps';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const VIEWFINDER_SIZE = width * 0.75;

// Scanning frame corners
const FrameCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const cornerStyles: any = {
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 24 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 24 },
    bl: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 24,
    },
    br: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 24,
    },
  };

  return (
    <Animated.View
      entering={FadeIn.duration(800).delay(300)}
      style={[
        {
          position: 'absolute',
          width: 40,
          height: 40,
          borderColor: theme.colors.secondary,
        },
        cornerStyles[position],
      ]}
    />
  );
};

// Scanning line animation
const ScanLine = () => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(VIEWFINDER_SIZE - 4, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(translateY);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={['transparent', theme.colors.secondary, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

// Tip component
const ScanTip = ({ icon, text, delay }: { icon: string; text: string; delay: number }) => (
  <Animated.View
    entering={FadeInDown.duration(500).delay(delay)}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      marginHorizontal: 4,
    }}
  >
    <Ionicons
      name={icon as any}
      size={16}
      color={theme.colors.secondary}
      style={{ marginRight: 8 }}
    />
    <Typography style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500' }}>{text}</Typography>
  </Animated.View>
);

export const LiveCameraScanScreen = ({ navigation }: any) => {
  const { currentTheme, mode } = useThemeStore();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<CameraType>(CameraType.back);
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<Camera | null>(null);
  const { queue, addToQueue } = useScanStore();

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

  // Animations
  const captureScale = useSharedValue(1);
  const captureRing = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    // Pulse animation for capture button
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 1000 }), withTiming(0.4, { duration: 1000 })),
      -1,
      true
    );

    return () => {
      cancelAnimation(pulseOpacity);
    };
  }, []);

  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        console.warn('[LiveCameraScan] media library permission denied');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });
      if (result.canceled) return;
      const assets = result.assets ?? [];
      if (assets.length === 0) return;
      for (const asset of assets) {
        if (asset.uri) addToQueue(asset.uri);
      }
      if (assets.length === 1) {
        navigation.navigate('ScanProcessing', { imageUri: assets[0].uri });
      } else {
        navigation.navigate('BatchSummary');
      }
    } catch (err) {
      console.error('[LiveCameraScan] gallery pick failed:', err);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);

      // Capture animation
      captureScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withSpring(1, { damping: 8 })
      );
      captureRing.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        addToQueue(photo.uri);

        // Brief feedback delay
        setTimeout(() => {
          setIsCapturing(false);
        }, 300);
      } catch (error) {
        setIsCapturing(false);
        console.error('Error taking picture:', error);
      }
    }
  };

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const captureRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureRing.value }],
    opacity: pulseOpacity.value,
  }));

  if (hasPermission === null) {
    return (
      <Screen className="bg-primary justify-center items-center">
        <Typography className="text-white">Requesting camera permission...</Typography>
      </Screen>
    );
  }

  if (hasPermission === false) {
    return (
      <Screen className="bg-primary justify-center items-center p-6">
        <Ionicons
          name="camera-outline"
          size={64}
          color={theme.colors.secondary}
          style={{ marginBottom: 24, opacity: 0.5 }}
        />
        <Typography className="text-white text-xl font-bold text-center mb-2">
          Camera Access Needed
        </Typography>
        <Typography className="text-gray-400 text-center mb-6">
          To scan your wardrobe, Veylo needs access to your camera.
        </Typography>
        <TouchableOpacity
          onPress={() => Camera.requestCameraPermissionsAsync()}
          style={{
            backgroundColor: theme.colors.secondary,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 28,
          }}
        >
          <Typography style={{ color: theme.colors.primary, fontWeight: '700' }}>
            Grant Permission
          </Typography>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={type}
        ref={cameraRef}
        flashMode={flash ? FlashMode.on : FlashMode.off}
      >
        {/* Top gradient overlay */}
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.topOverlay}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <TouchableOpacity onPress={handleCloseScan} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Typography style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                Scan Item
              </Typography>
              {queue.length > 0 && (
                <View
                  style={{
                    backgroundColor: theme.colors.secondary,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    marginLeft: 8,
                  }}
                >
                  <Typography
                    style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700' }}
                  >
                    {queue.length}
                  </Typography>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setFlash(!flash)}
              style={[styles.headerButton, flash && { backgroundColor: theme.colors.secondary }]}
            >
              <Ionicons
                name={flash ? 'flash' : 'flash-off'}
                size={20}
                color={flash ? theme.colors.primary : '#FFFFFF'}
              />
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        {/* Viewfinder */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.viewfinderContainer}>
          <View style={styles.viewfinder}>
            <FrameCorner position="tl" />
            <FrameCorner position="tr" />
            <FrameCorner position="bl" />
            <FrameCorner position="br" />
            <ScanLine />

            {/* Center guide */}
            <View style={styles.centerGuide}>
              <Ionicons name="shirt-outline" size={48} color="rgba(255,255,255,0.2)" />
            </View>
          </View>
        </Animated.View>

        {/* Bottom controls */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomOverlay}>
          {/* Tips */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(400)}
            style={styles.tipsContainer}
          >
            <ScanTip icon="sunny-outline" text="Good lighting" delay={600} />
            <ScanTip icon="crop-outline" text="Center item" delay={700} />
          </Animated.View>

          {/* From Library */}
          <Animated.View entering={FadeInDown.duration(500).delay(450)} style={styles.libraryRow}>
            <TouchableOpacity
              onPress={pickFromGallery}
              accessibilityRole="button"
              accessibilityLabel="Import photos from library"
              style={styles.libraryButton}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Typography style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                Import from Library
              </Typography>
            </TouchableOpacity>
          </Animated.View>

          {/* Controls */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.controls}>
            {/* Gallery/Queue Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('BatchSummary')}
              style={styles.sideButton}
            >
              <Ionicons name="images" size={28} color="#FFFFFF" />
              {queue.length > 0 && (
                <View style={styles.badgeContainer}>
                  <Typography style={styles.badgeText}>{queue.length}</Typography>
                </View>
              )}
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              onPress={takePicture}
              disabled={isCapturing}
              activeOpacity={0.9}
              style={styles.captureButtonOuter}
            >
              <Animated.View style={[styles.captureRing, captureRingStyle]} />
              <Animated.View style={[styles.captureButton, captureButtonStyle]}>
                <LinearGradient
                  colors={[theme.colors.secondary, '#E8D89A']}
                  style={styles.captureGradient}
                >
                  {isCapturing && (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: theme.colors.primary,
                      }}
                    />
                  )}
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>

            {/* Flip Camera Button */}
            <TouchableOpacity
              onPress={() => setType(type === CameraType.back ? CameraType.front : CameraType.back)}
              style={styles.sideButton}
            >
              <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Process Queue Button */}
          {queue.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.processButton}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ScanProcessing')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.secondary,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 28,
                }}
              >
                <Ionicons
                  name="flash"
                  size={20}
                  color={theme.colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Typography
                  style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 16 }}
                >
                  Process {queue.length} Item{queue.length > 1 ? 's' : ''}
                </Typography>
              </TouchableOpacity>
            </Animated.View>
          )}
        </LinearGradient>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: 'relative',
  },
  centerGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingTop: 60,
  },
  tipsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  libraryRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.secondary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  captureButtonOuter: {
    marginHorizontal: 32,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: theme.colors.secondary,
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },
  captureGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processButton: {
    alignItems: 'center',
    marginTop: 20,
  },
});
