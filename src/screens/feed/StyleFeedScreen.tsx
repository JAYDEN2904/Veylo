/**
 * Insights feed — closet utilization + actionable usage cards.
 *
 * No social feed, no editorial carousel, no auto outfit generation.
 * "Style this" generates a rule-based look anchored to the card item,
 * then navigates to OutfitLoading → Outfit Result.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, StyledView } from '../../components/common';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { theme } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import {
  buildClosetInsights,
  CUR_WINDOW_DAYS,
  type InsightCard,
  type ClosetUtilization,
} from '../../services/closetInsightsService';

type Props = { navigation: any };

const KIND_ICON: Record<InsightCard['kind'], keyof typeof Ionicons.glyphMap> = {
  challenge: 'trophy-outline',
  hidden_gem: 'diamond-outline',
  neglected: 'time-outline',
  rotation: 'sync-outline',
  milestone: 'ribbon-outline',
};

export const StyleFeedScreen = ({ navigation }: Props) => {
  const { items, fetchItems } = useWardrobeStore();
  const { generateOutfit } = useOutfitStore();
  const { currentTheme } = useThemeStore();
  const tabPadding = useTabScreenPadding();
  const [refreshing, setRefreshing] = useState(false);
  const [stylingCardId, setStylingCardId] = useState<string | null>(null);

  const insights = useMemo(() => buildClosetInsights(items), [items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchItems();
    } finally {
      setRefreshing(false);
    }
  }, [fetchItems]);

  const goRoot = (route: string, params?: object) => {
    navigation
      .getParent()
      ?.getParent()
      ?.navigate(route as never, params as never);
  };

  const handleStyleThis = (card: InsightCard) => {
    if (!card.anchorItemId || stylingCardId) return;
    setStylingCardId(card.id);
    // Fire generation first (clears prior generatedOutfit + sets isGenerating), then loading UI.
    void generateOutfit({
      mustIncludeItemId: card.anchorItemId,
      occasion: 'casual',
    }).finally(() => setStylingCardId(null));
    goRoot('OutfitLoading');
  };

  const textPrimary = currentTheme.colors.text;
  const textSecondary = currentTheme.colors.textSecondary;
  const surface = currentTheme.colors.surface;
  const border = currentTheme.colors.border;

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{
          paddingTop: tabPadding.paddingTop,
          paddingBottom: tabPadding.paddingBottom,
          paddingHorizontal: tabPadding.paddingHorizontal,
        }}
      >
        <StyledView style={{ marginBottom: 20 }}>
          <Typography
            variant="header"
            style={{ color: textPrimary, fontSize: 34, fontWeight: '700' }}
          >
            Insights
          </Typography>
          <Typography style={{ color: textSecondary, marginTop: 6, fontSize: 16 }}>
            Your closet, tracked
          </Typography>
        </StyledView>

        {items.length === 0 ? (
          <EmptyWardrobeCard
            surface={surface}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onScan={() =>
              navigation.getParent()?.navigate('ScanStack', { screen: 'LiveCameraScan' })
            }
          />
        ) : (
          <>
            <UtilizationHero
              utilization={insights.utilization}
              surface={surface}
              border={border}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              onSeeAll={() => navigation.navigate('ClosetInsights')}
              onStyleChallenge={
                insights.utilization.challengeItem
                  ? () => {
                      const challenge = insights.cards.find((c) => c.kind === 'challenge');
                      if (challenge) handleStyleThis(challenge);
                    }
                  : undefined
              }
              isStyling={stylingCardId?.startsWith('challenge-') ?? false}
            />

            <Typography
              style={{
                color: textPrimary,
                fontWeight: '600',
                fontSize: 20,
                marginBottom: 12,
                marginTop: 8,
              }}
            >
              For you
            </Typography>

            {insights.cards.length === 0 ? (
              <Card className="p-5 mb-6" style={{ backgroundColor: surface }}>
                <Typography style={{ color: textSecondary, fontSize: 15, lineHeight: 22 }}>
                  Keep logging wears from Today or Outfit Result — personalized challenges will
                  appear here.
                </Typography>
              </Card>
            ) : (
              insights.cards.map((card, index) => (
                <InsightCardRow
                  key={card.id}
                  card={card}
                  index={index}
                  surface={surface}
                  border={border}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  isStyling={stylingCardId === card.id}
                  onStyleThis={() => handleStyleThis(card)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

/** @deprecated alias — screen is the Insights feed */
export const InsightsFeedScreen = StyleFeedScreen;

interface ThemeBits {
  surface: string;
  border?: string;
  textPrimary: string;
  textSecondary: string;
}

function EmptyWardrobeCard({
  surface,
  textPrimary,
  textSecondary,
  onScan,
}: ThemeBits & { onScan: () => void }) {
  return (
    <Card className="p-5 mb-6" style={{ backgroundColor: surface }}>
      <StyledView style={{ alignItems: 'center' }}>
        <Ionicons name="shirt-outline" size={40} color={textSecondary} />
        <Typography
          style={{
            color: textPrimary,
            marginTop: 12,
            textAlign: 'center',
            fontWeight: '600',
            fontSize: 17,
          }}
        >
          Scan your first pieces to start tracking usage
        </Typography>
        <Typography
          style={{
            color: textSecondary,
            marginTop: 8,
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          Closet utilization and styling challenges appear once items are in your wardrobe.
        </Typography>
        <TouchableOpacity
          onPress={onScan}
          style={{
            marginTop: 16,
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor: theme.colors.primary,
            borderRadius: 12,
          }}
        >
          <Typography style={{ color: '#FFF', fontWeight: '600' }}>Scan an item</Typography>
        </TouchableOpacity>
      </StyledView>
    </Card>
  );
}

function UtilizationHero({
  utilization,
  surface,
  border,
  textPrimary,
  textSecondary,
  onSeeAll,
  onStyleChallenge,
  isStyling,
}: ThemeBits & {
  utilization: ClosetUtilization;
  onSeeAll: () => void;
  onStyleChallenge?: () => void;
  isStyling: boolean;
}) {
  const rateLabel = utilization.ratePercent == null ? '—' : `${utilization.ratePercent}%`;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 20 }}>
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <StyledView
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <StyledView style={{ flex: 1, paddingRight: 12 }}>
            <Typography
              style={{
                color: textSecondary,
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              Closet utilization
            </Typography>
            <Typography
              style={{ color: textPrimary, fontSize: 40, fontWeight: '700', marginTop: 4 }}
            >
              {rateLabel}
            </Typography>
            <Typography
              style={{ color: textSecondary, fontSize: 14, marginTop: 4, lineHeight: 20 }}
            >
              {utilization.activeCount === 0
                ? 'Add items to measure usage'
                : `${utilization.usedCount} of ${utilization.activeCount} active pieces worn in the last ${CUR_WINDOW_DAYS} days`}
            </Typography>
          </StyledView>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.accent + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="pie-chart-outline" size={24} color={theme.colors.accent} />
          </View>
        </StyledView>

        {utilization.challengeItem &&
          utilization.nextTargetPercent != null &&
          utilization.ratePercent != null &&
          utilization.nextTargetPercent > utilization.ratePercent && (
            <Typography style={{ color: textPrimary, fontSize: 14, marginTop: 14, lineHeight: 20 }}>
              Wear one more unused piece to reach {utilization.nextTargetPercent}%.
            </Typography>
          )}

        <StyledView style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {onStyleChallenge && (
            <TouchableOpacity
              onPress={onStyleChallenge}
              disabled={isStyling}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                opacity: isStyling ? 0.6 : 1,
              }}
            >
              <Typography style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>
                {isStyling ? 'Styling…' : 'Style this'}
              </Typography>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onSeeAll}
            style={{
              flex: onStyleChallenge ? 1 : undefined,
              paddingVertical: 12,
              paddingHorizontal: onStyleChallenge ? 0 : 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
            }}
          >
            <Typography style={{ color: textPrimary, fontWeight: '600', fontSize: 15 }}>
              Full stats
            </Typography>
          </TouchableOpacity>
        </StyledView>
      </View>
    </Animated.View>
  );
}

function InsightCardRow({
  card,
  index,
  surface,
  border,
  textPrimary,
  textSecondary,
  isStyling,
  onStyleThis,
}: ThemeBits & {
  card: InsightCard;
  index: number;
  isStyling: boolean;
  onStyleThis: () => void;
}) {
  const icon = KIND_ICON[card.kind];

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 60)}
      style={{ marginBottom: 12 }}
    >
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <StyledView style={{ flexDirection: 'row', gap: 12 }}>
          {card.imageUrl ? (
            <Image
              source={{ uri: card.imageUrl }}
              style={{ width: 56, height: 72, borderRadius: 10, backgroundColor: '#F3F4F6' }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 72,
                borderRadius: 10,
                backgroundColor: theme.colors.accent + '14',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={icon} size={22} color={theme.colors.accent} />
            </View>
          )}
          <StyledView style={{ flex: 1 }}>
            <Typography
              style={{
                color: textSecondary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {card.title}
            </Typography>
            <Typography style={{ color: textPrimary, fontSize: 15, lineHeight: 21 }}>
              {card.body}
            </Typography>
          </StyledView>
        </StyledView>

        {card.showStyleCta && card.anchorItemId && (
          <TouchableOpacity
            onPress={onStyleThis}
            disabled={isStyling}
            accessibilityRole="button"
            accessibilityLabel={`Style this: ${card.title}`}
            style={{
              marginTop: 14,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              opacity: isStyling ? 0.6 : 1,
            }}
          >
            <Typography style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>
              {isStyling ? 'Styling…' : 'Style this'}
            </Typography>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
