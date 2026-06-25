import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, FlatList, Dimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { getAllSmartCollections, SmartCollection } from '../../services/collectionsService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const CollectionTypeIcon: Record<string, string> = {
  occasion: 'calendar',
  season: 'sunny',
  color: 'color-palette',
  brand: 'logo',
};

export const CollectionsScreen = ({ navigation }: any) => {
  const { items } = useWardrobeStore();
  const [collections, setCollections] = useState<SmartCollection[]>([]);
  const [selectedType, setSelectedType] = useState<
    'all' | 'occasion' | 'season' | 'color' | 'brand'
  >('all');

  useEffect(() => {
    const allCollections = getAllSmartCollections(items);
    setCollections(allCollections);
  }, [items]);

  const filteredCollections =
    selectedType === 'all' ? collections : collections.filter((c) => c.type === selectedType);

  const renderCollection = ({ item: collection }: { item: SmartCollection }) => (
    <Card
      className="p-0 mb-4 overflow-hidden"
      onPress={() => navigation.navigate('CollectionDetail', { collectionId: collection.id })}
    >
      <LinearGradient
        colors={[theme.colors.primary, '#2A2D31']}
        style={{ padding: 20, paddingBottom: 16 }}
      >
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: theme.colors.secondary + '30',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons
              name={(CollectionTypeIcon[collection.type] as any) || 'folder'}
              size={24}
              color={theme.colors.secondary}
            />
          </View>
          <StyledView style={{ flex: 1 }}>
            <Typography style={{ color: '#FFF', fontWeight: '700', fontSize: 18, marginBottom: 4 }}>
              {collection.name}
            </Typography>
            <Typography style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {collection.description}
            </Typography>
          </StyledView>
        </StyledView>
      </LinearGradient>

      {/* Preview Items */}
      <StyledView
        style={{ flexDirection: 'row', padding: 12, backgroundColor: theme.colors.surface }}
      >
        {collection.items.slice(0, 4).map((item, index) => (
          <View
            key={item.id}
            style={{
              width: (width - 96) / 4,
              height: (width - 96) / 4,
              borderRadius: 8,
              overflow: 'hidden',
              marginRight: index < 3 ? 8 : 0,
              backgroundColor: theme.colors.background,
            }}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
        ))}
        {collection.items.length > 4 && (
          <View
            style={{
              width: (width - 96) / 4,
              height: (width - 96) / 4,
              borderRadius: 8,
              backgroundColor: theme.colors.primary + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography className="text-primary font-semibold">
              +{collection.items.length - 4}
            </Typography>
          </View>
        )}
      </StyledView>
    </Card>
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
              Collections
            </Typography>
          </StyledView>

          {/* Type Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 24 }}
          >
            {(['all', 'occasion', 'season', 'color', 'brand'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor:
                    selectedType === type ? theme.colors.primary : theme.colors.surface,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: selectedType === type ? theme.colors.primary : theme.colors.border,
                }}
              >
                <Typography
                  style={{
                    color: selectedType === type ? '#FFF' : theme.colors.text,
                    fontWeight: selectedType === type ? '600' : '400',
                    textTransform: 'capitalize',
                  }}
                >
                  {type}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </StyledView>

        {/* Collections List */}
        {filteredCollections.length === 0 ? (
          <Card className="p-6 mx-6">
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons
                name="folder-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.5, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center">No collections found</Typography>
            </StyledView>
          </Card>
        ) : (
          <FlatList
            data={filteredCollections}
            renderItem={renderCollection}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          />
        )}
      </ScrollView>
    </Screen>
  );
};
