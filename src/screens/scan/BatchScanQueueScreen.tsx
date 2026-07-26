import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Screen, Typography, Button, StyledView } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadClothingItemPhoto } from '../../services/imageUpload';
import { createClothingItem } from '../../services/wardrobeRepository';
import { functionsClient } from '../../services/functionsClient';
import {
  enqueueScanQueue,
  fetchScanQueue,
  type ScanQueueRow,
} from '../../services/scanQueueService';
import { isSupabaseConfigured } from '../../services/supabase';
import { signedUrlForItemPath } from '../../services/wardrobeRepository';

interface LocalBatchItem {
  localUri: string;
  queueId?: string;
  imagePath?: string;
  itemId?: string;
  status: ScanQueueRow['status'] | 'uploading';
  error?: string;
}

export const BatchScanQueueScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const uris: string[] = route?.params?.uris ?? [];
  const [items, setItems] = useState<LocalBatchItem[]>(
    uris.map((uri) => ({ localUri: uri, status: 'pending' as const }))
  );
  const [processing, setProcessing] = useState(false);

  const refreshRemote = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const rows = await fetchScanQueue();
      setItems((prev) =>
        prev.map((item) => {
          const match = rows.find((r) => r.id === item.queueId);
          if (!match) return item;
          return {
            ...item,
            status: match.status,
            error: match.error ?? undefined,
          };
        })
      );
    } catch (err) {
      if (__DEV__) console.warn('[BatchScanQueue] refresh', err);
    }
  }, []);

  useEffect(() => {
    void refreshRemote();
  }, [refreshRemote]);

  const processAll = async () => {
    if (!isSupabaseConfigured() || !user?.id) {
      Alert.alert('Offline mode', 'Sign in with Supabase configured to run batch scans.');
      return;
    }
    setProcessing(true);
    try {
      for (let i = 0; i < items.length; i++) {
        const current = items[i];
        if (current.status === 'done') continue;

        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'uploading' } : it))
        );

        const filename = `batch-${Date.now()}-${i}.jpg`;
        const upload = await uploadClothingItemPhoto(user.id, current.localUri, filename);
        const queueRow = await enqueueScanQueue(upload.path);
        const row = await createClothingItem({ image_path: upload.path, status: 'active' });
        if (!row || !queueRow) throw new Error('Failed to create batch item.');

        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'processing',
                  queueId: queueRow.id,
                  imagePath: upload.path,
                  itemId: row.id,
                }
              : it
          )
        );

        await functionsClient.tagItem({
          item_id: row.id,
          scan_queue_id: queueRow.id,
        });

        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: 'done' } : it)));
      }
      await refreshRemote();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch processing failed.';
      Alert.alert('Batch scan failed', message);
    } finally {
      setProcessing(false);
    }
  };

  const allDone = items.length > 0 && items.every((i) => i.status === 'done');

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-2xl text-primary">
            Batch scan
          </Typography>
        </StyledView>

        <Typography className="text-gray-500 mb-4">
          {items.length} photo{items.length === 1 ? '' : 's'} queued for AI tagging via scan_queue.
        </Typography>

        {items.map((item, index) => (
          <BatchRow key={`${item.localUri}-${index}`} item={item} index={index} />
        ))}

        <Button
          title={processing ? 'Processing…' : allDone ? 'Done' : 'Process all'}
          onPress={allDone ? () => navigation.navigate('LiveCameraScan') : processAll}
          loading={processing}
          disabled={processing || items.length === 0}
          className="mt-6"
        />
      </ScrollView>
    </Screen>
  );
};

function BatchRow({ item, index }: { item: LocalBatchItem; index: number }) {
  const { currentTheme } = useThemeStore();
  const [thumb, setThumb] = useState(item.localUri);

  useEffect(() => {
    if (item.imagePath && isSupabaseConfigured()) {
      signedUrlForItemPath(item.imagePath).then((url) => {
        if (url) setThumb(url);
      });
    }
  }, [item.imagePath]);

  const statusLabel =
    item.status === 'uploading'
      ? 'Uploading…'
      : item.status === 'processing'
        ? 'Tagging…'
        : item.status === 'done'
          ? 'Done'
          : item.status === 'failed'
            ? 'Failed'
            : 'Pending';

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
        borderColor: currentTheme.colors.border,
      }}
    >
      <Image source={{ uri: thumb }} style={{ width: 56, height: 56, borderRadius: 8 }} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Typography className="font-semibold text-primary">Item {index + 1}</Typography>
        <Typography className="text-sm text-gray-500">{statusLabel}</Typography>
        {item.error ? (
          <Typography className="text-xs text-red-500 mt-1">{item.error}</Typography>
        ) : null}
      </View>
      {item.status === 'processing' || item.status === 'uploading' ? (
        <ActivityIndicator color={currentTheme.colors.primary} />
      ) : item.status === 'done' ? (
        <Ionicons name="checkmark-circle" size={22} color={currentTheme.colors.success} />
      ) : null}
    </StyledView>
  );
}
