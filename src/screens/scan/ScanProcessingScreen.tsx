import React, { useEffect, useRef, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { Screen, Typography, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useScanStore } from '../../store/useScanStore';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadClothingItemPhoto } from '../../services/imageUpload';
import { createClothingItem } from '../../services/wardrobeRepository';
import { functionsClient } from '../../services/functionsClient';
import { isSupabaseConfigured } from '../../services/supabase';

const PROCESSING_STEPS = [
  'Uploading image...',
  'Creating wardrobe entry...',
  'Analyzing with AI...',
  'Extracting tags...',
  'Almost done...',
];

type RouteProps = { imageUri?: string };

export const ScanProcessingScreen = ({ navigation, route }: any) => {
  const params: RouteProps = route?.params ?? {};
  const { queue, updateScannedItem } = useScanStore();
  const user = useAuthStore((s) => s.user);
  const hasRun = useRef(false);
  const [stepLabel, setStepLabel] = useState(PROCESSING_STEPS[0]);

  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false);
    scale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true
    );
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(scale);
      cancelAnimation(progress);
    };
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runPipeline();
  }, []);

  const setProgress = (pct: number, stepIndex: number) => {
    progress.value = withTiming(pct, { duration: 400 });
    setStepLabel(PROCESSING_STEPS[stepIndex] ?? PROCESSING_STEPS[0]);
  };

  const pickImageUri = (): { localUri: string; queueId?: string } | null => {
    if (params.imageUri) return { localUri: params.imageUri };
    const next = queue.find((q) => q.status === 'pending' || q.status === 'processing');
    if (next) return { localUri: next.localUri, queueId: next.id };
    if (queue.length > 0) return { localUri: queue[0].localUri, queueId: queue[0].id };
    return null;
  };

  const runPipeline = async () => {
    try {
      const target = pickImageUri();
      if (!target) {
        navigation.replace('ScanFailure', { error: 'No image to process.' });
        return;
      }

      // Fallback mock mode when backend isn't reachable: keep the old UX.
      if (!isSupabaseConfigured() || !user?.id) {
        setProgress(30, 2);
        await wait(600);
        setProgress(80, 3);
        await wait(600);
        setProgress(100, 4);
        await wait(300);
        navigation.replace('TagReview', { imageUri: target.localUri });
        return;
      }

      if (target.queueId) updateScannedItem(target.queueId, { status: 'processing' });

      setProgress(15, 0);
      const filename = `scan-${Date.now()}.jpg`;
      const upload = await uploadClothingItemPhoto(user.id, target.localUri, filename);

      setProgress(40, 1);
      const row = await createClothingItem({
        image_path: upload.path,
        status: 'active',
      });
      if (!row) throw new Error('Failed to create wardrobe entry.');

      setProgress(60, 2);
      const tagResult = await functionsClient.tagItem({ item_id: row.id });

      setProgress(95, 3);
      if (target.queueId) updateScannedItem(target.queueId, { status: 'success' });
      setProgress(100, 4);
      await wait(200);
      navigation.replace('TagReview', {
        itemId: row.id,
        imageUri: upload.publicUrl ?? target.localUri,
        aiConfidence: tagResult.tags.confidence,
        aiCategory: tagResult.tags.category,
      });
    } catch (err) {
      if (__DEV__) console.error('[ScanProcessing]', err);
      const message = err instanceof Error ? err.message : 'Unable to process image.';
      navigation.replace('ScanFailure', { error: message });
    }
  };

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <Screen className="bg-background">
      <LinearGradient
        colors={[theme.colors.primary, '#2A2D31']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <StyledView style={{ alignItems: 'center', width: '100%' }}>
          <StyledView
            style={{
              position: 'relative',
              width: 200,
              height: 200,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 48,
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 3,
                  borderColor: theme.colors.secondary,
                  borderTopColor: 'transparent',
                },
                animatedRingStyle,
              ]}
            />
            <Animated.View style={animatedPulseStyle}>
              <LinearGradient
                colors={[theme.colors.secondary, '#E8D89A']}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography
                  className="text-4xl"
                  style={{ color: theme.colors.primary, fontWeight: '700' }}
                >
                  AI
                </Typography>
              </LinearGradient>
            </Animated.View>
          </StyledView>

          <Typography
            variant="header"
            className="text-2xl text-secondary mb-8 text-center"
            style={{ fontWeight: '700', minHeight: 60 }}
          >
            {stepLabel}
          </Typography>

          <StyledView
            style={{
              width: '100%',
              height: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            <Animated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 4,
                },
                progressStyle,
              ]}
            />
          </StyledView>

          <Typography className="text-gray-400 text-center text-sm">
            This may take a few seconds...
          </Typography>
        </StyledView>
      </LinearGradient>
    </Screen>
  );
};

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
