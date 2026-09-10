import type { ClothingItem } from '../../../types';
import { functionsClient } from '../../functionsClient';
import { getSupabase, isSupabaseConfigured } from '../../supabase';
import {
  DEFAULT_EMBEDDING_POLICY,
  resolveEmbeddingPolicy,
  type EmbeddingPolicy,
} from './embeddingConfig';
import { setCachedEmbedding } from './embeddingCache';
import {
  buildEmbeddingInputText,
  clothingItemToSourceFields,
  fingerprintEmbeddingSource,
} from './embeddingFingerprint';
import { isEmbeddingFresh, validateEmbeddingVector } from './embeddingFreshness';
import { upsertItemEmbeddingRecord } from './embeddingRepository';
import type { ItemEmbeddingRecord } from './embeddingTypes';

export interface EmbeddingProvider {
  embed: (text: string, model: string) => Promise<number[]>;
}

export interface GenerateItemEmbeddingDeps {
  provider?: EmbeddingProvider;
  persist?: (input: { userId: string; record: ItemEmbeddingRecord }) => Promise<boolean>;
  getUserId?: () => Promise<string | null>;
  policy?: Partial<EmbeddingPolicy>;
  now?: () => string;
}

const generationInflight = new Map<string, Promise<ItemEmbeddingRecord | null>>();
let generationFailures = 0;

function logGenerationFailure(itemId: string, err: unknown): void {
  generationFailures += 1;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.warn('[embeddings] generate failed', { itemId, message });
  }
}

async function defaultProviderEmbed(text: string, model: string): Promise<number[]> {
  const requestModel = model === 'text-embedding-3-large' ? 'text-embedding-3-large' : 'text-embedding-3-small';
  const response = await functionsClient.generateEmbedding({
    text,
    model: requestModel,
  });
  if (!response.ok || !Array.isArray(response.embedding)) {
    throw new Error('embedding provider returned no vector');
  }
  return response.embedding;
}

async function defaultUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export function getEmbeddingGenerationFailureCount(): number {
  return generationFailures;
}

export function resetEmbeddingGenerationStateForTests(): void {
  generationInflight.clear();
  generationFailures = 0;
}

/**
 * Generate, validate, and persist one item embedding.
 * Never call this from recommendOutfits.
 */
export async function generateItemEmbedding(
  item: ClothingItem,
  deps: GenerateItemEmbeddingDeps = {}
): Promise<ItemEmbeddingRecord | null> {
  const policy = resolveEmbeddingPolicy(deps.policy);
  const fields = clothingItemToSourceFields(item);
  const text = buildEmbeddingInputText(fields);
  if (!text) return null;

  const provider = deps.provider ?? { embed: defaultProviderEmbed };
  let vector: number[];
  try {
    vector = await provider.embed(text, policy.model);
  } catch (err) {
    logGenerationFailure(item.id, err);
    return null;
  }

  if (!validateEmbeddingVector(vector, policy.dimensions)) {
    logGenerationFailure(item.id, new Error('invalid embedding vector'));
    return null;
  }

  const now = (deps.now ?? (() => new Date().toISOString()))();
  const record: ItemEmbeddingRecord = {
    entityId: item.id,
    entityType: 'item',
    embedding: vector,
    model: policy.model,
    dimensions: policy.dimensions,
    version: policy.version,
    sourceHash: fingerprintEmbeddingSource(fields),
    createdAt: now,
    updatedAt: now,
  };

  const persist = deps.persist ?? upsertItemEmbeddingRecord;
  const getUserId = deps.getUserId ?? defaultUserId;
  try {
    const userId = await getUserId();
    if (userId) {
      await persist({ userId, record });
    }
  } catch (err) {
    logGenerationFailure(item.id, err);
    // Vector is still usable in-session even if persist failed.
  }

  setCachedEmbedding(item.id, record, policy);
  return record;
}

/**
 * Fire-and-forget generation. Dedupes in-flight work per item.
 * Never throws to the caller.
 */
export function scheduleItemEmbedding(
  item: ClothingItem,
  deps: GenerateItemEmbeddingDeps = {}
): void {
  const policy = resolveEmbeddingPolicy(deps.policy);
  const pending = generationInflight.get(item.id);
  if (pending) return;

  const work = (async () => {
    try {
      return await generateItemEmbedding(item, { ...deps, policy });
    } catch (err) {
      logGenerationFailure(item.id, err);
      return null;
    } finally {
      generationInflight.delete(item.id);
    }
  })();

  generationInflight.set(item.id, work);
  void work;
}

export function shouldScheduleEmbedding(
  item: ClothingItem,
  existing: ItemEmbeddingRecord | null | undefined,
  policy?: Partial<EmbeddingPolicy>
): boolean {
  return !isEmbeddingFresh(item, existing, policy ?? DEFAULT_EMBEDDING_POLICY);
}
