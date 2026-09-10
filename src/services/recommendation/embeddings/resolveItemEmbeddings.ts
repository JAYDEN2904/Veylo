import type { ClothingItem } from '../../../types';
import {
  EMBEDDING_MAX_SCHEDULE_PER_RESOLVE,
  resolveEmbeddingPolicy,
  type EmbeddingPolicy,
} from './embeddingConfig';
import {
  embeddingMemoryCache,
  type EmbeddingMemoryCache,
} from './embeddingCache';
import { embeddingFreshness } from './embeddingFreshness';
import { fetchEmbeddingRecords } from './embeddingRepository';
import { getEmbeddingGenerationFailureCount, scheduleItemEmbedding } from './embeddingService';
import type { ItemEmbeddingRecord, ResolveEmbeddingsResult } from './embeddingTypes';

export interface ResolveItemEmbeddingsOptions {
  fetchRecords?: (ids: string[]) => Promise<ItemEmbeddingRecord[]>;
  scheduleMissing?: boolean;
  policy?: Partial<EmbeddingPolicy>;
  cache?: EmbeddingMemoryCache;
}

const inflightResolves = new Map<string, Promise<ResolveEmbeddingsResult>>();

let observability = {
  embeddingCacheHits: 0,
  embeddingCacheMisses: 0,
  embeddingFetchCount: 0,
  staleEmbeddingCount: 0,
};

export function getEmbeddingObservability() {
  return {
    ...observability,
    embeddingGenerationFailures: getEmbeddingGenerationFailureCount(),
  };
}

export function resetEmbeddingResolveStateForTests(): void {
  inflightResolves.clear();
  observability = {
    embeddingCacheHits: 0,
    embeddingCacheMisses: 0,
    embeddingFetchCount: 0,
    staleEmbeddingCount: 0,
  };
}

function resolveKey(items: ClothingItem[], policy: EmbeddingPolicy): string {
  return `${policy.model}::${policy.version}::${items
    .map((entry) => entry.id)
    .sort()
    .join(',')}`;
}

function logResolveStats(stats: ResolveEmbeddingsResult['stats']): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[embeddings:resolve]', {
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    fetchCount: stats.fetchCount,
    staleCount: stats.staleCount,
    scheduledCount: stats.scheduledCount,
  });
}

async function resolveItemEmbeddingsImpl(
  items: ClothingItem[],
  options: ResolveItemEmbeddingsOptions
): Promise<ResolveEmbeddingsResult> {
  const policy = resolveEmbeddingPolicy(options.policy);
  const cache = options.cache ?? embeddingMemoryCache;
  const embeddings: Record<string, number[]> = {};
  const stats = {
    cacheHits: 0,
    cacheMisses: 0,
    fetchCount: 0,
    staleCount: 0,
    scheduledCount: 0,
  };

  const misses: ClothingItem[] = [];

  for (const item of items) {
    const cached = cache.getCachedEmbedding(item.id, policy);
    if (cached && embeddingFreshness(item, cached.record, policy) === 'fresh') {
      embeddings[item.id] = cached.record.embedding;
      stats.cacheHits += 1;
      observability.embeddingCacheHits += 1;
      continue;
    }
    stats.cacheMisses += 1;
    observability.embeddingCacheMisses += 1;
    misses.push(item);
  }

  if (misses.length > 0) {
    const fetched = await fetchEmbeddingRecords(
      misses.map((item) => item.id),
      { fetchRecords: options.fetchRecords }
    );
    stats.fetchCount += 1;
    observability.embeddingFetchCount += 1;
    const byId = new Map(fetched.map((record) => [record.entityId, record]));

    for (const item of misses) {
      const record = byId.get(item.id);
      const status = embeddingFreshness(item, record, policy);
      if (status === 'fresh' && record) {
        cache.setCachedEmbedding(item.id, record, policy);
        embeddings[item.id] = record.embedding;
        continue;
      }
      if (status === 'stale' || status === 'invalid') {
        stats.staleCount += 1;
        observability.staleEmbeddingCount += 1;
        cache.invalidateCachedEmbedding(item.id);
      }
      if (
        options.scheduleMissing !== false &&
        stats.scheduledCount < EMBEDDING_MAX_SCHEDULE_PER_RESOLVE
      ) {
        scheduleItemEmbedding(item, { policy });
        stats.scheduledCount += 1;
      }
    }
  }

  logResolveStats(stats);
  return { embeddings, stats };
}

/**
 * Session-aware embedding lookup. Recommendation callers should use this
 * instead of talking to Supabase directly.
 */
export async function resolveItemEmbeddings(
  items: ClothingItem[],
  options: ResolveItemEmbeddingsOptions = {}
): Promise<ResolveEmbeddingsResult> {
  const policy = resolveEmbeddingPolicy(options.policy);
  const key = resolveKey(items, policy);
  const existing = inflightResolves.get(key);
  if (existing) return existing;

  const work = resolveItemEmbeddingsImpl(items, options).finally(() => {
    inflightResolves.delete(key);
  });
  inflightResolves.set(key, work);
  try {
    return await work;
  } catch (err) {
    inflightResolves.delete(key);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[embeddings] resolve failed', err instanceof Error ? err.message : err);
    }
    return {
      embeddings: {},
      stats: {
        cacheHits: 0,
        cacheMisses: items.length,
        fetchCount: 0,
        staleCount: 0,
        scheduledCount: 0,
      },
    };
  }
}
