import type { EmbeddingPolicy } from './embeddingConfig';

export type EmbeddingModel = string;
export type EmbeddingVersion = string;
export type EmbeddingEntityType = 'item';
export type EmbeddingStatus = 'fresh' | 'stale' | 'missing' | 'invalid';

export interface EmbeddingMetadata {
  model: EmbeddingModel;
  dimensions: number;
  version: EmbeddingVersion;
  sourceHash: string;
  source?: string;
  updatedAt?: string;
}

export interface ItemEmbeddingRecord {
  entityId: string;
  entityType: EmbeddingEntityType;
  embedding: number[];
  model: EmbeddingModel;
  dimensions: number;
  version: EmbeddingVersion;
  sourceHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmbeddingCacheEntry {
  itemId: string;
  record: ItemEmbeddingRecord;
  cachedAt: number;
}

export interface EmbeddingObservability {
  embeddingCacheHits: number;
  embeddingCacheMisses: number;
  embeddingFetchCount: number;
  staleEmbeddingCount: number;
  embeddingGenerationFailures: number;
}

export interface ResolveEmbeddingsStats {
  cacheHits: number;
  cacheMisses: number;
  fetchCount: number;
  staleCount: number;
  scheduledCount: number;
}

export interface ResolveEmbeddingsResult {
  embeddings: Record<string, number[]>;
  stats: ResolveEmbeddingsStats;
}

export type EmbeddingPolicyInput = Partial<EmbeddingPolicy>;
