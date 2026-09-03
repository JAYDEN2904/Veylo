import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { asyncJsonStorage } from '../lib/zustandStorage';
import type { ClothingItem } from '../types';
import {
  applyFeedbackToVector,
  emptyPreferenceVector,
} from '../services/recommendation/feedback/recommendationFeedback';
import { createSessionId } from '../services/recommendation/feedback/sessionId';
import type {
  RecommendationEventType,
  UserPreferenceVector,
} from '../services/recommendation/types';

export interface LocalRecommendationSession {
  id: string;
  userId?: string;
  occasion?: string;
  weather?: unknown;
  styleContext?: unknown;
  requestContext: Record<string, unknown>;
  engineVersion: string;
  createdAt: string;
}

export interface LocalRecommendationEvent {
  id: string;
  sessionId: string | null;
  eventType: RecommendationEventType;
  recommendationId?: string;
  outfitId?: string;
  itemId?: string;
  position?: number;
  occasion?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface PreferenceState {
  preferenceVector: UserPreferenceVector;
  lastSession: LocalRecommendationSession | null;
  recentEvents: LocalRecommendationEvent[];
  startSession: (input: {
    userId?: string;
    occasion?: string;
    weather?: unknown;
    styleContext?: unknown;
    requestContext?: Record<string, unknown>;
    engineVersion: string;
  }) => LocalRecommendationSession;
  applyEvent: (input: {
    eventType: RecommendationEventType;
    items: ClothingItem[];
    occasion?: string;
    itemId?: string;
    outfitId?: string;
    recommendationId?: string;
    position?: number;
    metadata?: Record<string, unknown>;
  }) => LocalRecommendationEvent;
  reset: () => void;
}

const MAX_RECENT_EVENTS = 200;

const EMPTY_PREFERENCE_STATE = {
  preferenceVector: emptyPreferenceVector('1970-01-01T00:00:00.000Z'),
  lastSession: null as LocalRecommendationSession | null,
  recentEvents: [] as LocalRecommendationEvent[],
};

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set, get) => ({
      ...EMPTY_PREFERENCE_STATE,

      startSession: (input) => {
        const session: LocalRecommendationSession = {
          id: createSessionId(),
          userId: input.userId,
          occasion: input.occasion,
          weather: input.weather,
          styleContext: input.styleContext,
          requestContext: input.requestContext ?? {},
          engineVersion: input.engineVersion,
          createdAt: new Date().toISOString(),
        };
        set({ lastSession: session });
        return session;
      },

      applyEvent: (input) => {
        const sessionId = get().lastSession?.id ?? null;
        const event: LocalRecommendationEvent = {
          id: createSessionId(),
          sessionId,
          eventType: input.eventType,
          recommendationId: input.recommendationId,
          outfitId: input.outfitId,
          itemId: input.itemId,
          position: input.position,
          occasion: input.occasion,
          metadata: input.metadata ?? {},
          createdAt: new Date().toISOString(),
        };

        const preferenceVector = applyFeedbackToVector(get().preferenceVector, {
          eventType: input.eventType,
          items: input.items,
          occasion: input.occasion,
          itemId: input.itemId,
        });

        const recentEvents = [...get().recentEvents, event].slice(-MAX_RECENT_EVENTS);
        set({ preferenceVector, recentEvents });
        return event;
      },

      reset: () => {
        set({
          preferenceVector: emptyPreferenceVector(),
          lastSession: null,
          recentEvents: [],
        });
      },
    }),
    {
      name: 'veylo-recommendation-prefs-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({
        preferenceVector: state.preferenceVector,
        lastSession: state.lastSession,
        recentEvents: state.recentEvents,
      }),
    }
  )
);
