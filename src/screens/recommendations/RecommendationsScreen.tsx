import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, FlatList, View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useStyleStore } from '../../store/useStyleStore';
import {
  analyzeStyleGaps,
  generatePurchaseRecommendations,
  generateCompleteLookSuggestions,
} from '../../services/recommendationService';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import type { PurchaseRecommendation } from '../../types';

const { width: windowWidth } = Dimensions.get('window');

export const RecommendationsScreen = ({ navigation }: any) => {
  const tabPad = useTabScreenPadding();
  const { items } = useWardrobeStore();
  const { styleProfile, recordRecommendationThumb, userActions } = useStyleStore();

  const [gaps, setGaps] = useState<any[]>([]);
  const [purchaseRecs, setPurchaseRecs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'gaps' | 'purchase' | 'complete'>('gaps');
  const [showAllShop, setShowAllShop] = useState(false);

  const goRoot = (route: string, params?: object) =>
    navigation
      .getParent()
      ?.getParent()
      ?.navigate(route as never, params as never);

  useEffect(() => {
    // Analyze style gaps
    const styleGaps = analyzeStyleGaps({
      items,
      styleProfile: styleProfile || undefined,
    });
    setGaps(styleGaps);

    // Generate purchase recommendations
    const purchases = generatePurchaseRecommendations({
      items,
      styleProfile: styleProfile || undefined,
    });
    setPurchaseRecs(purchases);
  }, [items, styleProfile]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderGaps = () => (
    <StyledView>
      {gaps.length === 0 ? (
        <Card className="p-6">
          <StyledView style={{ alignItems: 'center' }}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={theme.colors.success}
              style={{ marginBottom: 12 }}
            />
            <Typography className="text-primary font-semibold mb-2 text-center">
              Your Wardrobe is Complete!
            </Typography>
            <Typography className="text-gray-500 text-center">
              No style gaps detected. Great job!
            </Typography>
          </StyledView>
        </Card>
      ) : (
        gaps.map((gap, index) => (
          <Animated.View key={gap.category} entering={FadeInDown.duration(400).delay(index * 100)}>
            <Card className="p-4 mb-4">
              <StyledView
                style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: getPriorityColor(gap.priority) + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="alert-circle" size={20} color={getPriorityColor(gap.priority)} />
                </View>
                <StyledView style={{ flex: 1 }}>
                  <Typography className="text-primary font-semibold mb-1">
                    {gap.category}
                  </Typography>
                  <Typography className="text-gray-500 text-sm mb-3">{gap.reason}</Typography>
                  {gap.reasons && gap.reasons.length > 0 && (
                    <StyledView style={{ marginBottom: 10 }}>
                      {gap.reasons.slice(0, 3).map((line: string, ri: number) => (
                        <Typography key={ri} className="text-gray-600 text-xs mb-1">
                          • {line}
                        </Typography>
                      ))}
                    </StyledView>
                  )}
                  <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {gap.suggestedItems.map((item: string, i: number) => (
                      <View
                        key={i}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: theme.colors.background,
                        }}
                      >
                        <Typography className="text-xs text-gray-600">{item}</Typography>
                      </View>
                    ))}
                  </StyledView>
                </StyledView>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: getPriorityColor(gap.priority) + '20',
                  }}
                >
                  <Typography
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: getPriorityColor(gap.priority),
                      textTransform: 'uppercase',
                    }}
                  >
                    {gap.priority}
                  </Typography>
                </View>
              </StyledView>
            </Card>
          </Animated.View>
        ))
      )}
    </StyledView>
  );

  const visiblePurchaseRecs: PurchaseRecommendation[] = showAllShop
    ? purchaseRecs
    : purchaseRecs.slice(0, 5);

  const renderPurchaseRecommendations = () => (
    <StyledView>
      {purchaseRecs.length === 0 ? (
        <Card className="p-6">
          <StyledView style={{ alignItems: 'center' }}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={theme.colors.success}
              style={{ marginBottom: 12 }}
            />
            <Typography className="text-primary font-semibold mb-2 text-center">
              No purchase picks right now
            </Typography>
            <Typography className="text-gray-500 text-center">
              Your wardrobe looks complete!
            </Typography>
          </StyledView>
        </Card>
      ) : (
        <>
          {visiblePurchaseRecs.map((rec: PurchaseRecommendation, index: number) => {
            const thumb = userActions.recommendationThumbs[rec.id];
            const overall = rec.scoreBreakdown?.overall ?? rec.styleMatchScore;
            return (
              <Animated.View key={rec.id} entering={FadeInDown.duration(400).delay(index * 100)}>
                <Card className="p-4 mb-4">
                  <StyledView style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: theme.colors.accent + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={'bag-handle-outline' as never}
                        size={24}
                        color={theme.colors.accent}
                      />
                    </View>
                    <StyledView style={{ flex: 1 }}>
                      <Typography className="text-primary font-semibold mb-1">
                        {rec.itemDescription}
                      </Typography>
                      <Typography className="text-gray-500 text-sm mb-2">{rec.reason}</Typography>
                      {rec.reasons && rec.reasons.length > 1 && (
                        <Typography className="text-gray-600 text-xs mb-2" numberOfLines={3}>
                          {rec.reasons.slice(1, 4).join(' · ')}
                        </Typography>
                      )}
                      <StyledView
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                            backgroundColor: theme.colors.secondary + '20',
                          }}
                        >
                          <Typography className="text-xs font-semibold text-primary">
                            {overall} overall · {rec.styleMatchScore}% style fit
                          </Typography>
                        </View>
                        {rec.estimatedPrice && (
                          <Typography className="text-xs text-gray-500">
                            ~{rec.estimatedPrice}
                          </Typography>
                        )}
                      </StyledView>
                      <StyledView style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
                        <TouchableOpacity
                          onPress={() => recordRecommendationThumb(rec.id, 'up')}
                          accessibilityLabel="Helpful recommendation"
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <Ionicons
                            name={thumb === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
                            size={20}
                            color={
                              thumb === 'up' ? theme.colors.accent : theme.colors.textSecondary
                            }
                          />
                          <Typography className="text-xs text-gray-600">Helpful</Typography>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => recordRecommendationThumb(rec.id, 'down')}
                          accessibilityLabel="Not helpful"
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <Ionicons
                            name={thumb === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
                            size={20}
                            color={
                              thumb === 'down' ? theme.colors.error : theme.colors.textSecondary
                            }
                          />
                          <Typography className="text-xs text-gray-600">Not for me</Typography>
                        </TouchableOpacity>
                      </StyledView>
                    </StyledView>
                  </StyledView>
                </Card>
              </Animated.View>
            );
          })}
          {purchaseRecs.length > 5 && (
            <TouchableOpacity
              onPress={() => setShowAllShop(!showAllShop)}
              style={{ alignItems: 'center', paddingVertical: 8 }}
            >
              <Typography style={{ color: theme.colors.accent, fontWeight: '600' }}>
                {showAllShop ? 'Show fewer' : 'See all suggestions'}
              </Typography>
            </TouchableOpacity>
          )}
        </>
      )}
    </StyledView>
  );

  const renderCompleteLook = () => {
    // Get complete look suggestions for first few items
    const suggestions: any[] = [];
    items.slice(0, 3).forEach((item) => {
      const looks = generateCompleteLookSuggestions(item, items);
      suggestions.push(...looks.slice(0, 1));
    });

    return (
      <StyledView>
        {suggestions.length === 0 ? (
          <Card className="p-6">
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons
                name="shirt-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.5, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center">
                Add more items to get complete-the-look suggestions
              </Typography>
            </StyledView>
          </Card>
        ) : (
          suggestions.map((suggestion, index) => (
            <Animated.View key={index} entering={FadeInDown.duration(400).delay(index * 100)}>
              <Card className="p-4 mb-4">
                <Typography className="text-primary font-semibold mb-3">
                  Complete the Look
                </Typography>
                <Typography className="text-gray-500 text-sm mb-4">{suggestion.reason}</Typography>
                <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[suggestion.baseItem, ...suggestion.suggestedItems.slice(0, 2)].map(
                    (item: any, i: number) => (
                      <TouchableOpacity
                        key={item.id || i}
                        onPress={() => goRoot('ItemDetails', { itemId: item.id })}
                        style={{
                          width: (windowWidth - 88) / 3,
                          height: (windowWidth - 88) / 3,
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: theme.colors.background,
                        }}
                      >
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    )
                  )}
                </StyledView>
              </Card>
            </Animated.View>
          ))
        )}
      </StyledView>
    );
  };

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: tabPad.paddingHorizontal,
          paddingTop: tabPad.paddingTop,
          paddingBottom: tabPad.paddingBottom,
        }}
      >
        {/* Header */}
        <StyledView style={{ paddingBottom: 8 }}>
          <Typography variant="header" className="text-4xl text-primary mb-2">
            Shopping & gaps
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Fix wardrobe gaps, explore pairings, and review purchase ideas
          </Typography>

          {/* Tabs */}
          <StyledView style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => setActiveTab('gaps')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: activeTab === 'gaps' ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: activeTab === 'gaps' ? theme.colors.primary : theme.colors.border,
                alignItems: 'center',
              }}
            >
              <Typography
                style={{
                  color: activeTab === 'gaps' ? '#FFF' : theme.colors.text,
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                Style Gaps
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('purchase')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor:
                  activeTab === 'purchase' ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: activeTab === 'purchase' ? theme.colors.primary : theme.colors.border,
                alignItems: 'center',
              }}
            >
              <Typography
                style={{
                  color: activeTab === 'purchase' ? '#FFF' : theme.colors.text,
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                Shop
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('complete')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor:
                  activeTab === 'complete' ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: activeTab === 'complete' ? theme.colors.primary : theme.colors.border,
                alignItems: 'center',
              }}
            >
              <Typography
                style={{
                  color: activeTab === 'complete' ? '#FFF' : theme.colors.text,
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                Complete Look
              </Typography>
            </TouchableOpacity>
          </StyledView>

          {/* Content */}
          {activeTab === 'gaps' && renderGaps()}
          {activeTab === 'purchase' && renderPurchaseRecommendations()}
          {activeTab === 'complete' && renderCompleteLook()}
        </StyledView>
      </ScrollView>
    </Screen>
  );
};
