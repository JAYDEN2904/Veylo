export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_VERSION = '1.0.0';
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_CACHE_MAX_ITEMS = 500;
export const EMBEDDING_FETCH_CHUNK = 100;
/** Cap fire-and-forget generation kicked off during a single resolve. */
export const EMBEDDING_MAX_SCHEDULE_PER_RESOLVE = 4;

export interface EmbeddingPolicy {
  model: string;
  version: string;
  dimensions: number;
}

export const DEFAULT_EMBEDDING_POLICY: EmbeddingPolicy = {
  model: EMBEDDING_MODEL,
  version: EMBEDDING_VERSION,
  dimensions: EMBEDDING_DIMENSIONS,
};

export function resolveEmbeddingPolicy(overrides?: Partial<EmbeddingPolicy>): EmbeddingPolicy {
  return {
    model: overrides?.model ?? DEFAULT_EMBEDDING_POLICY.model,
    version: overrides?.version ?? DEFAULT_EMBEDDING_POLICY.version,
    dimensions: overrides?.dimensions ?? DEFAULT_EMBEDDING_POLICY.dimensions,
  };
}
