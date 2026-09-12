import type { RecommendationEventType, RecommendationMetadata } from '../types';
import { ANALYTICS_EVENT_TYPES } from './recommendationAnalyticsTypes';
import type {
  AnalyticsEvent,
  BuildAnalyticsMetadataInput,
  ContextAnalyticsBucket,
  PositionAnalytics,
  RecommendationAnalyticsMetadata,
  RecommendationContextDimension,
  RecommendationFunnelCounts,
  RecommendationFunnelMetrics,
  RecommendationFunnelRates,
} from './recommendationAnalyticsTypes';

export type {
  AnalyticsEvent,
  BuildAnalyticsMetadataInput,
  ContextAnalyticsBucket,
  PositionAnalytics,
  RecommendationAnalyticsMetadata,
  RecommendationContextDimension,
  RecommendationFunnelCounts,
  RecommendationFunnelMetrics,
  RecommendationFunnelRates,
};

const EVENT_TYPE_SET = new Set<string>(ANALYTICS_EVENT_TYPES);

const ALLOWED_METADATA_KEYS = new Set([
  'engineVersion',
  'generationSource',
  'occasion',
  'weather',
  'styleContext',
  'personalizationUsed',
  'coldStart',
  'preferenceVectorVersion',
  'embeddingModel',
  'embeddingVersion',
  'finalScore',
  'compatibilityScore',
  'personalizationScore',
  'occasionScore',
  'weatherScore',
  'colourHarmonyScore',
  'formalityScore',
  'wearDiversityScore',
  'noveltyScore',
  'diversityScore',
  'recommendationPosition',
  'candidateCount',
  'composedCandidateCount',
  'rankedCandidateCount',
  'diversityCandidateCount',
  'diversityApplied',
  'diversitySelected',
  'explanationReasons',
]);

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function compactWeather(
  weather: unknown
): RecommendationAnalyticsMetadata['weather'] | undefined {
  if (!weather || typeof weather !== 'object') return undefined;
  const source = weather as Record<string, unknown>;
  const next: NonNullable<RecommendationAnalyticsMetadata['weather']> = {};
  if (isFiniteNumber(source.temperature)) next.temperature = source.temperature;
  if (typeof source.condition === 'string' && source.condition.trim()) {
    next.condition = source.condition;
  }
  if (isFiniteNumber(source.precipitationProbability)) {
    next.precipitationProbability = source.precipitationProbability;
  } else if (isFiniteNumber(source.chanceOfRain)) {
    next.precipitationProbability = source.chanceOfRain;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function compactStyleContext(styleContext: unknown): string[] | undefined {
  if (!Array.isArray(styleContext)) return undefined;
  const values = styleContext.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );
  return values.length > 0 ? values : undefined;
}

function compactReasons(reasons: unknown): string[] | undefined {
  if (!Array.isArray(reasons)) return undefined;
  const values = reasons.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );
  return values.length > 0 ? values.slice(0, 3) : undefined;
}

/**
 * Drop anything that is not recommendation metadata. Never store images,
 * tokens, emails, or free-text user messages.
 */
export function sanitizeAnalyticsMetadata(
  metadata: RecommendationAnalyticsMetadata | Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (value === undefined) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export function isRecommendationEventType(value: unknown): value is RecommendationEventType {
  return typeof value === 'string' && EVENT_TYPE_SET.has(value);
}

export function buildRecommendationAnalyticsMetadata(
  input: BuildAnalyticsMetadataInput
): RecommendationAnalyticsMetadata {
  const metadata: RecommendationAnalyticsMetadata = {
    engineVersion: input.engineVersion,
  };
  if (input.generationSource) metadata.generationSource = input.generationSource;
  if (input.occasion) metadata.occasion = input.occasion;
  const weather = compactWeather(input.weather);
  if (weather) metadata.weather = weather;
  const styleContext = compactStyleContext(input.styleContext);
  if (styleContext) metadata.styleContext = styleContext;
  if (input.personalizationUsed !== undefined) {
    metadata.personalizationUsed = input.personalizationUsed;
  }
  if (input.coldStart !== undefined) metadata.coldStart = input.coldStart;
  if (input.preferenceVectorVersion) {
    metadata.preferenceVectorVersion = input.preferenceVectorVersion;
  }
  if (input.embeddingsUsed && input.embeddingModel) {
    metadata.embeddingModel = input.embeddingModel;
  }
  if (input.embeddingsUsed && input.embeddingVersion) {
    metadata.embeddingVersion = input.embeddingVersion;
  }
  const score = input.scoreBreakdown;
  if (score) {
    if (isFiniteNumber(score.overall)) metadata.finalScore = score.overall;
    if (isFiniteNumber(score.compatibility)) metadata.compatibilityScore = score.compatibility;
    if (isFiniteNumber(score.personalization)) {
      metadata.personalizationScore = score.personalization;
    }
    if (isFiniteNumber(score.occasionFit)) metadata.occasionScore = score.occasionFit;
    if (isFiniteNumber(score.weatherFit)) metadata.weatherScore = score.weatherFit;
    if (isFiniteNumber(score.colourHarmony)) metadata.colourHarmonyScore = score.colourHarmony;
    if (isFiniteNumber(score.formality)) metadata.formalityScore = score.formality;
    if (isFiniteNumber(score.wearDiversity)) metadata.wearDiversityScore = score.wearDiversity;
    if (isFiniteNumber(score.novelty)) metadata.noveltyScore = score.novelty;
  }
  if (isFiniteNumber(input.recommendationPosition) && input.recommendationPosition >= 0) {
    metadata.recommendationPosition = input.recommendationPosition;
  }
  if (isFiniteNumber(input.candidateCount)) metadata.candidateCount = input.candidateCount;
  if (isFiniteNumber(input.composedCandidateCount)) {
    metadata.composedCandidateCount = input.composedCandidateCount;
  }
  if (isFiniteNumber(input.rankedCandidateCount)) {
    metadata.rankedCandidateCount = input.rankedCandidateCount;
  }
  if (isFiniteNumber(input.diversityCandidateCount)) {
    metadata.diversityCandidateCount = input.diversityCandidateCount;
  }
  if (input.diversityApplied !== undefined) metadata.diversityApplied = input.diversityApplied;
  if (input.diversitySelected !== undefined) metadata.diversitySelected = input.diversitySelected;
  const reasons = compactReasons(input.explanationReasons);
  if (reasons) metadata.explanationReasons = reasons;
  return metadata;
}

export function metadataFromEngine(
  engine: RecommendationMetadata,
  extras: Omit<BuildAnalyticsMetadataInput, 'engineVersion' | 'candidateCount'> & {
    engineVersion?: string;
  } = {}
): RecommendationAnalyticsMetadata {
  return buildRecommendationAnalyticsMetadata({
    engineVersion: extras.engineVersion ?? engine.engineVersion,
    candidateCount: engine.candidateCount,
    composedCandidateCount: engine.composedCount,
    rankedCandidateCount: engine.rankedCount,
    diversityCandidateCount: engine.diversityCandidatesConsidered,
    diversityApplied: engine.diversityApplied,
    embeddingModel: extras.embeddingModel ?? engine.embeddingModel,
    embeddingVersion: extras.embeddingVersion ?? engine.embeddingVersion,
    embeddingsUsed: extras.embeddingsUsed ?? engine.embeddingsUsed,
    personalizationUsed: extras.personalizationUsed ?? engine.personalizationUsed,
    coldStart: extras.coldStart ?? engine.coldStart,
    ...extras,
  });
}

function emptyCounts(): RecommendationFunnelCounts {
  return {
    impressions: 0,
    views: 0,
    likes: 0,
    dislikes: 0,
    saves: 0,
    wears: 0,
    swaps: 0,
    removes: 0,
    shares: 0,
    tryOns: 0,
    dismissals: 0,
  };
}

export function countRecommendationEvents(events: AnalyticsEvent[]): RecommendationFunnelCounts {
  const counts = emptyCounts();
  for (const event of events) {
    switch (event.eventType) {
      case 'impression':
        counts.impressions += 1;
        break;
      case 'view':
        counts.views += 1;
        break;
      case 'like':
        counts.likes += 1;
        break;
      case 'dislike':
        counts.dislikes += 1;
        break;
      case 'save':
        counts.saves += 1;
        break;
      case 'wear':
        counts.wears += 1;
        break;
      case 'swap':
        counts.swaps += 1;
        break;
      case 'remove':
        counts.removes += 1;
        break;
      case 'share':
        counts.shares += 1;
        break;
      case 'try_on':
        counts.tryOns += 1;
        break;
      case 'dismiss':
        counts.dismissals += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

export function deriveFunnelRates(counts: RecommendationFunnelCounts): RecommendationFunnelRates {
  return {
    viewRate: ratio(counts.views, counts.impressions),
    likeRate: ratio(counts.likes, counts.impressions),
    saveRate: ratio(counts.saves, counts.impressions),
    wearRate: ratio(counts.wears, counts.impressions),
    swapRate: ratio(counts.swaps, counts.impressions),
    dismissRate: ratio(counts.dismissals, counts.impressions),
    tryOnRate: ratio(counts.tryOns, counts.impressions),
    viewedLikeRate: ratio(counts.likes, counts.views),
  };
}

export function calculateRecommendationFunnel(events: AnalyticsEvent[]): RecommendationFunnelMetrics {
  const counts = countRecommendationEvents(events);
  return { ...counts, ...deriveFunnelRates(counts) };
}

function eventPosition(event: AnalyticsEvent): number | undefined {
  if (isFiniteNumber(event.position) && event.position >= 0) return event.position;
  const fromMetadata = event.metadata?.recommendationPosition;
  if (isFiniteNumber(fromMetadata) && fromMetadata >= 0) return fromMetadata;
  return undefined;
}

export function aggregateEventsByPosition(events: AnalyticsEvent[]): PositionAnalytics[] {
  const byPosition = new Map<number, PositionAnalytics>();
  const bucket = (position: number): PositionAnalytics => {
    const existing = byPosition.get(position);
    if (existing) return existing;
    const created: PositionAnalytics = {
      position,
      impressions: 0,
      views: 0,
      likes: 0,
      saves: 0,
      wears: 0,
      swaps: 0,
    };
    byPosition.set(position, created);
    return created;
  };

  for (const event of events) {
    const position = eventPosition(event);
    if (position === undefined) continue;
    const current = bucket(position);
    switch (event.eventType) {
      case 'impression':
        current.impressions += 1;
        break;
      case 'view':
        current.views += 1;
        break;
      case 'like':
        current.likes += 1;
        break;
      case 'save':
        current.saves += 1;
        break;
      case 'wear':
        current.wears += 1;
        break;
      case 'swap':
        current.swaps += 1;
        break;
      default:
        break;
    }
  }

  return [...byPosition.values()].sort((left, right) => left.position - right.position);
}

function contextKey(
  event: AnalyticsEvent,
  dimension: RecommendationContextDimension
): string | undefined {
  const metadata = event.metadata ?? {};
  switch (dimension) {
    case 'occasion': {
      const occasion = metadata.occasion;
      return typeof occasion === 'string' && occasion.trim() ? occasion : undefined;
    }
    case 'weather': {
      const weather = metadata.weather;
      if (!weather || typeof weather !== 'object') return undefined;
      const condition = (weather as { condition?: unknown }).condition;
      return typeof condition === 'string' && condition.trim() ? condition : undefined;
    }
    case 'personalization': {
      if (metadata.coldStart === true) return 'cold-start';
      if (metadata.personalizationUsed === true) return 'personalized';
      return undefined;
    }
    case 'engineVersion': {
      const version = metadata.engineVersion;
      return typeof version === 'string' && version.trim() ? version : undefined;
    }
    case 'generationSource': {
      const source = metadata.generationSource;
      return typeof source === 'string' && source.trim() ? source : undefined;
    }
    default:
      return undefined;
  }
}

export function aggregateEventsByContext(
  events: AnalyticsEvent[],
  dimension: RecommendationContextDimension
): ContextAnalyticsBucket[] {
  const grouped = new Map<string, AnalyticsEvent[]>();
  for (const event of events) {
    const key = contextKey(event, dimension);
    if (!key) continue;
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }
  return [...grouped.entries()]
    .map(([key, groupedEvents]) => ({
      key,
      dimension,
      ...calculateRecommendationFunnel(groupedEvents),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
