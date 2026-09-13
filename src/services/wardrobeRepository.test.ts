import { fetchWardrobeItemsRemote } from './wardrobeRepository';
import { resolveSignedUrls } from './signedUrlCache';
import { getSupabase, isSupabaseConfigured } from './supabase';

jest.mock('./supabase', () => ({
  getSupabase: jest.fn(),
  isSupabaseConfigured: jest.fn(),
}));

jest.mock('./signedUrlCache', () => ({
  resolveSignedUrls: jest.fn(),
  forgetSignedUrl: jest.fn(),
}));

jest.mock('./recommendation/embeddings/embeddingLifecycle', () => ({
  onClothingItemDeleted: jest.fn(),
  onClothingRowCreated: jest.fn(),
  onEmbeddingSourceChanged: jest.fn(),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockConfigured = isSupabaseConfigured as jest.MockedFunction<typeof isSupabaseConfigured>;
const mockResolve = resolveSignedUrls as jest.MockedFunction<typeof resolveSignedUrls>;
describe('fetchWardrobeItemsRemote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigured.mockReturnValue(true);
  });

  it('signs full and thumb paths in one batch', async () => {
    mockGetSupabase.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-1' } } },
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-1',
                  user_id: 'user-1',
                  image_path: 'user-1/shirt.jpg',
                  category: 'Tops',
                  sub_category: null,
                  colors: ['black'],
                  colors_hsl: null,
                  brand: null,
                  tags: [],
                  notes: null,
                  season: [],
                  status: 'active',
                  worn_count: 0,
                  last_worn: null,
                  created_at: '2026-09-13T00:00:00.000Z',
                  formality_score: null,
                  material: null,
                  pattern: null,
                  gender_affinity: null,
                  occasion_tags: [],
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    mockResolve.mockResolvedValue(
      new Map([
        ['user-1/shirt.jpg', 'https://cdn.example/shirt?token=full'],
        ['user-1/shirt_thumb.jpg', 'https://cdn.example/shirt_thumb?token=thumb'],
      ])
    );
    const items = await fetchWardrobeItemsRemote();

    expect(mockResolve).toHaveBeenCalledWith('item-photos', [
      'user-1/shirt.jpg',
      'user-1/shirt_thumb.jpg',
    ]);
    expect(items).toHaveLength(1);
    expect(items?.[0]).toMatchObject({
      id: 'item-1',
      imagePath: 'user-1/shirt.jpg',
      imageUrl: 'https://cdn.example/shirt?token=full',
      thumbnailUrl: 'https://cdn.example/shirt_thumb?token=thumb',
    });
  });
});
