import { getSupabase, isSupabaseConfigured } from './supabase';

// -------------------------------------------------------------------
// Edge Function request/response contracts.
// Kept in sync with veylo_backend/supabase/API.md.
// -------------------------------------------------------------------

export type TagItemRequest = {
  item_id: string;
  image_path?: string;
};

export type TagItemTags = {
  category: string;
  sub_category?: string | null;
  colors: string[];
  brand_guess?: string | null;
  material_guess?: string | null;
  season: string[];
  style_tags: string[];
  confidence: number;
};

export type TagItemResponse = {
  ok: true;
  item: Record<string, unknown> & { id: string };
  tags: TagItemTags;
};

export type GenerateEmbeddingRequest = {
  text: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
};

export type GenerateEmbeddingResponse = {
  ok: true;
  embedding: number[];
  model: string;
  dimensions: number;
};

export type TryOnRequest = {
  user_image_path: string;
  user_image_bucket?: 'item-photos' | 'avatars' | 'tryon-results';
  garment_image_path: string;
  outfit_id?: string;
  session_id?: string;
};

export type TryOnRecord = {
  id: string;
  result_image_path: string;
  input_image_path: string;
  items: Array<{ image_path: string }>;
  created_at: string;
};

export type TryOnResponse =
  | { ok: true; status: 'succeeded'; record: TryOnRecord }
  | {
      ok: true;
      status: 'processing';
      prediction_id: string;
      record?: TryOnRecord;
      message: string;
    };

export type TryOnStatusRequest = {
  prediction_id: string;
};

export type TryOnStatusResponse =
  | { ok: true; status: 'succeeded'; record: TryOnRecord }
  | { ok: true; status: 'processing'; prediction_id: string; message: string; record?: TryOnRecord }
  | { ok: false; status: 'failed'; error: string; record?: TryOnRecord };

export type GenerateAvatarRequest = {
  photo_path: string;
  photo_bucket?: 'item-photos' | 'avatars';
  body_type?: string;
};

export type AvatarRecord = {
  id: string;
  user_id: string;
  provider: string;
  thumbnail_path: string | null;
  body_type: string | null;
  status: string;
  model_url: string | null;
  created_at: string;
};

export type GenerateAvatarResponse = {
  ok: true;
  avatar: AvatarRecord;
  signed_thumbnail_url: string | null;
  message?: string;
};

export type FeedListRequest = {
  scope?: 'following' | 'public';
  limit?: number;
  offset?: number;
};

export type FeedPost = {
  post_id: string;
  author_id: string;
  caption: string | null;
  image_path: string;
  image_signed_url: string | null;
  visibility: 'public' | 'followers' | 'private' | string;
  created_at: string;
  likes_count: number;
  liked_by_me: boolean;
};

export type FeedListResponse = {
  ok: true;
  posts: FeedPost[];
};

export type DeleteAccountResponse = {
  ok: true;
  deleted: { storage_objects: number };
};

export type WeatherRequest =
  | { lat: number; lon: number; units?: 'metric' | 'imperial' }
  | { city: string; units?: 'metric' | 'imperial' };

export type WeatherCurrent = {
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  location: string;
};

export type WeatherForecastDay = {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  chanceOfRain: number;
};

export type WeatherResponse = {
  ok: true;
  cached: boolean;
  weather: WeatherCurrent;
  forecast: WeatherForecastDay[];
};

export type GenerateOutfitRequest = {
  occasion?: string;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  style_preferences?: string[];
  count?: number;
  persist?: boolean;
};

export type GeneratedOutfitItem = {
  id: string;
  category: string;
  colors: string[];
  tags: string[];
  season: string[];
  worn_count: number;
  last_worn: string | null;
};

export type GeneratedOutfit = {
  id: string | null;
  name: string;
  occasion: string;
  items: GeneratedOutfitItem[];
  style_match_score: number;
  fit_score: number;
  used_relaxed_filters: boolean;
};

export type GenerateOutfitResponse = {
  ok: true;
  outfits: GeneratedOutfit[];
  reason?: 'empty_wardrobe';
};

// -------------------------------------------------------------------
// Typed wrapper
// -------------------------------------------------------------------

export class FunctionsNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured — EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY missing.'
    );
    this.name = 'FunctionsNotConfiguredError';
  }
}

export class FunctionsCallError extends Error {
  readonly fnName: string;
  readonly status?: number;
  readonly context?: unknown;

  constructor(fnName: string, message: string, opts: { status?: number; context?: unknown } = {}) {
    super(message);
    this.name = 'FunctionsCallError';
    this.fnName = fnName;
    this.status = opts.status;
    this.context = opts.context;
  }
}

async function invoke<TReq, TRes>(fnName: string, body: TReq): Promise<TRes> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new FunctionsNotConfiguredError();
  }
  const { data, error } = await supabase.functions.invoke<TRes>(fnName, {
    body: body as unknown as Record<string, unknown>,
  });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    const message = error.message || `Edge Function ${fnName} failed`;
    if (status && status !== 401) {
      console.error(`[functions:${fnName}]`, { status, message });
    }
    throw new FunctionsCallError(fnName, message, { status, context: error });
  }
  if (!data) {
    throw new FunctionsCallError(fnName, `Edge Function ${fnName} returned empty body`);
  }
  return data;
}

export const functionsClient = {
  isConfigured: isSupabaseConfigured,
  tagItem: (req: TagItemRequest) => invoke<TagItemRequest, TagItemResponse>('tag-item', req),
  generateEmbedding: (req: GenerateEmbeddingRequest) =>
    invoke<GenerateEmbeddingRequest, GenerateEmbeddingResponse>('generate-embedding', req),
  tryOn: (req: TryOnRequest) => invoke<TryOnRequest, TryOnResponse>('tryon-generate', req),
  tryOnStatus: (req: TryOnStatusRequest) =>
    invoke<TryOnStatusRequest, TryOnStatusResponse>('tryon-status', req),
  deleteAccount: () => invoke<Record<string, never>, DeleteAccountResponse>('delete-account', {}),
  weather: (req: WeatherRequest) => invoke<WeatherRequest, WeatherResponse>('weather-enrich', req),
  generateOutfits: (req: GenerateOutfitRequest) =>
    invoke<GenerateOutfitRequest, GenerateOutfitResponse>('generate-outfit-ideas', req),
  feedList: (req: FeedListRequest = {}) =>
    invoke<FeedListRequest, FeedListResponse>('feed-list', req),
  generateAvatar: (req: GenerateAvatarRequest) =>
    invoke<GenerateAvatarRequest, GenerateAvatarResponse>('generate-avatar', req),
};

export type FunctionsClient = typeof functionsClient;
