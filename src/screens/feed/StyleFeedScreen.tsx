/**
 * Style feed (tab root) — inspiration + momentum, not duplicate shopping lists.
 *
 * Module map (vs Recommendations / "Shopping & gaps"):
 * - Feed-only: editorial carousel, outfit collage from saved outfits, generate CTA, stats row.
 * - Link to Recs: single "Shopping & gaps" teaser (no ranked purchase cards here).
 * - Recommendations screen owns: style gaps, ranked shop list, complete-the-look tooling, thumbs.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, RefreshControl, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Typography, Card, StyledView } from '../../components/common';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { theme } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import type { Outfit } from '../../types';
import { functionsClient, type FeedPost } from '../../services/functionsClient';
import { isSupabaseConfigured } from '../../services/supabase';

const { width: windowWidth } = Dimensions.get('window');

const EDITORIAL_SPOTS = [
  {
    id: 'e1',
    title: 'Spring layering',
    subtitle: 'Light jackets over breathable tops',
    tint: ['#4338CA', '#6366F1'] as const,
  },
  {
    id: 'e2',
    title: 'Weekend uniform',
    subtitle: 'Denim, sneakers, one statement piece',
    tint: ['#0D9488', '#14B8A6'] as const,
  },
  {
    id: 'e3',
    title: 'Quiet luxury',
    subtitle: 'Texture, neutrals, one metal accent',
    tint: ['#1C1917', '#57534E'] as const,
  },
];

type Props = { navigation: any };

export const StyleFeedScreen = ({ navigation }: Props) => {
  const { items, fetchItems } = useWardrobeStore();
  const { outfits } = useOutfitStore();
  const { currentTheme } = useThemeStore();
  const tabPadding = useTabScreenPadding();
  const [refreshing, setRefreshing] = useState(false);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedScope, setFeedScope] = useState<'following' | 'public'>('following');
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const previewOutfits = useMemo(() => outfits.slice(0, 8), [outfits]);

  const loadFeed = useCallback(async (scope: 'following' | 'public') => {
    if (!isSupabaseConfigured()) {
      setFeedPosts([]);
      return;
    }
    setFeedLoading(true);
    setFeedError(null);
    try {
      const res = await functionsClient.feedList({ scope, limit: 20 });
      setFeedPosts(res.posts ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the feed.';
      if (__DEV__) console.warn('[StyleFeed] feedList', err);
      setFeedError(message);
      setFeedPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed(feedScope);
  }, [feedScope, loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchItems(), loadFeed(feedScope)]);
    setRefreshing(false);
  }, [fetchItems, feedScope, loadFeed]);

  const goRoot = (route: string, params?: object) => {
    navigation
      .getParent()
      ?.getParent()
      ?.navigate(route as never, params as never);
  };

  const textPrimary = currentTheme.colors.text;
  const textSecondary = currentTheme.colors.textSecondary;
  const surface = currentTheme.colors.surface;

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
            Style
          </Typography>
          <Typography style={{ color: textSecondary, marginTop: 6, fontSize: 16 }}>
            Inspiration and outfits from your closet
          </Typography>
        </StyledView>

        {/* Editorial-first hero */}
        <Typography
          style={{ color: textPrimary, fontWeight: '600', fontSize: 20, marginBottom: 12 }}
        >
          Inspiration
        </Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {EDITORIAL_SPOTS.map((spot, i) => (
            <Animated.View key={spot.id} entering={FadeInDown.delay(i * 80)}>
              <LinearGradient
                colors={[spot.tint[0], spot.tint[1]]}
                style={{
                  width: windowWidth * 0.78,
                  borderRadius: 20,
                  padding: 22,
                  marginRight: 12,
                  minHeight: 140,
                  justifyContent: 'flex-end',
                }}
              >
                <Typography style={{ color: '#FFF', fontWeight: '700', fontSize: 20 }}>
                  {spot.title}
                </Typography>
                <Typography
                  style={{
                    color: 'rgba(255,255,255,0.92)',
                    marginTop: 6,
                    fontSize: 15,
                    lineHeight: 20,
                  }}
                >
                  {spot.subtitle}
                </Typography>
              </LinearGradient>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Quick stats */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <StyledView style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ClosetInsights')}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 16,
                backgroundColor: surface,
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
              }}
            >
              <Typography style={{ color: textSecondary, fontSize: 12 }}>Items</Typography>
              <Typography style={{ color: textPrimary, fontSize: 22, fontWeight: '700' }}>
                {items.length}
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.getParent()?.navigate('OutfitsStack', { screen: 'OutfitHome' })
              }
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 16,
                backgroundColor: surface,
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
              }}
            >
              <Typography style={{ color: textSecondary, fontSize: 12 }}>Outfits</Typography>
              <Typography style={{ color: textPrimary, fontSize: 22, fontWeight: '700' }}>
                {outfits.length}
              </Typography>
            </TouchableOpacity>
          </StyledView>
        </Animated.View>

        {/* Primary CTA — outfit generation */}
        <TouchableOpacity
          onPress={() => goRoot('GenerateOutfitFlow')}
          activeOpacity={0.9}
          style={{ marginBottom: 28 }}
        >
          <LinearGradient
            colors={[theme.colors.primary, '#2D2F33']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <StyledView style={{ flex: 1 }}>
              <Typography
                style={{ color: theme.colors.secondary, fontWeight: '700', fontSize: 18 }}
              >
                Generate an outfit
              </Typography>
              <Typography style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 14 }}>
                Uses your closet, style, and weather
              </Typography>
            </StyledView>
            <Ionicons name={'flash' as never} size={28} color={theme.colors.secondary} />
          </LinearGradient>
        </TouchableOpacity>

        {/* From your closet — saved outfits only (no purchase ranks, no CTL duplicate) */}
        <StyledView
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Typography style={{ color: textPrimary, fontWeight: '600', fontSize: 20 }}>
            From your closet
          </Typography>
          {previewOutfits.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                navigation.getParent()?.navigate('OutfitsStack', { screen: 'OutfitHome' })
              }
            >
              <Typography style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 15 }}>
                See all
              </Typography>
            </TouchableOpacity>
          )}
        </StyledView>

        {items.length === 0 ? (
          <Card className="p-5 mb-6" style={{ backgroundColor: surface }}>
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons name="shirt-outline" size={40} color={textSecondary} />
              <Typography
                style={{
                  color: textPrimary,
                  marginTop: 12,
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                Add pieces to build outfits here
              </Typography>
              <TouchableOpacity
                onPress={() =>
                  navigation.getParent()?.navigate('ScanStack', { screen: 'LiveCameraScan' })
                }
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
              <TouchableOpacity
                onPress={() => navigation.navigate('Recommendations')}
                style={{ marginTop: 16 }}
              >
                <Typography style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 15 }}>
                  Shopping & gaps — what to add next
                </Typography>
              </TouchableOpacity>
            </StyledView>
          </Card>
        ) : previewOutfits.length === 0 ? (
          <Card className="p-5 mb-6" style={{ backgroundColor: surface }}>
            <Typography
              style={{ color: textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 12 }}
            >
              Save outfits from Generate or Create to see them here.
            </Typography>
            <TouchableOpacity
              onPress={() => goRoot('GenerateOutfitFlow')}
              style={{ alignItems: 'center' }}
            >
              <Typography style={{ color: theme.colors.accent, fontWeight: '600' }}>
                Generate your first look
              </Typography>
            </TouchableOpacity>
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 28 }}
          >
            {previewOutfits.map((outfit, i) => (
              <OutfitPreviewCard
                key={outfit.id}
                outfit={outfit}
                index={i}
                onPress={() => goRoot('OutfitResult', { outfitId: outfit.id })}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                surface={surface}
                currentTheme={currentTheme}
              />
            ))}
          </ScrollView>
        )}

        {/* Community feed — others' outfits */}
        <StyledView
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Typography style={{ color: textPrimary, fontWeight: '600', fontSize: 20 }}>
            From the community
          </Typography>
          <StyledView style={{ flexDirection: 'row', gap: 6 }}>
            {(['following', 'public'] as const).map((scope) => (
              <TouchableOpacity
                key={scope}
                onPress={() => setFeedScope(scope)}
                accessibilityRole="button"
                accessibilityLabel={`Show ${scope} feed`}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: feedScope === scope ? theme.colors.primary : surface,
                  borderWidth: 1,
                  borderColor:
                    feedScope === scope ? theme.colors.primary : currentTheme.colors.border,
                }}
              >
                <Typography
                  style={{
                    color: feedScope === scope ? '#FFFFFF' : textSecondary,
                    fontSize: 12,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {scope}
                </Typography>
              </TouchableOpacity>
            ))}
          </StyledView>
        </StyledView>

        {feedLoading ? (
          <Card className="p-5 mb-6" style={{ backgroundColor: surface }}>
            <Typography style={{ color: textSecondary, fontSize: 14, textAlign: 'center' }}>
              Loading the feed…
            </Typography>
          </Card>
        ) : feedError ? (
          <Card className="p-5 mb-6" style={{ backgroundColor: surface }}>
            <Typography
              style={{ color: textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 8 }}
            >
              {feedError}
            </Typography>
            <TouchableOpacity onPress={() => loadFeed(feedScope)} style={{ alignItems: 'center' }}>
              <Typography style={{ color: theme.colors.accent, fontWeight: '600' }}>
                Retry
              </Typography>
            </TouchableOpacity>
          </Card>
        ) : feedPosts.length === 0 ? (
          <Card className="p-5 mb-6" style={{ backgroundColor: surface }}>
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons name="people-outline" size={32} color={textSecondary} />
              <Typography
                style={{
                  color: textPrimary,
                  marginTop: 10,
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                {feedScope === 'following'
                  ? 'No posts yet from people you follow'
                  : 'No public posts yet'}
              </Typography>
              <Typography
                style={{ color: textSecondary, marginTop: 6, fontSize: 13, textAlign: 'center' }}
              >
                {feedScope === 'following'
                  ? 'Switch to Public to see what the wider community is wearing.'
                  : 'Be the first to share an outfit.'}
              </Typography>
            </StyledView>
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 24 }}
          >
            {feedPosts.map((post, i) => (
              <FeedPostCard
                key={post.post_id}
                post={post}
                index={i}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                surface={surface}
                borderColor={currentTheme.colors.border}
              />
            ))}
          </ScrollView>
        )}

        {/* Single teaser — shopping & gaps live on Recommendations screen */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Recommendations')}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 18,
            borderRadius: 16,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: currentTheme.colors.border,
            marginBottom: 16,
          }}
        >
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: theme.colors.secondary + '44',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={'bag-handle-outline' as never}
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <StyledView style={{ flex: 1 }}>
              <Typography style={{ color: textPrimary, fontWeight: '600', fontSize: 17 }}>
                Shopping & gaps
              </Typography>
              <Typography style={{ color: textSecondary, fontSize: 14 }} numberOfLines={2}>
                Style gaps, pairings, and purchase ideas
              </Typography>
            </StyledView>
          </StyledView>
          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </TouchableOpacity>

        {/* Closet insights */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ClosetInsights')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 18,
            borderRadius: 16,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: currentTheme.colors.border,
            marginBottom: 16,
          }}
        >
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: theme.colors.accent + '22',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="stats-chart" size={22} color={theme.colors.accent} />
            </View>
            <StyledView>
              <Typography style={{ color: textPrimary, fontWeight: '600', fontSize: 17 }}>
                Closet insights
              </Typography>
              <Typography style={{ color: textSecondary, fontSize: 14 }}>
                Categories, most worn, composition
              </Typography>
            </StyledView>
          </StyledView>
          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const OUTFIT_CARD_W = windowWidth * 0.72;
const FEED_CARD_W = windowWidth * 0.62;

function FeedPostCard({
  post,
  index,
  textPrimary,
  textSecondary,
  surface,
  borderColor,
}: {
  post: FeedPost;
  index: number;
  textPrimary: string;
  textSecondary: string;
  surface: string;
  borderColor: string;
}) {
  const createdLabel = useMemo(() => formatRelativeShort(post.created_at), [post.created_at]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={{ marginRight: 12 }}>
      <StyledView
        style={{
          width: FEED_CARD_W,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: surface,
          borderWidth: 1,
          borderColor,
        }}
      >
        {post.image_signed_url ? (
          <Image
            source={{ uri: post.image_signed_url }}
            style={{ width: '100%', height: FEED_CARD_W * 1.1 }}
            contentFit="cover"
          />
        ) : (
          <StyledView
            style={{
              width: '100%',
              height: FEED_CARD_W * 1.1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="image-outline" size={36} color={textSecondary} />
          </StyledView>
        )}
        <StyledView style={{ padding: 14 }}>
          <Typography
            style={{ color: textPrimary, fontWeight: '600', fontSize: 15 }}
            numberOfLines={2}
          >
            {post.caption?.trim() || 'Untitled look'}
          </Typography>
          <StyledView
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <Typography style={{ color: textSecondary, fontSize: 12 }}>{createdLabel}</Typography>
            <StyledView style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons
                name={post.liked_by_me ? 'heart' : 'heart-outline'}
                size={14}
                color={post.liked_by_me ? '#EF4444' : textSecondary}
              />
              <Typography style={{ color: textSecondary, fontSize: 12 }}>
                {post.likes_count ?? 0}
              </Typography>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledView>
    </Animated.View>
  );
}

function formatRelativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, (Date.now() - then) / 1000);
  if (diffSec < 60) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

function OutfitPreviewCard({
  outfit,
  index,
  onPress,
  textPrimary,
  textSecondary,
  surface,
  currentTheme,
}: {
  outfit: Outfit;
  index: number;
  onPress: () => void;
  textPrimary: string;
  textSecondary: string;
  surface: string;
  currentTheme: { colors: { border: string; background: string } };
}) {
  const thumbs = outfit.items?.slice(0, 3) ?? [];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={{ marginRight: 12 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ width: OUTFIT_CARD_W }}>
        <StyledView
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: currentTheme.colors.border,
          }}
        >
          <StyledView style={{ flexDirection: 'row', height: 112 }}>
            {thumbs.map((item, i) => (
              <View
                key={item.id + String(i)}
                style={{
                  flex: 1,
                  borderRightWidth: i < thumbs.length - 1 ? 1 : 0,
                  borderRightColor: currentTheme.colors.border,
                }}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </View>
            ))}
          </StyledView>
          <StyledView style={{ padding: 14 }}>
            <Typography
              style={{ color: textPrimary, fontWeight: '700', fontSize: 16 }}
              numberOfLines={1}
            >
              {outfit.name || outfit.occasion || 'Outfit'}
            </Typography>
            <Typography
              style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}
              numberOfLines={1}
            >
              {outfit.items?.length ?? 0} pieces
            </Typography>
          </StyledView>
        </StyledView>
      </TouchableOpacity>
    </Animated.View>
  );
}
