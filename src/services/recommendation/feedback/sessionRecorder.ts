import type { ClothingItem, Outfit } from '../../../types';
import { getSupabase, isSupabaseConfigured } from '../../supabase';
import {
  usePreferenceStore,
  type LocalRecommendationEvent,
  type LocalRecommendationSession,
} from '../../../store/usePreferenceStore';
import type { RecommendationEventType } from '../types';
import { ENGINE_VERSION } from '../types';

export interface GeneratedRecommendationCapture {
  outfits: Outfit[];
  userId?: string;
  occasion?: string;
  weather?: unknown;
  styleContext?: unknown;
  requestContext?: Record<string, unknown>;
  engineVersion?: string;
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
 * Start a session and record impressions for ranked results. Local only on
 * the generate path — remote writes are best-effort and never awaited.
 */
export function recordGeneratedRecommendations(input: GeneratedRecommendationCapture): void {
  const store = usePreferenceStore.getState();
  const engineVersion = input.engineVersion ?? ENGINE_VERSION;
  const session = store.startSession({
    userId: input.userId,
    occasion: input.occasion,
    weather: input.weather,
    styleContext: input.styleContext,
    requestContext: input.requestContext ?? { occasion: input.occasion },
    engineVersion,
  });

  const events = input.outfits.map((outfit, index) =>
    store.applyEvent({
      eventType: 'impression',
      items: outfit.items,
      occasion: input.occasion ?? outfit.occasion,
      outfitId: outfit.id,
      recommendationId: outfit.id,
      position: index,
    })
  );

  persistSessionAndEvents(session, events);
}

export function recordRecommendationEvent(input: RecommendationEventInput): void {
  const store = usePreferenceStore.getState();
  const event = store.applyEvent(input);
  persistSessionAndEvents(store.lastSession, [event]);
}
