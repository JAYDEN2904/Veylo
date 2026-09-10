import { fetchEmbeddingRecords } from './embeddings/embeddingRepository';
import { parseEmbedding } from './embeddings/embeddingParse';
import type { ItemEmbeddingMap } from './types';

export { parseEmbedding } from './embeddings/embeddingParse';
export { resolveItemEmbeddings } from './embeddings/resolveItemEmbeddings';
export {
  getCachedEmbedding,
  setCachedEmbedding,
  invalidateCachedEmbedding,
  invalidateCachedEmbeddings,
  clearEmbeddingCache,
} from './embeddings/embeddingCache';

/**
 * Uncached batch read of raw vectors. Prefer resolveItemEmbeddings() so
 * freshness and session cache apply. Kept for compatibility.
 */
export async function fetchItemEmbeddings(itemIds: string[]): Promise<ItemEmbeddingMap> {
  const records = await fetchEmbeddingRecords(itemIds);
  const result: ItemEmbeddingMap = {};
  for (const record of records) {
    const vector = parseEmbedding(record.embedding);
    if (vector) result[record.entityId] = vector;
  }
  return result;
}
