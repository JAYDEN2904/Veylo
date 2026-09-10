import { clothingItemPatchAffectsEmbedding } from '../../wardrobeRepository';
import { item } from '../testFixtures';
import {
  clearEmbeddingCache,
  getCachedEmbedding,
  setCachedEmbedding,
} from './embeddingCache';
import { EMBEDDING_MODEL, EMBEDDING_VERSION } from './embeddingConfig';
import {
  clothingItemToSourceFields,
  embeddingSourceChanged,
  fingerprintClothingItem,
  imageIdentityFromUrlOrPath,
} from './embeddingFingerprint';
import { embeddingFreshness, isEmbeddingFresh, validateEmbeddingVector } from './embeddingFreshness';
import {
  hasSchedulableEmbeddingSource,
  onClothingItemDeleted,
} from './embeddingLifecycle';
import { generateItemEmbedding, scheduleItemEmbedding } from './embeddingService';
import type { ItemEmbeddingRecord } from './embeddingTypes';

const TEST_POLICY = {
  model: EMBEDDING_MODEL,
  version: EMBEDDING_VERSION,
  dimensions: 3,
};

function recordFor(itemId: string, vector: number[], overrides: Partial<ItemEmbeddingRecord> = {}): ItemEmbeddingRecord {
  return {
    entityId: itemId,
    entityType: 'item',
    embedding: vector,
    model: EMBEDDING_MODEL,
    dimensions: vector.length,
    version: EMBEDDING_VERSION,
    sourceHash: fingerprintClothingItem(item({ id: itemId })),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('embedding fingerprint', () => {
  it('is stable for the same source fields', () => {
    const shirt = item({
      id: 't1',
      category: 'Tops',
      colors: ['White', 'Black'],
      tags: ['casual', 'minimal'],
      material: 'Cotton',
      pattern: 'Solid',
    });
    expect(fingerprintClothingItem(shirt)).toBe(fingerprintClothingItem({ ...shirt }));
  });

  it('changes when a relevant attribute changes', () => {
    const shirt = item({ id: 't1', colors: ['White'] });
    expect(embeddingSourceChanged(shirt, { ...shirt, colors: ['Black'] })).toBe(true);
  });

  it('changes when the image identity changes', () => {
    const shirt = item({ id: 't1', imageUrl: 'https://cdn.example/item-photos/u1/a.jpg?token=1' });
    const next = {
      ...shirt,
      imageUrl: 'https://cdn.example/item-photos/u1/b.jpg?token=2',
    };
    expect(embeddingSourceChanged(shirt, next)).toBe(true);
  });

  it('ignores signed-url tokens for the same photo', () => {
    expect(
      imageIdentityFromUrlOrPath('https://x/storage/v1/object/sign/item-photos/u1/a.jpg?token=aaa')
    ).toBe(imageIdentityFromUrlOrPath('https://x/storage/v1/object/sign/item-photos/u1/a.jpg?token=bbb'));
  });

  it('does not change for notes, wear, or brand', () => {
    const shirt = item({ id: 't1', notes: 'old', brand: 'A', wornCount: 1 });
    expect(
      embeddingSourceChanged(shirt, {
        ...shirt,
        notes: 'new',
        brand: 'B',
        wornCount: 9,
        lastWorn: '2026-09-01',
      })
    ).toBe(false);
  });

  it('serializes colors and tags order-independently', () => {
    const a = item({ id: 't1', colors: ['White', 'Black'], tags: ['casual', 'minimal'] });
    const b = item({ id: 't1', colors: ['Black', 'White'], tags: ['minimal', 'casual'] });
    expect(fingerprintClothingItem(a)).toBe(fingerprintClothingItem(b));
  });
});

describe('embedding freshness', () => {
  const shirt = item({ id: 't1', colors: ['White'] });

  it('treats a matching record as fresh', () => {
    const record = recordFor('t1', [1, 0, 0], {
      sourceHash: fingerprintClothingItem(shirt),
      dimensions: 3,
    });
    expect(isEmbeddingFresh(shirt, record, TEST_POLICY)).toBe(true);
  });

  it('is stale when the source fingerprint changes', () => {
    const record = recordFor('t1', [1, 0, 0], {
      sourceHash: fingerprintClothingItem(shirt),
      dimensions: 3,
    });
    expect(isEmbeddingFresh({ ...shirt, colors: ['Navy'] }, record, TEST_POLICY)).toBe(false);
  });

  it('is stale on model, dimension, or version mismatch', () => {
    const hash = fingerprintClothingItem(shirt);
    expect(
      embeddingFreshness(
        shirt,
        recordFor('t1', [1, 0, 0], { sourceHash: hash, dimensions: 3, model: 'other-model' }),
        TEST_POLICY
      )
    ).toBe('stale');
    expect(
      embeddingFreshness(
        shirt,
        recordFor('t1', [1, 0, 0], { sourceHash: hash, dimensions: 3 }),
        { ...TEST_POLICY, dimensions: 1536 }
      )
    ).toBe('stale');
    expect(
      embeddingFreshness(
        shirt,
        recordFor('t1', [1, 0, 0], { sourceHash: hash, dimensions: 3, version: '0.0.1' }),
        TEST_POLICY
      )
    ).toBe('stale');
  });

  it('rejects empty, NaN, and Infinity vectors', () => {
    expect(validateEmbeddingVector([], 3)).toBe(false);
    expect(validateEmbeddingVector([1, Number.NaN, 0], 3)).toBe(false);
    expect(validateEmbeddingVector([1, Number.POSITIVE_INFINITY, 0], 3)).toBe(false);
    expect(validateEmbeddingVector([1, 0, 0], 3)).toBe(true);
  });

  it('handles a missing embedding without throwing', () => {
    expect(embeddingFreshness(shirt, null, TEST_POLICY)).toBe('missing');
    expect(isEmbeddingFresh(shirt, undefined, TEST_POLICY)).toBe(false);
  });
});

describe('embedding generation', () => {
  const shirt = item({ id: 't1', colors: ['White'], tags: ['casual'] });

  it('persists model, dimensions, version, and source hash', async () => {
    const persisted: ItemEmbeddingRecord[] = [];
    const record = await generateItemEmbedding(shirt, {
      policy: TEST_POLICY,
      provider: { embed: async () => [0.2, 0.1, 0.4] },
      persist: async ({ record: next }) => {
        persisted.push(next);
        return true;
      },
      getUserId: async () => 'user-1',
    });
    expect(record?.model).toBe(EMBEDDING_MODEL);
    expect(record?.dimensions).toBe(3);
    expect(record?.version).toBe(EMBEDDING_VERSION);
    expect(record?.sourceHash).toBe(fingerprintClothingItem(shirt));
    expect(persisted).toHaveLength(1);
  });

  it('rejects invalid provider vectors', async () => {
    const record = await generateItemEmbedding(shirt, {
      policy: TEST_POLICY,
      provider: { embed: async () => [1, Number.NaN, 0] },
      persist: async () => true,
      getUserId: async () => 'user-1',
    });
    expect(record).toBeNull();
  });

  it('does not throw when generation fails', () => {
    expect(() =>
      scheduleItemEmbedding(shirt, {
        policy: TEST_POLICY,
        provider: {
          embed: async () => {
            throw new Error('provider down');
          },
        },
        persist: async () => true,
        getUserId: async () => 'user-1',
      })
    ).not.toThrow();
  });

  it('keeps item creation usable when generation fails', async () => {
    const created = { ...shirt };
    const result = await generateItemEmbedding(created, {
      policy: TEST_POLICY,
      provider: {
        embed: async () => {
          throw new Error('provider down');
        },
      },
      persist: async () => {
        throw new Error('should not persist');
      },
      getUserId: async () => 'user-1',
    });
    expect(result).toBeNull();
    expect(created.id).toBe('t1');
  });
});

describe('embedding source field selection', () => {
  it('includes category, colour, and image identity', () => {
    const fields = clothingItemToSourceFields(
      item({
        id: 't1',
        category: 'Tops',
        colors: ['White'],
        imageUrl: 'https://x/item-photos/u1/a.jpg?token=1',
      })
    );
    expect(fields.category).toBe('tops');
    expect(fields.colors).toEqual(['white']);
    expect(fields.imageIdentity).toBe('u1/a.jpg');
  });
});

describe('schedulable embedding source', () => {
  it('skips scan placeholders with unknown category and no tags', () => {
    expect(
      hasSchedulableEmbeddingSource(
        item({ id: 't1', category: 'unknown', tags: [], colors: [], subCategory: undefined })
      )
    ).toBe(false);
  });

  it('schedules when a new item already has garment attributes', () => {
    expect(hasSchedulableEmbeddingSource(item({ id: 't1', category: 'Tops', colors: ['White'] }))).toBe(
      true
    );
  });
});

describe('unrelated metadata patches', () => {
  it('does not treat notes, brand, or wear as embedding source changes', () => {
    expect(clothingItemPatchAffectsEmbedding({ notes: 'keep' })).toBe(false);
    expect(clothingItemPatchAffectsEmbedding({ brand: 'Acme' })).toBe(false);
    expect(clothingItemPatchAffectsEmbedding({ worn_count: 4 })).toBe(false);
    expect(clothingItemPatchAffectsEmbedding({ last_worn: '2026-09-01' })).toBe(false);
    expect(clothingItemPatchAffectsEmbedding({ category: 'Tops' })).toBe(true);
    expect(clothingItemPatchAffectsEmbedding({ image_path: 'u1/b.jpg' })).toBe(true);
  });
});

describe('delete invalidation', () => {
  it('drops the cached vector for the deleted item only', () => {
    clearEmbeddingCache();
    const shirt = item({ id: 't1' });
    const other = item({ id: 't2' });
    const policy = { model: EMBEDDING_MODEL, version: EMBEDDING_VERSION, dimensions: 3 };
    setCachedEmbedding(
      't1',
      {
        entityId: 't1',
        entityType: 'item',
        embedding: [1, 0, 0],
        model: EMBEDDING_MODEL,
        dimensions: 3,
        version: EMBEDDING_VERSION,
        sourceHash: fingerprintClothingItem(shirt),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      policy
    );
    setCachedEmbedding(
      't2',
      {
        entityId: 't2',
        entityType: 'item',
        embedding: [0, 1, 0],
        model: EMBEDDING_MODEL,
        dimensions: 3,
        version: EMBEDDING_VERSION,
        sourceHash: fingerprintClothingItem(other),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      policy
    );

    onClothingItemDeleted('t1');
    expect(getCachedEmbedding('t1', policy)).toBeUndefined();
    expect(getCachedEmbedding('t2', policy)?.record.embedding).toEqual([0, 1, 0]);
  });
});
