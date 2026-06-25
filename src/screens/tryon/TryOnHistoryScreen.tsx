import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, FlatList, Dimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTryOnHistoryStore } from '../../store/useTryOnHistoryStore';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export const TryOnHistoryScreen = ({ navigation }: any) => {
  const { history, deleteHistoryItem, fetchHistory } = useTryOnHistoryStore();
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const renderHistoryItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
      <Card className="p-0 mb-4 overflow-hidden">
        <TouchableOpacity
          onPress={() => setSelectedHistory(selectedHistory === item.id ? null : item.id)}
          activeOpacity={0.9}
        >
          {/* Image */}
          <Image
            source={{ uri: item.resultImageUri }}
            style={{
              width: '100%',
              height: CARD_WIDTH * 1.2,
              backgroundColor: theme.colors.background,
            }}
            contentFit="cover"
          />

          {/* Overlay gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingTop: 40,
            }}
          >
            <Typography style={{ color: '#FFF', fontWeight: '700', fontSize: 18, marginBottom: 8 }}>
              {format(new Date(item.createdAt), 'MMM d, yyyy • h:mm a')}
            </Typography>
            <Typography style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              {item.items.length} pieces
            </Typography>
          </LinearGradient>

          {/* Rating */}
          {item.rating && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: theme.colors.accent + 'DD',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="star"
                size={16}
                color={theme.colors.primary}
                style={{ marginRight: 4 }}
              />
              <Typography style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>
                {item.rating}/5
              </Typography>
            </View>
          )}
        </TouchableOpacity>

        {/* Expanded details */}
        {selectedHistory === item.id && (
          <StyledView style={{ padding: 20, backgroundColor: theme.colors.surface }}>
            {/* Items preview */}
            <Typography className="text-sm font-semibold text-gray-500 mb-3">ITEMS</Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {item.items.map((itemData: any, idx: number) => (
                <View
                  key={itemData.id || idx}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.background,
                    marginRight: 8,
                  }}
                >
                  <Image
                    source={{ uri: itemData.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              ))}
            </ScrollView>

            {/* Actions */}
            <StyledView style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  // Navigate to outfit if available
                  if (item.outfitId) {
                    navigation.navigate('OutfitResult', { outfitId: item.outfitId });
                  }
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  alignItems: 'center',
                }}
              >
                <Typography style={{ color: '#FFF', fontWeight: '600' }}>View Outfit</Typography>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteHistoryItem(item.id)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.error + '20',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="trash" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </StyledView>
          </StyledView>
        )}
      </Card>
    </Animated.View>
  );

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <StyledView style={{ padding: 24, paddingTop: 60 }}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Typography variant="header" className="text-3xl text-primary">
              Try-On History
            </Typography>
          </StyledView>
        </StyledView>

        {/* History List */}
        {history.length === 0 ? (
          <Card className="p-6 mx-6">
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons
                name="images-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.5, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center">No try-on history yet</Typography>
              <Typography className="text-gray-400 text-center text-sm mt-2">
                Your virtual try-on results will appear here
              </Typography>
            </StyledView>
          </Card>
        ) : (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          />
        )}
      </ScrollView>
    </Screen>
  );
};
