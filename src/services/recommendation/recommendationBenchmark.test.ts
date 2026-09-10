import { generateRankedOutfitsDetailed } from '../outfitGenerationService';
import { getCandidateItemsByCategory } from './candidateGenerator';
import { composeOutfits } from './outfitComposer';
import { rankComposedOutfits } from './ranking/outfitRanker';
import { rerankForDiversity } from './ranking/diversityRanker';
import { largeWardrobe } from './testFixtures';
import { EMBEDDING_MODEL, EMBEDDING_VERSION } from './embeddings/embeddingConfig';
import { fingerprintClothingItem } from './embeddings/embeddingFingerprint';
import { resetEmbeddingFetchInflightForTests } from './embeddings/embeddingRepository';
import {
  resetEmbeddingResolveStateForTests,
  resolveItemEmbeddings,
} from './embeddings/resolveItemEmbeddings';
import { clearEmbeddingCache } from './embeddings/embeddingCache';
import type { ItemEmbeddingRecord } from './embeddings/embeddingTypes';

/**
 * Repeatable local-engine timings. Fail only if a 100-item closet explodes
 * past the composition budget or takes unreasonably long in Jest.
 *
 * Reproduce: `npx jest src/services/recommendation/recommendationBenchmark.test.ts --verbose`
 */
describe('recommendation benchmark', () => {
  it.each([10, 25, 50, 100, 250])('profiles n=%s', (size) => {
    const closet = largeWardrobe(size);
    const request = { occasion: 'Casual' as const };

    const candidateStarted = process.hrtime.bigint();
    const pool = getCandidateItemsByCategory(closet, request);
    const candidateMs = Number(process.hrtime.bigint() - candidateStarted) / 1e6;

    const composeStarted = process.hrtime.bigint();
    const composed = composeOutfits(pool, request);
    const composeMs = Number(process.hrtime.bigint() - composeStarted) / 1e6;

    const rankStarted = process.hrtime.bigint();
    const ranked = rankComposedOutfits(composed, request);
    const rankMs = Number(process.hrtime.bigint() - rankStarted) / 1e6;

    const diversityStarted = process.hrtime.bigint();
    const diversified = rerankForDiversity(ranked, 5);
    const diversityMs = Number(process.hrtime.bigint() - diversityStarted) / 1e6;

    const totalStarted = process.hrtime.bigint();
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 5);
    const totalMs = Number(process.hrtime.bigint() - totalStarted) / 1e6;

    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.metadata.composedCount).toBeLessThanOrEqual(80);
    expect(composed.length).toBeLessThanOrEqual(80);
    expect(diversified.outfits.length).toBeLessThanOrEqual(5);
    expect(totalMs).toBeLessThan(8000);

    console.log(
      `[recommendation:bench] n=${size} candidates=${pool.totalCandidates} composed=${composed.length} ranked=${ranked.length} candidateMs=${candidateMs.toFixed(1)} composeMs=${composeMs.toFixed(1)} rankMs=${rankMs.toFixed(1)} diversityMs=${diversityMs.toFixed(1)} totalMs=${totalMs.toFixed(1)}`
    );
  });

  it('profiles embedding cache miss vs hit', async () => {
    clearEmbeddingCache();
    resetEmbeddingFetchInflightForTests();
    resetEmbeddingResolveStateForTests();

    const closet = largeWardrobe(100);
    const policy = { model: EMBEDDING_MODEL, version: EMBEDDING_VERSION, dimensions: 3 };
    let calls = 0;
    const fetchRecords = async (ids: string[]): Promise<ItemEmbeddingRecord[]> => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return closet
        .filter((entry) => ids.includes(entry.id))
        .map((entry) => ({
          entityId: entry.id,
          entityType: 'item' as const,
          embedding: [1, 0, 0],
          model: EMBEDDING_MODEL,
          dimensions: 3,
          version: EMBEDDING_VERSION,
          sourceHash: fingerprintClothingItem(entry),
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }));
    };

    const coldStarted = process.hrtime.bigint();
    const cold = await resolveItemEmbeddings(closet, {
      fetchRecords,
      scheduleMissing: false,
      policy,
    });
    const coldMs = Number(process.hrtime.bigint() - coldStarted) / 1e6;

    const warmStarted = process.hrtime.bigint();
    const warm = await resolveItemEmbeddings(closet, {
      fetchRecords,
      scheduleMissing: false,
      policy,
    });
    const warmMs = Number(process.hrtime.bigint() - warmStarted) / 1e6;

    expect(cold.stats.fetchCount).toBe(1);
    expect(warm.stats.fetchCount).toBe(0);
    expect(calls).toBe(1);
    expect(Object.keys(cold.embeddings).length).toBe(100);
    expect(warm.stats.cacheHits).toBe(100);

    console.log(
      `[recommendation:bench:cache] n=100 coldMs=${coldMs.toFixed(1)} warmMs=${warmMs.toFixed(1)} fetchCalls=${calls} vectors=${Object.keys(cold.embeddings).length}`
    );
  });
});
