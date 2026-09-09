import { generateRankedOutfitsDetailed } from '../outfitGenerationService';
import { getCandidateItemsByCategory } from './candidateGenerator';
import { composeOutfits } from './outfitComposer';
import { rankComposedOutfits } from './ranking/outfitRanker';
import { largeWardrobe } from './testFixtures';

/**
 * Repeatable local-engine timings. Fail only if a 100-item closet explodes
 * past the composition budget or takes unreasonably long in Jest.
 *
 * Reproduce: `npx jest src/services/recommendation/recommendationBenchmark.test.ts --verbose`
 */
describe('recommendation benchmark', () => {
  it.each([10, 25, 50, 100])('profiles n=%s', (size) => {
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

    const totalStarted = process.hrtime.bigint();
    const detailed = generateRankedOutfitsDetailed(closet, { occasionKey: 'Casual' }, 5);
    const totalMs = Number(process.hrtime.bigint() - totalStarted) / 1e6;

    expect(detailed.ok).toBe(true);
    if (!detailed.ok) return;
    expect(detailed.metadata.composedCount).toBeLessThanOrEqual(80);
    expect(composed.length).toBeLessThanOrEqual(80);
    expect(totalMs).toBeLessThan(5000);

    console.log(
      `[recommendation:bench] n=${size} candidates=${pool.totalCandidates} composed=${composed.length} ranked=${ranked.length} candidateMs=${candidateMs.toFixed(1)} composeMs=${composeMs.toFixed(1)} rankMs=${rankMs.toFixed(1)} totalMs=${totalMs.toFixed(1)}`
    );
  });
});
