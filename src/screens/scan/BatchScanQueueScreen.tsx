import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Typography, Button, StyledView } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { uploadClothingItemPhoto } from '../../services/imageUpload';
import { createClothingItem, signedUrlForItemPath } from '../../services/wardrobeRepository';
import { functionsClient } from '../../services/functionsClient';
import { enqueueScanQueue } from '../../services/scanQueueService';
import { isSupabaseConfigured } from '../../services/supabase';
import {
  batchProgress,
  createBatchItems,
  processBatchItem,
  shouldProcessBatchItem,
  type LocalBatchItem,
} from '../../services/batchScanProcessor';
import { navigateToScanCapture, navigateToWardrobe } from '../../navigation/screenProps';

export const BatchScanQueueScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const uris: string[] = route?.params?.uris ?? [];
  const [items, setItems] = useState<LocalBatchItem[]>(() => createBatchItems(uris));
  const [processing, setProcessing] = useState(false);
  const cancelledRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (uris.length === 0) {
      navigation.goBack();
    }
  }, [navigation, uris.length]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ gestureEnabled: !processing });
    }, [navigation, processing])
  );

  const updateItem = (clientId: string, patch: LocalBatchItem) => {
    setItems((prev) => prev.map((item) => (item.clientId === clientId ? patch : item)));
  };

  const processQueue = async () => {
    if (!isSupabaseConfigured() || !user?.id) {
      Alert.alert('Sign in required', 'Connect your Veylo account to batch-scan items.');
      return;
    }

    cancelledRef.current = false;
    setProcessing(true);
    try {
      const snapshot = itemsRef.current;
      for (const current of snapshot) {
        if (cancelledRef.current) break;
        if (!shouldProcessBatchItem(current)) continue;

        updateItem(current.clientId, { ...current, status: 'uploading', error: undefined });
        const result = await processBatchItem(current, {
          userId: user.id,
          isCancelled: () => cancelledRef.current,
          upload: uploadClothingItemPhoto,
          enqueue: enqueueScanQueue,
          createItem: createClothingItem,
          tagItem: (input) => functionsClient.tagItem(input),
        });
        updateItem(current.clientId, result);
      }

      try {
        await useWardrobeStore.getState().fetchItems();
      } catch (err) {
        if (__DEV__) console.warn('[BatchScanQueue] wardrobe refresh', err);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (processing) {
      Alert.alert('Stop batch scan?', 'Items already tagged will stay in your closet.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            cancelledRef.current = true;
            navigation.goBack();
          },
        },
      ]);
      return;
    }
    navigation.goBack();
  };

  const progress = batchProgress(items);
  const allDone = items.length > 0 && progress.doneCount === items.length;
  const hasFailures = progress.failedCount > 0;
  const remaining = items.filter(shouldProcessBatchItem).length;

  const primaryTitle = processing
    ? 'Processing…'
    : allDone
      ? 'View closet'
      : hasFailures
        ? `Retry ${progress.failedCount} failed`
        : `Process ${items.length} photo${items.length === 1 ? '' : 's'}`;

  const handlePrimary = () => {
    if (allDone) {
      navigateToWardrobe(navigation);
      return;
    }
    void processQueue();
  };

  return (
    <Screen style={{ backgroundColor: currentTheme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close batch scan"
            style={{ marginRight: 12, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography
            variant="header"
            style={{ fontSize: 24, color: currentTheme.colors.text, fontWeight: '700' }}
          >
            Batch scan
          </Typography>
        </StyledView>

        <Typography style={{ color: currentTheme.colors.textSecondary, marginBottom: 8 }}>
          {progress.doneCount} of {progress.total} tagged
          {hasFailures ? ` · ${progress.failedCount} failed` : ''}
        </Typography>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: currentTheme.colors.mutedSurface,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <View
            style={{
              width: `${progress.total === 0 ? 0 : (progress.doneCount / progress.total) * 100}%`,
              height: '100%',
              backgroundColor: currentTheme.colors.secondary,
            }}
          />
        </View>

        {items.map((item, index) => (
          <BatchRow key={item.clientId} item={item} index={index} />
        ))}

        <Button
          title={primaryTitle}
          onPress={handlePrimary}
          loading={processing}
          disabled={processing || items.length === 0 || (remaining === 0 && !allDone)}
          style={{ marginTop: 24 }}
        />
        {allDone ? (
          <Button
            title="Scan more"
            variant="outline"
            onPress={() => navigateToScanCapture(navigation)}
            style={{ marginTop: 12 }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
};

function BatchRow({ item, index }: { item: LocalBatchItem; index: number }) {
  const { currentTheme } = useThemeStore();
  const [thumb, setThumb] = useState(item.localUri);

  useEffect(() => {
    if (item.imagePath && isSupabaseConfigured()) {
      signedUrlForItemPath(item.imagePath)
        .then((url) => {
          if (url) setThumb(url);
        })
        .catch((err) => {
          if (__DEV__) console.warn('[BatchRow] thumb', err);
        });
    }
  }, [item.imagePath]);

  const statusLabel =
    item.status === 'uploading'
      ? 'Uploading…'
      : item.status === 'processing'
        ? 'Tagging…'
        : item.status === 'done'
          ? 'Saved'
          : item.status === 'failed'
            ? 'Failed'
            : 'Waiting';

  return (
    <StyledView
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 10,
        borderRadius: 12,
        backgroundColor: currentTheme.colors.surface,
        borderWidth: 1,
        borderColor:
          item.status === 'failed' ? currentTheme.colors.error : currentTheme.colors.border,
      }}
    >
      <Image source={{ uri: thumb }} style={{ width: 56, height: 56, borderRadius: 8 }} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Typography style={{ fontWeight: '600', color: currentTheme.colors.text }}>
          Item {index + 1}
        </Typography>
        <Typography style={{ fontSize: 13, color: currentTheme.colors.textSecondary }}>
          {statusLabel}
        </Typography>
        {item.error ? (
          <Typography style={{ fontSize: 12, color: currentTheme.colors.error, marginTop: 4 }}>
            {item.error}
          </Typography>
        ) : null}
      </View>
      {item.status === 'processing' || item.status === 'uploading' ? (
        <ActivityIndicator color={currentTheme.colors.primary} />
      ) : item.status === 'done' ? (
        <Ionicons name="checkmark-circle" size={22} color={currentTheme.colors.success} />
      ) : item.status === 'failed' ? (
        <Ionicons name="alert-circle" size={22} color={currentTheme.colors.error} />
      ) : null}
    </StyledView>
  );
}
