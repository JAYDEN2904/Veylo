import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeInDown,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { Screen, Typography, Button, StyledView, Card } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTryOnStore } from '../../store/useTryOnStore';
import { useTryOnHistoryStore } from '../../store/useTryOnHistoryStore';
import { shareTryOnResult, saveImageToDevice } from '../../utils/shareService';

const { width, height } = Dimensions.get('window');

// Before/After comparison slider (simplified version)
const ComparisonView = ({ beforeUri, afterUri }: { beforeUri: string; afterUri: string }) => {
  const [showBefore, setShowBefore] = useState(false);

  return (
    <View style={{ borderRadius: 24, overflow: 'hidden' }}>
      <Image
        source={{ uri: showBefore ? beforeUri : afterUri }}
        style={{
          width: '100%',
          height: width * 1.3,
          backgroundColor: theme.colors.background,
        }}
        contentFit="cover"
      />

      {/* Toggle Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => setShowBefore(!showBefore)}
          style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(0,0,0,0.7)',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 24,
            alignItems: 'center',
          }}
        >
          <Ionicons
            name={showBefore ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Typography style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
            {showBefore ? 'Show Try-On' : 'Show Original'}
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Label */}
      <View
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: showBefore ? 'rgba(0,0,0,0.7)' : theme.colors.secondary,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 16,
        }}
      >
        <Typography
          style={{
            color: showBefore ? '#FFFFFF' : theme.colors.primary,
            fontSize: 12,
            fontWeight: '700',
          }}
        >
          {showBefore ? 'ORIGINAL' : 'TRY-ON RESULT'}
        </Typography>
      </View>
    </View>
  );
};

// Action button component
const ActionButton = ({ icon, label, onPress, color, isPrimary }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      alignItems: 'center',
      padding: 16,
      borderRadius: 20,
      backgroundColor: isPrimary ? color : theme.colors.surface,
      borderWidth: isPrimary ? 0 : 1,
      borderColor: theme.colors.border,
      flex: 1,
    }}
  >
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: isPrimary ? 'rgba(255,255,255,0.2)' : color + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
      }}
    >
      <Ionicons name={icon} size={24} color={isPrimary ? '#FFFFFF' : color} />
    </View>
    <Typography
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: isPrimary ? '#FFFFFF' : theme.colors.primary,
      }}
    >
      {label}
    </Typography>
  </TouchableOpacity>
);

export const TryOnResultScreen = ({ navigation }: any) => {
  const { currentSession, clearSession } = useTryOnStore();
  const { addToHistory } = useTryOnHistoryStore();
  const [isSaved, setIsSaved] = useState(false);

  // Animations
  const confettiOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    confettiOpacity.value = withSequence(
      withTiming(1, { duration: 500 }),
      withDelay(2000, withTiming(0, { duration: 500 }))
    );
    badgeScale.value = withDelay(300, withSpring(1, { damping: 10 }));
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handleShare = async () => {
    if (!currentSession?.resultImageUri) return;
    const success = await shareTryOnResult(
      currentSession.resultImageUri,
      currentSession.outfit?.occasion || 'Outfit'
    );
    if (success) {
      // Track share in history if needed
    }
  };

  const handleSave = async () => {
    if (!currentSession?.resultImageUri) return;

    // Save to try-on history
    if (currentSession.resultImageUri && currentSession.items) {
      addToHistory({
        sessionId: currentSession.id,
        outfitId: currentSession.outfit?.id,
        resultImageUri: currentSession.resultImageUri,
        previewImageUri: currentSession.userPhotoUri || currentSession.avatarUrl || undefined,
        items: currentSession.items,
      });
    }

    // Also save to device gallery
    await saveImageToDevice(currentSession.resultImageUri);

    setIsSaved(true);
    Alert.alert('Saved!', 'Try-on saved to your history and gallery.');
  };

  const handleTryAnother = () => {
    clearSession();
    navigation.replace('VirtualTryOn');
  };

  const handleDone = () => {
    clearSession();
    // Navigate back to the main tabs (OutfitsStack tab)
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  if (!currentSession || currentSession.status !== 'complete') {
    return (
      <Screen className="bg-background justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textSecondary} />
        <Typography className="text-gray-500 text-center mt-4">
          No try-on result available
        </Typography>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          className="mt-4"
        />
      </Screen>
    );
  }

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 24,
            paddingTop: 60,
          }}
        >
          <TouchableOpacity
            onPress={handleDone}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Animated.View style={badgeStyle}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.success + '20',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.success}
                style={{ marginRight: 6 }}
              />
              <Typography style={{ color: theme.colors.success, fontSize: 14, fontWeight: '600' }}>
                Try-On Complete
              </Typography>
            </View>
          </Animated.View>

          <TouchableOpacity
            onPress={handleShare}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Result Image */}
        <Animated.View entering={ZoomIn.duration(600)} style={{ paddingHorizontal: 24 }}>
          <ComparisonView
            beforeUri={currentSession.userPhotoUri ?? ''}
            afterUri={currentSession.resultImageUri ?? currentSession.userPhotoUri ?? ''}
          />
        </Animated.View>

        {/* Outfit Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={{ padding: 24 }}>
          <Typography
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: theme.colors.primary,
              marginBottom: 8,
            }}
          >
            {currentSession.outfit?.occasion || 'Your Try-On'}
          </Typography>
          <Typography style={{ color: theme.colors.textSecondary, marginBottom: 20 }}>
            {currentSession.items.length} pieces • AI-fitted to your body
          </Typography>

          {/* Items Used */}
          <Typography
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.colors.textSecondary,
              marginBottom: 12,
            }}
          >
            ITEMS IN THIS LOOK
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {currentSession.items.map((item, index) => (
              <View
                key={item.id}
                style={{
                  marginRight: 12,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: theme.colors.border,
                    marginBottom: 8,
                  }}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
                <Typography
                  style={{
                    fontSize: 12,
                    color: theme.colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {item.category}
                </Typography>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Actions */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(600)}
          style={{ paddingHorizontal: 24 }}
        >
          <Typography
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.colors.textSecondary,
              marginBottom: 12,
            }}
          >
            ACTIONS
          </Typography>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ActionButton
              icon="heart"
              label="Save"
              onPress={handleSave}
              color={isSaved ? theme.colors.success : '#EC4899'}
              isPrimary={false}
            />
            <ActionButton
              icon="share-social"
              label="Share"
              onPress={handleShare}
              color={theme.colors.accent}
              isPrimary={false}
            />
            <ActionButton
              icon="refresh"
              label="Try Another"
              onPress={handleTryAnother}
              color={theme.colors.warning}
              isPrimary={false}
            />
          </View>
        </Animated.View>

        {/* Feedback Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(800)} style={{ padding: 24 }}>
          <Card style={{ backgroundColor: theme.colors.primary + '08', borderWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.colors.secondary + '30',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}
              >
                <Ionicons name="flash" size={24} color={theme.colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Typography
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: theme.colors.primary,
                    marginBottom: 4,
                  }}
                >
                  How did we do?
                </Typography>
                <Typography style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  Your feedback helps improve our AI
                </Typography>
              </View>
            </View>
            <View
              style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 }}
            >
              {['😍', '😊', '😐', '😕'].map((emoji, i) => (
                <TouchableOpacity
                  key={i}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: theme.colors.surface,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography style={{ fontSize: 24 }}>{emoji}</Typography>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <LinearGradient
        colors={['transparent', theme.colors.background]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 40,
        }}
      >
        <Animated.View entering={FadeInDown.duration(500).delay(1000)}>
          <TouchableOpacity
            onPress={handleDone}
            activeOpacity={0.9}
            style={{
              height: 56,
              borderRadius: 28,
              overflow: 'hidden',
              shadowColor: theme.colors.secondary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <LinearGradient
              colors={[theme.colors.secondary, '#E8D89A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flex: 1,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Typography
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: theme.colors.primary,
                  marginRight: 8,
                }}
              >
                Wear This Outfit
              </Typography>
              <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </Screen>
  );
};
