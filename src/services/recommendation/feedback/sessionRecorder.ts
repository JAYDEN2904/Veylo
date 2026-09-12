import type { ClothingItem, Outfit } from '../../../types';
import { getSupabase, isSupabaseConfigured } from '../../supabase';
import {
  usePreferenceStore,
  type LocalRecommendationEvent,
  type LocalRecommendationSession,
} from '../../../store/usePreferenceStore';
import type { GenerationSource, RecommendationEventType, RecommendationMetadata } from '../types';
import { ENGINE_VERSION, PREFERENCE_VECTOR_VERSION } from '../types';
import {
  buildRecommendationAnalyticsMetadata,
  isRecommendationEventType,
  sanitizeAnalyticsMetadata,
} from '../analytics/recommendationAnalytics';

export interface GeneratedRecommendationCapture {
  outfits: Outfit[];
  userId?: string;
  occasion?: string;
  weather?: unknown;
  styleContext?: unknown;
  requestContext?: Record<string, unknown>;
  engineVersion?: string;
  generationSource?: GenerationSource;
  personalizationUsed?: boolean;
  coldStart?: boolean;
  metadata?: RecommendationMetadata;
}

export interface RecommendationEventInput {
  eventType: RecommendationEventType;
  items: ClothingItem[];
  occasion?: string;
  itemId?: string;
  outfitId?: string;
  recommendationId?: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

const SESSION_DEDUPE_TYPES: ReadonlySet<RecommendationEventType> = new Set([
  'impression',
  'view',
  'wear',
  'save',
]);

const REQUIRES_OUTFIT_ID: ReadonlySet<RecommendationEventType> = new Set(['impression', 'view']);

function persistSessionAndEvents(
  session: LocalRecommendationSession | null,
  events: LocalRecommendationEvent[]
): void {
  if (!session || events.length === 0 || !isSupabaseConfigured()) return;

  void (async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;

      const { error: sessionError } = await supabase.from('recommendation_sessions').upsert(
        {
          id: session.id,
          user_id: userId,
          request_context: session.requestContext,
          occasion: session.occasion ?? null,
          weather: session.weather ?? null,
          style_context: session.styleContext ?? null,
          engine_version: session.engineVersion,
          created_at: session.createdAt,
        },
        { onConflict: 'id' }
      );
      if (sessionError) {
        if (__DEV__) console.warn('[recommendation] session persist', sessionError.message);
        return;
      }

      const rows = events.map((event) => ({
        id: event.id,
        session_id: event.sessionId,
        user_id: userId,
        recommendation_id: event.recommendationId ?? null,
        outfit_id: event.outfitId ?? null,
        event_type: event.eventType,
        item_id: event.itemId ?? null,
        position: event.position ?? null,
        metadata: event.metadata,
        created_at: event.createdAt,
      }));
      const { error: eventError } = await supabase.from('recommendation_events').insert(rows);
      if (eventError && __DEV__) {
        console.warn('[recommendation] event persist', eventError.message);
      }
    } catch (err) {
      if (__DEV__) console.warn('[recommendation] persist unexpected', err);
    }
  })();
}

/**
 * Event coverage (Sprint 3.1 + 5):
 * impression — generateOutfit (local + edge) via recordGeneratedRecommendations
 * view       — OutfitResultScreen mount
 * like       — recordOutfitFeedback('liked') — no dedicated like button yet
 * dislike    — recordOutfitFeedback('disliked') — no dedicated dislike button yet
 * save       — toggleFavorite (library + generated)
 * swap       — TodayScreen handleSwapItem
 * wear       — recordOutfitWear → recordOutfitFeedback('worn')
 * share      — OutfitResultScreen handleShare (user completed share)
 * try_on     — OutfitResultScreen handleTryOn
 * remove     — no UI yet
 * dismiss    — no UI yet
 *
 * Start a session and record impressions for ranked results. Local only on
 * the generate path — remote writes are best-effort and never awaited.
 *
 * Failed generation must not call this helper. Empty outfit lists are a no-op.
 */
export function recordGeneratedRecommendations(input: GeneratedRecommendationCapture): void {
  if (input.outfits.length === 0) return;

  const store = usePreferenceStore.getState();
  const engineVersion = input.engineVersion ?? input.metadata?.engineVersion ?? ENGINE_VERSION;
  const generationSource = input.generationSource ?? 'local';
  const personalizationUsed =
    input.personalizationUsed ?? input.metadata?.personalizationUsed ?? false;
  const coldStart = input.coldStart ?? input.metadata?.coldStart ?? !personalizationUsed;

  const session = store.startSession({
    userId: input.userId,
    occasion: input.occasion,
    weather: compactSessionWeather(input.weather),
    styleContext: Array.isArray(input.styleContext) ? input.styleContext : input.styleContext,
    requestContext: input.requestContext ?? { occasion: input.occasion },
    engineVersion,
  });

  const events: LocalRecommendationEvent[] = [];
  const seenOutfitIds = new Set<string>();

  input.outfits.forEach((outfit, index) => {
    if (!outfit?.id || outfit.items.length === 0) return;
    if (seenOutfitIds.has(outfit.id)) return;
    seenOutfitIds.add(outfit.id);

    const position =
      typeof outfit.recommendationPosition === 'number' && outfit.recommendationPosition >= 0
        ? outfit.recommendationPosition
        : index;
    const metadata = sanitizeAnalyticsMetadata(
      buildRecommendationAnalyticsMetadata({
        engineVersion,
        generationSource,
        occasion: input.occasion ?? outfit.occasion,
        weather: input.weather,
        styleContext: input.styleContext,
        personalizationUsed,
        coldStart,
        preferenceVectorVersion: PREFERENCE_VECTOR_VERSION,
        embeddingModel: input.metadata?.embeddingModel,
        embeddingVersion: input.metadata?.embeddingVersion,
        embeddingsUsed: input.metadata?.embeddingsUsed,
        scoreBreakdown: outfit.scoreBreakdown,
        recommendationPosition: position,
        candidateCount: input.metadata?.candidateCount,
        composedCandidateCount: input.metadata?.composedCount,
        rankedCandidateCount: input.metadata?.rankedCount,
        diversityCandidateCount: input.metadata?.diversityCandidatesConsidered,
        diversityApplied: input.metadata?.diversityApplied,
        diversitySelected: Boolean(input.metadata?.diversityApplied && position > 0),
        explanationReasons: outfit.fitReasoning,
      })
    );

    const event = store.applyEvent({
      eventType: 'impression',
      items: outfit.items,
      occasion: input.occasion ?? outfit.occasion,
      outfitId: outfit.id,
      recommendationId: outfit.id,
      position,
      metadata,
    });
    events.push(event);
  });

  persistSessionAndEvents(session, events);
}

export function recordRecommendationEvent(
  input: RecommendationEventInput
): LocalRecommendationEvent | null {
  if (!isRecommendationEventType(input.eventType)) return null;
  if (REQUIRES_OUTFIT_ID.has(input.eventType) && !input.outfitId) return null;
  if (
    input.position !== undefined &&
    (typeof input.position !== 'number' || !Number.isFinite(input.position) || input.position < 0)
  ) {
    return null;
  }

  const store = usePreferenceStore.getState();
  const sessionId = store.lastSession?.id ?? null;

  if (SESSION_DEDUPE_TYPES.has(input.eventType) && input.outfitId) {
    const alreadyRecorded = store.recentEvents.some(
      (event) =>
        event.eventType === input.eventType &&
        event.outfitId === input.outfitId &&
        event.sessionId === sessionId
    );
    if (alreadyRecorded) return null;
  }

  const inherited = inheritImpressionMetadata(store.recentEvents, input.outfitId);
  const metadata = sanitizeAnalyticsMetadata({
    ...inherited,
    ...(input.metadata ?? {}),
  });

  const event = store.applyEvent({
    ...input,
    position: input.position ?? inheritedPosition(inherited, input.outfitId, store.recentEvents),
    metadata,
  });
  persistSessionAndEvents(store.lastSession, [event]);
  return event;
}

function inheritImpressionMetadata(
  events: LocalRecommendationEvent[],
  outfitId?: string
): Record<string, unknown> {
  if (!outfitId) return {};
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.eventType === 'impression' && event.outfitId === outfitId) {
      return event.metadata ?? {};
    }
  }
  return {};
}

function inheritedPosition(
  metadata: Record<string, unknown>,
  outfitId: string | undefined,
  events: LocalRecommendationEvent[]
): number | undefined {
  const fromMetadata = metadata.recommendationPosition;
  if (typeof fromMetadata === 'number' && fromMetadata >= 0) return fromMetadata;
  if (!outfitId) return undefined;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.eventType === 'impression' && event.outfitId === outfitId) {
      return event.position;
    }
  }
  return undefined;
}

function compactSessionWeather(weather: unknown): unknown {
  if (!weather || typeof weather !== 'object') return weather;
  const source = weather as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  if (typeof source.temperature === 'number') next.temperature = source.temperature;
  if (typeof source.condition === 'string') next.condition = source.condition;
  if (typeof source.precipitationProbability === 'number') {
    next.precipitationProbability = source.precipitationProbability;
  }
  return Object.keys(next).length > 0 ? next : weather;
}
