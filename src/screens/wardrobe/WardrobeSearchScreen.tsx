import React, { useState, useEffect, useMemo } from 'react';
import { FlatList, TouchableOpacity, TextInput, View, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { searchItems, getFilterOptions, SearchFilters } from '../../services/searchService';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export const WardrobeSearchScreen = ({ navigation }: any) => {
  const { items } = useWardrobeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const filterOptions = useMemo(() => getFilterOptions(items), [items]);

  // Search items
  const searchResults = useMemo(() => {
    return searchItems(items, {
      ...filters,
      query: searchQuery,
    });
  }, [items, searchQuery, filters]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const renderItem = ({ item, index }: any) => (
    <TouchableOpacity
      onPress={() =>
        navigation.getParent()?.getParent()?.navigate('ItemDetails', { itemId: item.id })
      }
      activeOpacity={0.9}
      style={{
        width: CARD_WIDTH,
        marginBottom: 16,
        marginTop: index % 2 === 1 ? 16 : 0,
      }}
    >
      <View
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={{
            width: '100%',
            height: CARD_WIDTH * 1.2,
            backgroundColor: theme.colors.background,
          }}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 12,
            paddingTop: 32,
          }}
        >
          <Typography
            style={{
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 14,
            }}
            numberOfLines={1}
          >
            {item.category}
          </Typography>
          {item.brand && (
            <Typography
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
              }}
              numberOfLines={1}
            >
              {item.brand}
            </Typography>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen className="bg-background">
      {/* Header */}
      <StyledView style={{ padding: 24, paddingTop: 60 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-3xl text-primary">
            Search
          </Typography>
        </StyledView>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
            style={{ marginRight: 12 }}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by brand, color, tags..."
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.colors.text,
            }}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle */}
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name="filter"
              size={20}
              color={theme.colors.primary}
              style={{ marginRight: 8 }}
            />
            <Typography className="text-primary font-semibold">Filters</Typography>
            {Object.keys(filters).length > 0 && (
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: theme.colors.accent,
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Typography style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>
                  {Object.keys(filters).length}
                </Typography>
              </View>
            )}
          </StyledView>
          <Ionicons
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4 mb-4">
            {/* Category */}
            <Typography className="text-sm font-semibold text-gray-500 mb-2">Category</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {filterOptions.categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() =>
                    updateFilter('category', filters.category === cat ? undefined : cat)
                  }
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor:
                      filters.category === cat ? theme.colors.primary : theme.colors.background,
                  }}
                >
                  <Typography
                    style={{
                      color: filters.category === cat ? '#FFF' : theme.colors.text,
                      fontSize: 12,
                      fontWeight: filters.category === cat ? '600' : '400',
                    }}
                  >
                    {cat}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>

            {/* Brand */}
            {filterOptions.brands.length > 0 && (
              <>
                <Typography className="text-sm font-semibold text-gray-500 mb-2">Brand</Typography>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {filterOptions.brands.slice(0, 10).map((brand) => (
                    <TouchableOpacity
                      key={brand}
                      onPress={() =>
                        updateFilter('brand', filters.brand === brand ? undefined : brand)
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor:
                          filters.brand === brand ? theme.colors.primary : theme.colors.background,
                      }}
                    >
                      <Typography
                        style={{
                          color: filters.brand === brand ? '#FFF' : theme.colors.text,
                          fontSize: 12,
                          fontWeight: filters.brand === brand ? '600' : '400',
                        }}
                      >
                        {brand}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Clear Filters */}
            {Object.keys(filters).length > 0 && (
              <TouchableOpacity
                onPress={clearFilters}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.background,
                  alignItems: 'center',
                  marginTop: 8,
                }}
              >
                <Typography className="text-primary font-semibold">Clear All Filters</Typography>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Results Count */}
        <Typography className="text-gray-500 text-sm mb-4">
          {searchResults.length} {searchResults.length === 1 ? 'item' : 'items'} found
        </Typography>
      </StyledView>

      {/* Results Grid */}
      <FlatList
        data={searchResults}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <StyledView className="flex-1 items-center justify-center py-20">
            <Ionicons
              name="search-outline"
              size={48}
              color={theme.colors.textSecondary}
              style={{ opacity: 0.5, marginBottom: 12 }}
            />
            <Typography className="text-textSecondary text-center">
              {searchQuery || Object.keys(filters).length > 0
                ? 'No items found matching your search'
                : 'Start typing to search your wardrobe'}
            </Typography>
          </StyledView>
        }
      />
    </Screen>
  );
};
