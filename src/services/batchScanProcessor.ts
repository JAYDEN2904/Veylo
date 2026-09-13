export type BatchItemStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'failed';

export interface LocalBatchItem {
  clientId: string;
  localUri: string;
  queueId?: string;
  imagePath?: string;
  itemId?: string;
  status: BatchItemStatus;
  error?: string;
}

export function createBatchItems(uris: string[]): LocalBatchItem[] {
  return uris.map((uri, index) => ({
    clientId: `batch-${index}-${uri}`,
    localUri: uri,
    status: 'pending' as const,
  }));
}

export function shouldProcessBatchItem(item: LocalBatchItem): boolean {
  return item.status !== 'done';
}

export function batchProgress(items: LocalBatchItem[]): {
  doneCount: number;
  failedCount: number;
  pendingCount: number;
  total: number;
} {
  return {
    doneCount: items.filter((item) => item.status === 'done').length,
    failedCount: items.filter((item) => item.status === 'failed').length,
    pendingCount: items.filter((item) => item.status === 'pending').length,
    total: items.length,
  };
}

export interface ProcessBatchItemDeps {
  userId: string;
  isCancelled: () => boolean;
  upload: (userId: string, localUri: string, filename: string) => Promise<{ path: string }>;
  enqueue: (imagePath: string) => Promise<{ id: string } | null>;
  createItem: (input: { image_path: string; status: 'active' }) => Promise<{ id: string } | null>;
  tagItem: (input: { item_id: string; scan_queue_id?: string }) => Promise<unknown>;
}

/**
 * Process one queued photo. Retries reuse an existing wardrobe row / queue id
 * so a failed tag does not create a duplicate clothing item.
 */
export async function processBatchItem(
  item: LocalBatchItem,
  deps: ProcessBatchItemDeps
): Promise<LocalBatchItem> {
  if (item.status === 'done') return item;
  if (deps.isCancelled()) {
    return { ...item, status: 'failed', error: item.error ?? 'Cancelled' };
  }

  let next: LocalBatchItem = { ...item, error: undefined };

  try {
    if (!next.imagePath || !next.itemId) {
      next = { ...next, status: 'uploading' };
      const filename = `batch-${Date.now()}-${sanitizeId(next.clientId)}.jpg`;
      const upload = await deps.upload(deps.userId, next.localUri, filename);
      next = { ...next, imagePath: upload.path };

      if (deps.isCancelled()) {
        return { ...next, status: 'failed', error: 'Cancelled' };
      }

      if (!next.queueId) {
        const queueRow = await deps.enqueue(upload.path);
        if (!queueRow) throw new Error('Failed to queue this photo for tagging.');
        next = { ...next, queueId: queueRow.id };
      }

      if (!next.itemId) {
        const row = await deps.createItem({ image_path: upload.path, status: 'active' });
        if (!row) throw new Error('Failed to create a wardrobe item.');
        next = { ...next, itemId: row.id };
      }
    } else if (!next.queueId) {
      const queueRow = await deps.enqueue(next.imagePath);
      if (!queueRow) throw new Error('Failed to re-queue this photo for tagging.');
      next = { ...next, queueId: queueRow.id };
    }

    if (deps.isCancelled()) {
      return { ...next, status: 'failed', error: 'Cancelled' };
    }

    const itemId = next.itemId;
    if (!itemId) {
      throw new Error('Failed to create a wardrobe item.');
    }

    next = { ...next, status: 'processing', itemId };
    await deps.tagItem({
      item_id: itemId,
      scan_queue_id: next.queueId,
    });

    return { ...next, status: 'done', error: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed.';
    return { ...next, status: 'failed', error: message };
  }
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'item';
}
