import React, { useEffect } from 'react';
import { ScrollView, TouchableOpacity, FlatList } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '../../store/useScanStore';

const QueueItem = ({ item, index }: any) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (item.status === 'processing') {
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
    }
  }, [item.status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
      <Card className="p-4 mb-3 border-0 shadow-sm">
        <StyledView className="flex-row items-center">
          <StyledView
            style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              backgroundColor: theme.colors.background,
              marginRight: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {item.status === 'processing' ? (
              <Animated.View style={animatedStyle}>
                <Ionicons name="sync" size={24} color={theme.colors.accent} />
              </Animated.View>
            ) : item.status === 'success' ? (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            ) : (
              <Ionicons name="time-outline" size={24} color={theme.colors.textSecondary} />
            )}
          </StyledView>
          <StyledView className="flex-1">
            <Typography className="text-primary font-semibold mb-1">
              {item.status === 'processing'
                ? 'Processing...'
                : item.status === 'success'
                  ? 'Ready'
                  : 'Pending'}
            </Typography>
            <Typography className="text-gray-500 text-sm">
              {item.detectedTags?.join(', ') || 'Waiting for analysis'}
            </Typography>
          </StyledView>
          {item.confidence && (
            <StyledView className="items-end">
              <Typography className="text-accent font-bold text-sm">
                {Math.round(item.confidence * 100)}%
              </Typography>
              <Typography className="text-gray-400 text-xs">confidence</Typography>
            </StyledView>
          )}
        </StyledView>
      </Card>
    </Animated.View>
  );
};

export const BatchScanQueueScreen = ({ navigation }: any) => {
  const { queue, processQueue, isProcessing } = useScanStore();

  useEffect(() => {
    if (queue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [queue.length]);

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
            Processing Queue
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            {queue.length} {queue.length === 1 ? 'item' : 'items'} in queue
          </Typography>
        </Animated.View>

        {/* Queue List */}
        {queue.length > 0 ? (
          queue.map((item: any, index: number) => (
            <QueueItem key={item.id} item={item} index={index} />
          ))
        ) : (
          <Card className="p-8 border-0 shadow-sm">
            <StyledView className="items-center">
              <Ionicons
                name="checkmark-done-circle-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.3, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center mb-2">Queue is empty</Typography>
              <Typography className="text-gray-400 text-center text-sm">
                All items have been processed
              </Typography>
            </StyledView>
          </Card>
        )}

        {/* Action Button */}
        {queue.length > 0 && queue.every((item: any) => item.status === 'success') && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <TouchableOpacity
              onPress={() => navigation.navigate('BatchSummary')}
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 16,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
              }}
            >
              <Typography className="text-white font-semibold text-lg">Review All Items</Typography>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
};
