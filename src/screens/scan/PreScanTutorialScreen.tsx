import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
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

const { width } = Dimensions.get('window');

const TIPS = [
  {
    id: 1,
    icon: 'sunny',
    title: 'Good Lighting',
    description: "Make sure you're in a well-lit area for best results",
  },
  {
    id: 2,
    icon: 'square',
    title: 'Flat Surface',
    description: 'Place items on a flat, neutral-colored surface',
  },
  {
    id: 3,
    icon: 'camera',
    title: 'Clear View',
    description: 'Ensure the entire item is visible in the frame',
  },
  {
    id: 4,
    icon: 'flash',
    title: 'AI Magic',
    description: 'Our AI will automatically detect and tag your items',
  },
];

export const PreScanTutorialScreen = ({ navigation }: any) => {
  const [currentTip, setCurrentTip] = useState(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleNext = () => {
    if (currentTip < TIPS.length - 1) {
      setCurrentTip(currentTip + 1);
      scale.value = withSpring(1.1, { damping: 8 });
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 8 });
      }, 200);
    } else {
      navigation.navigate('LiveCameraScan');
    }
  };

  const handleSkip = () => {
    navigation.navigate('LiveCameraScan');
  };

  return (
    <Screen className="bg-background">
      <LinearGradient colors={[theme.colors.primary, '#2A2D31']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          {/* Progress Indicator */}
          <StyledView
            style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 48, gap: 8 }}
          >
            {TIPS.map((_, index) => (
              <StyledView
                key={index}
                style={{
                  width: index === currentTip ? 32 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    index === currentTip ? theme.colors.secondary : theme.colors.secondary + '40',
                }}
              />
            ))}
          </StyledView>

          {/* Tip Content */}
          <Animated.View style={[{ alignItems: 'center' }, animatedStyle]}>
            <LinearGradient
              colors={[theme.colors.secondary, '#E8D89A']}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 32,
                shadowColor: theme.colors.secondary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
              }}
            >
              <Ionicons
                name={TIPS[currentTip].icon as any}
                size={56}
                color={theme.colors.primary}
              />
            </LinearGradient>

            <Typography
              variant="header"
              className="text-3xl text-secondary mb-4 text-center"
              style={{ fontWeight: '700' }}
            >
              {TIPS[currentTip].title}
            </Typography>
            <Typography className="text-gray-300 text-center text-lg leading-7 mb-12">
              {TIPS[currentTip].description}
            </Typography>
          </Animated.View>

          {/* Action Buttons */}
          <StyledView style={{ gap: 12 }}>
            <Button
              title={currentTip === TIPS.length - 1 ? 'Start Scanning' : 'Next'}
              onPress={handleNext}
              variant="secondary"
              className="shadow-lg shadow-yellow-500/20"
            />
            {currentTip < TIPS.length - 1 && (
              <StyledTouchableOpacity onPress={handleSkip}>
                <Typography className="text-gray-400 text-center font-medium">
                  Skip Tutorial
                </Typography>
              </StyledTouchableOpacity>
            )}
          </StyledView>
        </ScrollView>
      </LinearGradient>
    </Screen>
  );
};
