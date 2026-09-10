import { applyFeedbackToVector, emptyPreferenceVector } from '../feedback/recommendationFeedback';
import { recommendOutfits } from '../recommendationEngine';
import { realisticWardrobe, outfitSignature } from '../testFixtures';
import { EMBEDDING_MODEL, EMBEDDING_VERSION } from './embeddingConfig';
import { embeddingMemoryCache } from './embeddingCache';
import { fingerprintClothingItem } from './embeddingFingerprint';
import { resetEmbeddingFetchInflightForTests } from './embeddingRepository';
import {
  resetEmbeddingResolveStateForTests,
  resolveItemEmbeddings,
} from './resolveItemEmbeddings';
import { clearEmbeddingCache } from './embeddingCache';
import type { ItemEmbeddingRecord } from './embeddingTypes';

const POLICY = { model: EMBEDDING_MODEL, version: EMBEDDING_VERSION, dimensions: 3 };

function recordFor(
  entry: ReturnType<typeof realisticWardrobe>[number],
  vector: number[]
): ItemEmbeddingRecord {
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

describe('Sprint 4.1–4.3 integration', () => {
  beforeEach(() => {
    clearEmbeddingCache();
    resetEmbeddingFetchInflightForTests();
    resetEmbeddingResolveStateForTests();
  });

  it('resolves embeddings, ranks, diversifies, then reuses a warm cache', async () => {
    const wardrobe = realisticWardrobe();
    let calls = 0;
    const fetchRecords = async (ids: string[]): Promise<ItemEmbeddingRecord[]> => {
      calls += 1;
      return wardrobe
        .filter((entry) => ids.includes(entry.id))
        .map((entry, index) => recordFor(entry, [index + 1, 0.1, 0.2]));
    };

    const cold = await resolveItemEmbeddings(wardrobe, {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(calls).toBe(1);
    expect(Object.keys(cold.embeddings).length).toBe(wardrobe.length);

    const first = recommendOutfits(wardrobe, {
      occasion: 'Casual',
      count: 3,
      itemEmbeddings: cold.embeddings,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.metadata.diversityApplied).toBe(true);
    expect(first.recommendations.length).toBeGreaterThan(1);
    const signatures = first.recommendations.map((outfit) => outfitSignature(outfit.items));
    expect(new Set(signatures).size).toBe(signatures.length);

    const warm = await resolveItemEmbeddings(wardrobe, {
      fetchRecords,
      scheduleMissing: false,
      policy: POLICY,
    });
    expect(calls).toBe(1);
    expect(warm.stats.fetchCount).toBe(0);
    expect(warm.stats.cacheHits).toBe(wardrobe.length);
  });

  it('only refreshes the modified item after invalidation', async () => {
    const wardrobe = realisticWardrobe();
    const requested: string[][] = [];
    const fetchRecords = async (ids: string[]): Promise<ItemEmbeddingRecord[]> => {
      requested.push([...ids].sort());
      return wardrobe
        .filter((entry) => ids.includes(entry.id))
        .map((entry) => recordFor(entry, [1, 0, 0]));
    };

    await resolveItemEmbeddings(wardrobe, { fetchRecords, scheduleMissing: false, policy: POLICY });
    embeddingMemoryCache.invalidateCachedEmbedding(wardrobe[0].id);

    await resolveItemEmbeddings(wardrobe, { fetchRecords, scheduleMissing: false, policy: POLICY });
    expect(requested).toHaveLength(2);
    expect(requested[1]).toEqual([wardrobe[0].id]);
  });

  it('keeps personalization first, then diversifies alternatives', () => {
    const wardrobe = realisticWardrobe();
    const liked = wardrobe.filter((entry) =>
      ['rt-navy-tee', 'rb-navy-jeans', 'rs-white-sneakers'].includes(entry.id)
    );
    const vector = emptyPreferenceVector('2026-09-09T00:00:00.000Z');
    if (liked.length > 0) {
      applyFeedbackToVector(vector, { eventType: 'like', items: liked, occasion: 'Casual' });
      applyFeedbackToVector(vector, { eventType: 'wear', items: liked, occasion: 'Casual' });
    }

    const result = recommendOutfits(wardrobe, {
      occasion: 'Casual',
      count: 3,
      preferenceVector: vector,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendations.length).toBeGreaterThan(0);
    const first = result.recommendations[0];
    const rest = result.recommendations.slice(1);
    for (const other of rest) {
      expect(outfitSignature(other.items)).not.toBe(outfitSignature(first.items));
    }
  });
});
