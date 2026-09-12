import {
  aggregateEventsByContext,
  aggregateEventsByPosition,
  buildRecommendationAnalyticsMetadata,
  calculateRecommendationFunnel,
  sanitizeAnalyticsMetadata,
} from './recommendationAnalytics';
import type { AnalyticsEvent } from './recommendationAnalyticsTypes';

function event(
  eventType: AnalyticsEvent['eventType'],
  extras: Partial<AnalyticsEvent> = {}
): AnalyticsEvent {
  return {
    eventType,
    sessionId: 'session-1',
    outfitId: extras.outfitId ?? 'outfit-1',
    position: extras.position,
    metadata: extras.metadata,
    ...extras,
  };
}

describe('sanitizeAnalyticsMetadata', () => {
  it('keeps recommendation fields and drops sensitive keys', () => {
    const sanitized = sanitizeAnalyticsMetadata({
      engineVersion: '2.6.0',
      imageUrl: 'https://example.com/secret.jpg',
      accessToken: 'tok',
      email: 'user@example.com',
      finalScore: 82,
    });
    expect(sanitized.engineVersion).toBe('2.6.0');
    expect(sanitized.finalScore).toBe(82);
    expect(sanitized.imageUrl).toBeUndefined();
    expect(sanitized.accessToken).toBeUndefined();
    expect(sanitized.email).toBeUndefined();
  });
});

describe('buildRecommendationAnalyticsMetadata', () => {
  it('compacts weather and score provenance', () => {
    const metadata = buildRecommendationAnalyticsMetadata({
      engineVersion: '2.6.0',
      generationSource: 'local',
      occasion: 'Work',
      weather: { temperature: 12, condition: 'Rain', location: 'Home', humidity: 90 },
      personalizationUsed: true,
      coldStart: false,
      scoreBreakdown: {
        overall: 81,
        compatibility: 80,
        personalization: 84,
        occasionFit: 78,
        weatherFit: 70,
        colourHarmony: 88,
        formality: 74,
        wearDiversity: 60,
        novelty: 60,
      },
      recommendationPosition: 0,
      explanationReasons: ['Fits a work setting.'],
    });
    expect(metadata.weather).toEqual({ temperature: 12, condition: 'Rain' });
    expect(metadata.finalScore).toBe(81);
    expect(metadata.personalizationScore).toBe(84);
    expect(metadata.recommendationPosition).toBe(0);
    expect(metadata.explanationReasons).toEqual(['Fits a work setting.']);
  });

  it('omits embedding model unless embeddings were used', () => {
    const metadata = buildRecommendationAnalyticsMetadata({
      engineVersion: '2.6.0',
      embeddingsUsed: false,
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion: '1.0.0',
    });
    expect(metadata.embeddingModel).toBeUndefined();
  });
});

describe('calculateRecommendationFunnel', () => {
  it('uses impressions as the denominator for view_rate', () => {
    const metrics = calculateRecommendationFunnel([
      event('impression', { outfitId: 'a' }),
      event('impression', { outfitId: 'b' }),
      event('impression', { outfitId: 'c' }),
      event('view', { outfitId: 'a' }),
      event('like', { outfitId: 'a' }),
      event('save', { outfitId: 'a' }),
      event('wear', { outfitId: 'a' }),
    ]);
    expect(metrics.impressions).toBe(3);
    expect(metrics.views).toBe(1);
    expect(metrics.viewRate).toBeCloseTo(1 / 3);
    expect(metrics.likeRate).toBeCloseTo(1 / 3);
    expect(metrics.viewedLikeRate).toBe(1);
    expect(metrics.saveRate).toBeCloseTo(1 / 3);
    expect(metrics.wearRate).toBeCloseTo(1 / 3);
  });

  it('returns 0 rates when there are no impressions', () => {
    const metrics = calculateRecommendationFunnel([event('like')]);
    expect(metrics.likeRate).toBe(0);
    expect(metrics.viewRate).toBe(0);
  });
});

describe('aggregateEventsByPosition', () => {
  it('groups engagement by recommendation position', () => {
    const rows = aggregateEventsByPosition([
      event('impression', { position: 0, outfitId: 'a' }),
      event('impression', { position: 1, outfitId: 'b' }),
      event('view', { position: 0, outfitId: 'a' }),
      event('like', { metadata: { recommendationPosition: 0 }, outfitId: 'a' }),
      event('wear', { position: 1, outfitId: 'b' }),
    ]);
    expect(rows[0]).toMatchObject({ position: 0, impressions: 1, views: 1, likes: 1 });
    expect(rows[1]).toMatchObject({ position: 1, impressions: 1, wears: 1 });
  });
});

describe('aggregateEventsByContext', () => {
  it('groups like rate by occasion and personalization', () => {
    const events: AnalyticsEvent[] = [
      event('impression', {
        outfitId: 'a',
        metadata: { occasion: 'Casual', engineVersion: '2.6.0', coldStart: true },
      }),
      event('like', {
        outfitId: 'a',
        metadata: { occasion: 'Casual', engineVersion: '2.6.0', coldStart: true },
      }),
      event('impression', {
        outfitId: 'b',
        metadata: {
          occasion: 'Work',
          engineVersion: '2.6.0',
          personalizationUsed: true,
          generationSource: 'local',
        },
      }),
      event('save', {
        outfitId: 'b',
        metadata: {
          occasion: 'Work',
          engineVersion: '2.6.0',
          personalizationUsed: true,
          generationSource: 'local',
        },
      }),
    ];
    const byOccasion = aggregateEventsByContext(events, 'occasion');
    const casual = byOccasion.find((row) => row.key === 'Casual');
    const work = byOccasion.find((row) => row.key === 'Work');
    expect(casual?.likeRate).toBe(1);
    expect(work?.saveRate).toBe(1);

    const byPersonalization = aggregateEventsByContext(events, 'personalization');
    expect(byPersonalization.map((row) => row.key).sort()).toEqual(['cold-start', 'personalized']);

    const bySource = aggregateEventsByContext(events, 'generationSource');
    expect(bySource[0].key).toBe('local');

    const byVersion = aggregateEventsByContext(events, 'engineVersion');
    expect(byVersion[0].key).toBe('2.6.0');
  });
});
