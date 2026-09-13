import { batchProgress, createBatchItems, processBatchItem, shouldProcessBatchItem } from './batchScanProcessor';

describe('batchScanProcessor', () => {
  it('creates pending items from uris', () => {
    const items = createBatchItems(['file://a.jpg', 'file://b.jpg']);
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.status === 'pending')).toBe(true);
    expect(items[0].clientId).not.toBe(items[1].clientId);
  });

  it('skips completed items and retries failed ones', () => {
    expect(shouldProcessBatchItem({ clientId: '1', localUri: 'a', status: 'done' })).toBe(false);
    expect(shouldProcessBatchItem({ clientId: '2', localUri: 'b', status: 'failed' })).toBe(true);
    expect(shouldProcessBatchItem({ clientId: '3', localUri: 'c', status: 'pending' })).toBe(true);
  });

  it('counts progress accurately', () => {
    const progress = batchProgress([
      { clientId: '1', localUri: 'a', status: 'done' },
      { clientId: '2', localUri: 'b', status: 'failed' },
      { clientId: '3', localUri: 'c', status: 'pending' },
    ]);
    expect(progress).toEqual({ doneCount: 1, failedCount: 1, pendingCount: 1, total: 3 });
  });

  it('reuses an existing item id on retry instead of creating another row', async () => {
    const createItem = jest.fn();
    const result = await processBatchItem(
      {
        clientId: 'retry',
        localUri: 'file://shirt.jpg',
        imagePath: 'user/shirt.jpg',
        itemId: 'item-1',
        queueId: 'queue-1',
        status: 'failed',
        error: 'Network',
      },
      {
        userId: 'user-1',
        isCancelled: () => false,
        upload: jest.fn(),
        enqueue: jest.fn(),
        createItem,
        tagItem: jest.fn().mockResolvedValue({}),
      }
    );

    expect(createItem).not.toHaveBeenCalled();
    expect(result.status).toBe('done');
    expect(result.itemId).toBe('item-1');
    expect(result.error).toBeUndefined();
  });

  it('marks a failed item without aborting later items', async () => {
    const result = await processBatchItem(
      { clientId: 'fail', localUri: 'file://x.jpg', status: 'pending' },
      {
        userId: 'user-1',
        isCancelled: () => false,
        upload: jest.fn().mockRejectedValue(new Error('Upload failed')),
        enqueue: jest.fn(),
        createItem: jest.fn(),
        tagItem: jest.fn(),
      }
    );

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Upload failed');
    expect(result.itemId).toBeUndefined();
  });

  it('preserves created item id when tagging fails so retry does not duplicate', async () => {
    const result = await processBatchItem(
      { clientId: 'tag-fail', localUri: 'file://x.jpg', status: 'pending' },
      {
        userId: 'user-1',
        isCancelled: () => false,
        upload: jest.fn().mockResolvedValue({ path: 'user/x.jpg' }),
        enqueue: jest.fn().mockResolvedValue({ id: 'queue-9' }),
        createItem: jest.fn().mockResolvedValue({ id: 'item-9' }),
        tagItem: jest.fn().mockRejectedValue(new Error('tag-item unavailable')),
      }
    );

    expect(result.status).toBe('failed');
    expect(result.itemId).toBe('item-9');
    expect(result.queueId).toBe('queue-9');
    expect(result.imagePath).toBe('user/x.jpg');
  });
});
