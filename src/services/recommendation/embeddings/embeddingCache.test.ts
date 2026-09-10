import { item } from '../testFixtures';
import { EmbeddingMemoryCache, embeddingMemoryCache, clearEmbeddingCache } from './embeddingCache';
import { EMBEDDING_FETCH_CHUNK, EMBEDDING_MODEL, EMBEDDING_VERSION } from './embeddingConfig';
import { fingerprintClothingItem } from './embeddingFingerprint';
import { chunkIds, resetEmbeddingFetchInflightForTests } from './embeddingRepository';
import * as embeddingService from './embeddingService';
import type { ItemEmbeddingRecord } from './embeddingTypes';
import {
  resetEmbeddingResolveStateForTests,
  resolveItemEmbeddings,
} from './resolveItemEmbeddings';

const POLICY = { model: EMBEDDING_MODEL, version: EMBEDDING_VERSION, dimensions: 3 };

function recordFor(entry: ReturnType<typeof item>, vector: number[]): ItemEmbeddingRecord {
  return {
    entityId: entry.id,
    entityType: 'item',
    embedding: vector,
    model: EMBEDDING_MODEL,
    dimensions: 3,
    version: EMBEDDING_VERSION,
    sourceHash: fingerprintClothingItem(entry),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('embedding memory cache', () => {
  it('misses then hits', () => {
    const cache = new EmbeddingMemoryCache(8);
    const shirt = item({ id: 't1' });
    expect(cache.getCachedEmbedding('t1', POLICY)).toBeUndefined();
    cache.setCachedEmbedding('t1', recordFor(shirt, [1, 0, 0]), POLICY);
    expect(cache.getCachedEmbedding('t1', POLICY)?.record.embedding).toEqual([1, 0, 0]);
  });

  it('uses model/version-aware keys', () => {
    const cache = new EmbeddingMemoryCache(8);
    const shirt = item({ id: 't1' });
    cache.setCachedEmbedding('t1', recordFor(shirt, [1, 0, 0]), POLICY);
    expect(
      cache.getCachedEmbedding('t1', { ...POLICY, version: '9.9.9' })
    ).toBeUndefined();
    expect(cache.getCachedEmbedding('t1', POLICY)?.record.embedding).toEqual([1, 0, 0]);
  });

  it('invalidates one item without clearing others', () => {
    const cache = new EmbeddingMemoryCache(8);
    const a = item({ id: 't1' });
    const b = item({ id: 't2' });
    cache.setCachedEmbedding('t1', recordFor(a, [1, 0, 0]), POLICY);
    cache.setCachedEmbedding('t2', recordFor(b, [0, 1, 0]), POLICY);
    cache.invalidateCachedEmbedding('t1');
    expect(cache.getCachedEmbedding('t1', POLICY)).toBeUndefined();
    expect(cache.getCachedEmbedding('t2', POLICY)?.record.embedding).toEqual([0, 1, 0]);
  });

  it('bounds memory usage', () => {
    const cache = new EmbeddingMemoryCache(2);
    cache.setCachedEmbedding('a', recordFor(item({ id: 'a' }), [1, 0, 0]), POLICY);
    cache.setCachedEmbedding('b', recordFor(item({ id: 'b' }), [0, 1, 0]), POLICY);
    cache.setCachedEmbedding('c', recordFor(item({ id: 'c' }), [0, 0, 1]), POLICY);
    expect(cache.size()).toBe(2);
    expect(cache.getCachedEmbedding('a', POLICY)).toBeUndefined();
  });
});

describe('resolveItemEmbeddings cache', () => {
  beforeEach(() => {
    clearEmbeddingCache();
    resetEmbeddingFetchInflightForTests();
    resetEmbeddingResolveStateForTests();
  });

  const wardrobe = [
    item({ id: 't1', category: 'Tops' }),
    item({ id: 'b1', category: 'Bottoms' }),
  ];

  it('fetches once on a cold cache and zero times when warm', async () => {
    let calls = 0;
    const fetchRecords = async (ids: string[]): Promise<ItemEmbeddingRecord[]> => {
      calls += 1;
      return wardrobe
        .filter((entry) => ids.includes(entry.id))
        .map((entry, index) => recordFor(entry, [index + 1, 0, 0]));
    };

    const cold = await resolveItemEmbeddings(wardrobe, {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(calls).toBe(1);
    expect(Object.keys(cold.embeddings)).toHaveLength(2);
    expect(cold.stats.cacheMisses).toBe(2);

    const warm = await resolveItemEmbeddings(wardrobe, {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(calls).toBe(1);
    expect(warm.stats.cacheHits).toBe(2);
    expect(warm.stats.fetchCount).toBe(0);
  });

  it('only refetches the invalidated item', async () => {
    const requested: string[][] = [];
    const fetchRecords = async (ids: string[]): Promise<ItemEmbeddingRecord[]> => {
      requested.push(ids);
      return wardrobe
        .filter((entry) => ids.includes(entry.id))
        .map((entry) => recordFor(entry, [1, 0, 0]));
    };

    await resolveItemEmbeddings(wardrobe, { fetchRecords, scheduleMissing: false, policy: POLICY });
    embeddingMemoryCache.invalidateCachedEmbedding('t1');

    await resolveItemEmbeddings(wardrobe, { fetchRecords, scheduleMissing: false, policy: POLICY });
    expect(requested).toHaveLength(2);
    expect(requested[1]).toEqual(['t1']);
  });

  it('dedupes concurrent identical resolves', async () => {
    let calls = 0;
    const fetchRecords = async (ids: string[]): Promise<ItemEmbeddingRecord[]> => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return wardrobe
        .filter((entry) => ids.includes(entry.id))
        .map((entry) => recordFor(entry, [1, 0, 0]));
    };

    const [a, b] = await Promise.all([
      resolveItemEmbeddings(wardrobe, { fetchRecords, scheduleMissing: false, policy: POLICY }),
      resolveItemEmbeddings(wardrobe, { fetchRecords, scheduleMissing: false, policy: POLICY }),
    ]);
    expect(calls).toBe(1);
    expect(a.embeddings).toEqual(b.embeddings);
  });

  it('cleans up failed in-flight fetches so a retry can run', async () => {
    let calls = 0;
    const fetchRecords = async (): Promise<ItemEmbeddingRecord[]> => {
      calls += 1;
      if (calls === 1) throw new Error('network');
      return wardrobe.map((entry) => recordFor(entry, [1, 0, 0]));
    };

    const first = await resolveItemEmbeddings(wardrobe, {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(Object.keys(first.embeddings)).toHaveLength(0);

    const second = await resolveItemEmbeddings(wardrobe, {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(calls).toBe(2);
    expect(Object.keys(second.embeddings)).toHaveLength(2);
  });

  it('batches many ids into one fetchRecords call per chunk', async () => {
    const closet = Array.from({ length: 12 }, (_, index) => item({ id: `i-${index}` }));
    let calls = 0;
    let largest = 0;
    const fetchRecords = async (ids: string[]): Promise<ItemEmbeddingRecord[]> => {
      calls += 1;
      largest = Math.max(largest, ids.length);
      return closet.filter((entry) => ids.includes(entry.id)).map((entry) => recordFor(entry, [1, 0, 0]));
    };
    await resolveItemEmbeddings(closet, { fetchRecords, scheduleMissing: false, policy: POLICY });
    expect(calls).toBe(1);
    expect(largest).toBe(12);
  });

  it('supports a partial cache hit', async () => {
    const fetchRecords = jest.fn(async (ids: string[]) =>
      wardrobe.filter((entry) => ids.includes(entry.id)).map((entry) => recordFor(entry, [1, 0, 0]))
    );
    await resolveItemEmbeddings([wardrobe[0]], {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    const result = await resolveItemEmbeddings(wardrobe, {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(fetchRecords).toHaveBeenCalledTimes(2);
    expect(fetchRecords.mock.calls[1][0]).toEqual(['b1']);
    expect(Object.keys(result.embeddings)).toHaveLength(2);
  });

  it('does not return stale vectors', async () => {
    const shirt = item({ id: 't1', colors: ['White'] });
    const stale = recordFor(shirt, [1, 0, 0]);
    stale.sourceHash = 'deadbeef';
    const result = await resolveItemEmbeddings([shirt], {
      fetchRecords: async () => [stale],
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(result.embeddings.t1).toBeUndefined();
    expect(result.stats.staleCount).toBe(1);
  });

  it('schedules missing embeddings without blocking resolve', async () => {
    const schedule = jest
      .spyOn(embeddingService, 'scheduleItemEmbedding')
      .mockImplementation(() => undefined);
    try {
      const result = await resolveItemEmbeddings(wardrobe, {
        fetchRecords: async () => [],
        scheduleMissing: true,
        policy: POLICY,
      });
      expect(result.stats.fetchCount).toBe(1);
      expect(Object.keys(result.embeddings)).toHaveLength(0);
      expect(schedule).toHaveBeenCalled();
      expect(schedule.mock.calls.length).toBeLessThanOrEqual(wardrobe.length);
    } finally {
      schedule.mockRestore();
    }
  });
});

describe('embedding fetch batching', () => {
  it('splits large id lists into bounded PostgREST chunks', () => {
    const ids = Array.from({ length: 250 }, (_, index) => `i-${index}`);
    const chunks = chunkIds(ids, EMBEDDING_FETCH_CHUNK);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
    expect(chunks.flat()).toEqual(ids);
  });
});
