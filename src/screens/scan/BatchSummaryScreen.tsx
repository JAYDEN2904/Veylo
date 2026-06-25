import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, FlatList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card, Button } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '../../store/useScanStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';

const BatchItem = ({ item, index, onRemove }: any) => (
  <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
    <Card className="p-4 mb-3 border-0 shadow-sm">
      <StyledView className="flex-row items-center">
        <StyledView
          style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            backgroundColor: theme.colors.background,
            marginRight: 12,
          }}
        />
        <StyledView className="flex-1">
          <Typography className="text-primary font-semibold mb-1">
            {item.detectedTags?.[0] || 'Item'}
          </Typography>
          <Typography className="text-gray-500 text-sm">
            {item.status === 'success' ? 'Ready to save' : 'Processing...'}
          </Typography>
        </StyledView>
        {item.status === 'success' && (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
        )}
        {item.status === 'processing' && (
          <Ionicons name="hourglass" size={24} color={theme.colors.warning} />
        )}
        {onRemove && (
          <TouchableOpacity onPress={() => onRemove(item.id)} style={{ marginLeft: 12 }}>
            <Ionicons name="close-circle" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </StyledView>
    </Card>
  </Animated.View>
);

export const BatchSummaryScreen = ({ navigation }: any) => {
  const { queue, clearQueue } = useScanStore();
  const { addItem } = useWardrobeStore();
  const [isSaving, setIsSaving] = useState(false);

  const successfulItems = queue.filter((item: any) => item.status === 'success');
  const processingItems = queue.filter((item: any) => item.status === 'processing');

  const handleSaveAll = async () => {
    setIsSaving(true);
    // Simulate saving all items
    successfulItems.forEach((item: any) => {
      addItem({
        imageUrl: item.localUri,
        category: item.detectedTags?.[0] || 'Unknown',
        tags: item.detectedTags || [],
        colors: [],
        wornCount: 0,
        status: 'active',
      });
    });

    setTimeout(() => {
      setIsSaving(false);
      clearQueue();
      navigation.replace('WardrobeHome');
    }, 1500);
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
            Batch Summary
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Review and save your scanned items
          </Typography>
        </Animated.View>

        {/* Summary Stats */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Card className="p-6 mb-6 border-0 shadow-lg">
            <StyledView className="flex-row justify-around">
              <StyledView className="items-center">
                <Typography variant="header" className="text-3xl text-primary">
                  {queue.length}
                </Typography>
                <Typography className="text-gray-500 text-sm mt-1">Total</Typography>
              </StyledView>
              <StyledView className="items-center">
                <Typography variant="header" className="text-3xl text-success">
                  {successfulItems.length}
                </Typography>
                <Typography className="text-gray-500 text-sm mt-1">Ready</Typography>
              </StyledView>
              <StyledView className="items-center">
                <Typography variant="header" className="text-3xl text-warning">
                  {processingItems.length}
                </Typography>
                <Typography className="text-gray-500 text-sm mt-1">Processing</Typography>
              </StyledView>
            </StyledView>
          </Card>
        </Animated.View>

        {/* Items List */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 px-1">
            Scanned Items
          </Typography>
          {queue.length > 0 ? (
            queue.map((item: any, index: number) => (
              <BatchItem key={item.id} item={item} index={index} />
            ))
          ) : (
            <Card className="p-8 border-0 shadow-sm">
              <StyledView className="items-center">
                <Ionicons
                  name="images-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                  style={{ opacity: 0.3, marginBottom: 12 }}
                />
                <Typography className="text-gray-500 text-center">No items scanned yet</Typography>
              </StyledView>
            </Card>
          )}
        </Animated.View>

        {/* Action Buttons */}
        {successfulItems.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <StyledView style={{ marginTop: 24, gap: 12 }}>
              <Button
                title={`Save All (${successfulItems.length})`}
                onPress={handleSaveAll}
                loading={isSaving}
                className="shadow-lg shadow-indigo-500/20"
              />
              <TouchableOpacity
                onPress={() => navigation.navigate('LiveCameraScan')}
                style={{
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Typography className="text-gray-500 font-semibold">Scan More Items</Typography>
              </TouchableOpacity>
            </StyledView>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
};
