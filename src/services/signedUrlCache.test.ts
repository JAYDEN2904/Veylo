import { getSupabase } from './supabase';
import {
  forgetSignedUrl,
  peekSignedUrl,
  rememberSignedUrl,
  resetSignedUrlCacheForTests,
  resolveSignedUrls,
} from './signedUrlCache';

jest.mock('./supabase', () => ({
  getSupabase: jest.fn(),
}));

jest.mock('../lib/safeAsyncStorage', () => ({
  getSafeAsyncStorage: () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiRemove: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

describe('signedUrlCache', () => {
  beforeEach(() => {
    resetSignedUrlCacheForTests();
    jest.clearAllMocks();
  });

  it('reuses a remembered URL until it is close to expiry', () => {
    rememberSignedUrl('item-photos', 'u1/a.jpg', 'https://cdn.example/a?token=1');
    expect(peekSignedUrl('item-photos', 'u1/a.jpg')).toBe('https://cdn.example/a?token=1');
  });

  it('does not reuse a URL after it is forgotten', () => {
    rememberSignedUrl('item-photos', 'u1/a.jpg', 'https://cdn.example/a?token=1');
    forgetSignedUrl('item-photos', 'u1/a.jpg');
    expect(peekSignedUrl('item-photos', 'u1/a.jpg')).toBeNull();
  });

  it('batch-signs only cache misses', async () => {
    rememberSignedUrl('item-photos', 'u1/cached.jpg', 'https://cdn.example/cached');
    const createSignedUrls = jest.fn().mockResolvedValue({
      data: [{ path: 'u1/fresh.jpg', signedUrl: 'https://cdn.example/fresh' }],
      error: null,
    });
    mockGetSupabase.mockReturnValue({
      storage: { from: () => ({ createSignedUrls }) },
    } as never);

    const resolved = await resolveSignedUrls('item-photos', ['u1/cached.jpg', 'u1/fresh.jpg']);

    expect(createSignedUrls).toHaveBeenCalledWith(['u1/fresh.jpg'], 3600);
    expect(resolved.get('u1/cached.jpg')).toBe('https://cdn.example/cached');
    expect(resolved.get('u1/fresh.jpg')).toBe('https://cdn.example/fresh');
  });

  it('falls back to parallel single signs when the batch API fails', async () => {
    const createSignedUrls = jest.fn().mockResolvedValue({ data: null, error: { message: 'nope' } });
    const createSignedUrl = jest
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://cdn.example/one' }, error: null });
    mockGetSupabase.mockReturnValue({
      storage: { from: () => ({ createSignedUrls, createSignedUrl }) },
    } as never);

    const resolved = await resolveSignedUrls('item-photos', ['u1/one.jpg']);

    expect(createSignedUrl).toHaveBeenCalledWith('u1/one.jpg', 3600);
    expect(resolved.get('u1/one.jpg')).toBe('https://cdn.example/one');
  });
});
