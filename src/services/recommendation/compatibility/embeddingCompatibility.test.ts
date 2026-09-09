import { ClothingItem } from '../../../types';
import { namedColorsToHsl } from '../../../utils/hslColor';
import { cosineSimilarity } from '../../vectorSimilarity';
import { scoreOutfitCompatibility } from './compatibilityEngine';
import {
  NEUTRAL_EMBEDDING_SCORE,
  combinePreliminaryScore,
  cosineToUnitScore,
  hasItemEmbeddings,
  scoreEmbeddingPair,
  scoreItemEmbeddingAffinity,
  scoreOutfitEmbeddingCompatibility,
} from './embeddingCompatibility';

const item = (overrides: Partial<ClothingItem>): ClothingItem => {
  const colors = overrides.colors ?? ['White'];
  return {
    id: overrides.id ?? 'item',
    imageUrl: 'https://example.com/i.jpg',
    category: 'Tops',
    colors,
    colorsHsl: namedColorsToHsl(colors),
    tags: ['casual'],
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    ...overrides,
  };
};

const similarA = [1, 0, 0];
const similarB = [0.95, 0.05, 0];
const orthogonal = [0, 1, 0];

describe('embeddingCompatibility', () => {
  it('returns a neutral unused score when embeddings are missing', () => {
    const result = scoreOutfitEmbeddingCompatibility([
      item({ id: 't', category: 'Tops' }),
      item({ id: 'b', category: 'Bottoms' }),
    ]);
    expect(result.used).toBe(false);
    expect(result.score).toBe(NEUTRAL_EMBEDDING_SCORE);
  });

  it('maps cosine 1 to 100 and cosine 0 to 50', () => {
    expect(cosineToUnitScore(1)).toBe(100);
    expect(cosineToUnitScore(0)).toBe(50);
    expect(cosineToUnitScore(-1)).toBe(0);
  });

  it('scores similar vectors higher than orthogonal ones', () => {
    const embeddings = {
      t: similarA,
      close: similarB,
      far: orthogonal,
    };
    const close = scoreEmbeddingPair('t', 'close', embeddings);
    const far = scoreEmbeddingPair('t', 'far', embeddings);
    expect(close.used).toBe(true);
    expect(far.used).toBe(true);
    expect(close.score).toBeGreaterThan(far.score);
    expect(close.score).toBe(cosineToUnitScore(cosineSimilarity(similarA, similarB)));
  });

  it('does not change the Sprint 2 compatibility formula when unused', () => {
    const outfit = [
      item({ id: 't', tags: ['casual'], formalityScore: 2, colors: ['White'] }),
      item({
        id: 'b',
        category: 'Bottoms',
        tags: ['casual'],
        formalityScore: 2,
        colors: ['Blue'],
      }),
    ];
    const without = scoreOutfitCompatibility(outfit, 'Casual');
    const withEmpty = scoreOutfitCompatibility(outfit, 'Casual', {});
    expect(without.compatibility).toBe(withEmpty.compatibility);
    expect(without.embeddingsUsed).toBe(false);
    expect(withEmpty.embeddingsUsed).toBe(false);
  });

  it('can raise compatibility when pairwise embeddings are strong', () => {
    const outfit = [
      item({ id: 't', tags: ['casual'], formalityScore: 2, colors: ['White'] }),
      item({
        id: 'b',
        category: 'Bottoms',
        tags: ['casual'],
        formalityScore: 2,
        colors: ['Blue'],
      }),
    ];
    const cold = scoreOutfitCompatibility(outfit, 'Casual');
    const warm = scoreOutfitCompatibility(outfit, 'Casual', {
      t: [1, 0, 0],
      b: [1, 0, 0],
    });
    expect(warm.embeddingsUsed).toBe(true);
    expect(warm.embedding).toBe(100);
    expect(warm.compatibility).not.toBe(cold.compatibility);
  });

  it('affinity is null without must-include embeddings', () => {
    expect(
      scoreItemEmbeddingAffinity(item({ id: 't' }), { itemEmbeddings: { t: similarA } })
    ).toBeNull();
  });

  it('affinity prefers items near a must-include anchor', () => {
    const close = scoreItemEmbeddingAffinity(item({ id: 'close' }), {
      mustIncludeItemIds: ['anchor'],
      itemEmbeddings: { anchor: similarA, close: similarB, far: orthogonal },
    });
    const far = scoreItemEmbeddingAffinity(item({ id: 'far' }), {
      mustIncludeItemIds: ['anchor'],
      itemEmbeddings: { anchor: similarA, close: similarB, far: orthogonal },
    });
    expect(close).not.toBeNull();
    expect(far).not.toBeNull();
    expect(close as number).toBeGreaterThan(far as number);
  });

  it('combinePreliminaryScore is a no-op when affinity is null', () => {
    expect(combinePreliminaryScore(80, null)).toBe(80);
    expect(combinePreliminaryScore(80, 100)).toBe(85);
  });

  it('hasItemEmbeddings is false for empty maps', () => {
    expect(hasItemEmbeddings(undefined)).toBe(false);
    expect(hasItemEmbeddings({})).toBe(false);
    expect(hasItemEmbeddings({ a: [1, 0] })).toBe(true);
  });
});
