import { EMBEDDING_CACHE_MAX_ITEMS, resolveEmbeddingPolicy, type EmbeddingPolicy } from './embeddingConfig';
import type { EmbeddingCacheEntry, ItemEmbeddingRecord } from './embeddingTypes';

export function embeddingCacheKey(
  itemId: string,
  model: string,
  version: string
): string {
  return `${itemId}::${model}::${version}`;
}

/**
 * Bounded in-memory LRU. Session-scoped; not persisted.
 */
export class EmbeddingMemoryCache {
  private readonly entries = new Map<string, EmbeddingCacheEntry>();

  constructor(private readonly maxItems: number = EMBEDDING_CACHE_MAX_ITEMS) {}

  size(): number {
    return this.entries.size;
  }

  getCachedEmbedding(
    itemId: string,
    policy?: Partial<EmbeddingPolicy>
  ): EmbeddingCacheEntry | undefined {
    const resolved = resolveEmbeddingPolicy(policy);
    const key = embeddingCacheKey(itemId, resolved.model, resolved.version);
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  setCachedEmbedding(
    itemId: string,
    record: ItemEmbeddingRecord,
    policy?: Partial<EmbeddingPolicy>
  ): void {
    const resolved = resolveEmbeddingPolicy(policy);
    const key = embeddingCacheKey(itemId, resolved.model, resolved.version);
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, { itemId, record, cachedAt: Date.now() });
    this.evictIfNeeded();
  }

  invalidateCachedEmbedding(itemId: string): void {
    const prefix = `${itemId}::`;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  invalidateCachedEmbeddings(itemIds: string[]): void {
    for (const itemId of itemIds) {
      this.invalidateCachedEmbedding(itemId);
    }
  }

  clearEmbeddingCache(): void {
    this.entries.clear();
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.maxItems) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest !== 'string') break;
      this.entries.delete(oldest);
    }
  }
}

export const embeddingMemoryCache = new EmbeddingMemoryCache();

export function getCachedEmbedding(
  itemId: string,
  policy?: Partial<EmbeddingPolicy>
): EmbeddingCacheEntry | undefined {
  return embeddingMemoryCache.getCachedEmbedding(itemId, policy);
}

export function setCachedEmbedding(
  itemId: string,
  record: ItemEmbeddingRecord,
  policy?: Partial<EmbeddingPolicy>
): void {
  embeddingMemoryCache.setCachedEmbedding(itemId, record, policy);
}

export function invalidateCachedEmbedding(itemId: string): void {
  embeddingMemoryCache.invalidateCachedEmbedding(itemId);
}

export function invalidateCachedEmbeddings(itemIds: string[]): void {
  embeddingMemoryCache.invalidateCachedEmbeddings(itemIds);
}

export function clearEmbeddingCache(): void {
  embeddingMemoryCache.clearEmbeddingCache();
}
