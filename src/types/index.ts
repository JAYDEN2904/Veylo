// ── Onboarding Quiz Types ────────────────────────────────────────────────────

export type StyleArchetype = 'minimal' | 'bold' | 'eclectic';
export type ColourPreference = 'neutrals' | 'earth_tones' | 'brights' | 'pastels' | 'monochrome';
export type LifestyleType = 'casual' | 'professional' | 'active';
export type ClimateZone = 'tropical' | 'temperate' | 'cold' | 'arid';
export type PrimaryGoal =
  | 'wear_more'
  | 'buy_less'
  | 'look_polished'
  | 'save_time'
  | 'express_myself';

export interface OnboardingQuizAnswers {
  styleArchetype: StyleArchetype;
  colourPreference: ColourPreference;
  lifestyle: LifestyleType;
  climateZone: ClimateZone;
  categoryInclusions: string[];
  primaryGoal: PrimaryGoal;
}

// ── User Types ────────────────────────────────────────────────────────────────

export interface UserPreferences {
  marketingEmails: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  publicProfile: boolean;
}

export type StylePreference =
  | 'minimalist'
  | 'casual'
  | 'formal'
  | 'streetwear'
  | 'bohemian'
  | 'vintage';

export interface StyleProfile {
  preferences: StylePreference[];
  learnedPreferences: {
    preferredColors: string[];
    preferredCategories: string[];
    preferredBrands: string[];
    styleScore: Record<StylePreference, number>; // 0-100 score for each style
  };
  lastUpdated: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  avatarId?: string; // ID from avatar generation service
  bodyType?: BodyType;
  preferences: UserPreferences;
  styleProfile?: StyleProfile;
  location?: {
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

export type BodyType =
  | 'petite'
  | 'average'
  | 'tall'
  | 'curvy'
  | 'athletic'
  | 'plus-size'
  | 'custom';

// Auth Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
}

// Wardrobe Types
export interface ClothingItem {
  id: string;
  imageUrl: string;
  category: string;
  subCategory?: string;
  colors: string[];
  brand?: string;
  tags: string[];
  notes?: string; // Custom notes for items
  createdAt: string;
  lastWorn?: string;
  wornCount?: number;
  season?: string[];
  status: 'active' | 'archived' | 'donated';
  /**
   * Formality level assigned by the AI tagger (1 = athletic/casual,
   * 2 = casual, 3 = smart casual, 4 = formal). Used by the outfit
   * scoring engine to enforce formality-delta ≤ 1 between items.
   */
  formalityScore?: number;
}

export interface WardrobeFilters {
  color?: string;
  season?: string;
  category?: string;
}

export interface WardrobeState {
  items: ClothingItem[];
  isLoading: boolean;
  filters: WardrobeFilters;
  /** Item ids the user marked as favorites (persisted). */
  favoriteItemIds: string[];
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<ClothingItem, 'id' | 'createdAt'>) => void;
  updateItem: (id: string, updates: Partial<ClothingItem>) => void;
  deleteItem: (id: string) => void;
  getItemsByCategory: (category: string) => ClothingItem[];
  setFilter: (key: keyof WardrobeFilters, value: string | undefined) => void;
  toggleItemFavorite: (id: string) => void;
  isItemFavorite: (id: string) => boolean;
}

// Scan pipeline
export type ScannedItemStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface ScannedItem {
  id: string;
  localUri: string;
  status: ScannedItemStatus;
  confidence?: number;
  detectedTags?: string[];
}

export interface ScanState {
  queue: ScannedItem[];
  isProcessing: boolean;
  addToQueue: (uri: string) => void;
  processQueue: () => Promise<void>;
  updateScannedItem: (id: string, data: Partial<ScannedItem>) => void;
  clearQueue: () => void;
}

// Outfit Types
export interface Outfit {
  id: string;
  name: string;
  occasion?: string;
  items: ClothingItem[];
  imageUrl?: string;
  createdAt: string;
  tags?: string[];
  isFavorite?: boolean;
  favorite?: boolean; // Alias for isFavorite for backwards compatibility
  styleMatchScore?: number; // 0-100 score indicating how well it matches user's style
  weatherAppropriate?: boolean;
  feedback?: 'liked' | 'disliked' | 'worn' | null;
  /** When set by generators that consider seasonality */
  season?: string[];
  /** Heuristic fit score from outfitIntelligenceService */
  fitScore?: number;
  fitReasoning?: string[];
  difficultyScore?: number;
  difficultyLabel?: string;
  /** When generator widened filters (e.g. dropped strict occasion match) */
  usedRelaxedFilters?: boolean;
}

export type OutfitGenerationFailureReason =
  | 'empty_wardrobe'
  | 'filters_too_strict'
  | 'insufficient_categories';

export interface OutfitGenerationFailure {
  reason: OutfitGenerationFailureReason;
  message: string;
  missingCategories?: string[];
}

export type OutfitGenerationResult =
  | { ok: true; outfit: Outfit; usedRelaxedFilters: boolean }
  | { ok: false; failure: OutfitGenerationFailure };

// Avatar Generation Types
export interface AvatarGenerationRequest {
  photoUri: string;
  bodyType: BodyType;
  userId: string;
}

export interface AvatarGenerationResult {
  avatarUrl: string;
  avatarId: string;
  thumbnailUrl?: string;
}

export interface AvatarGenerationState {
  isGenerating: boolean;
  progress: number;
  error?: string;
}

// Weather Types
export interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  feelsLike: number;
  location: string;
}

export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  chanceOfRain?: number;
}

// Calendar Types
export interface OutfitEvent {
  id: string;
  date: string; // ISO date string
  outfitId?: string;
  occasion?: string;
  notes?: string;
  weather?: WeatherData;
  isRecurring?: boolean;
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly';
}

export interface OutfitCalendar {
  events: OutfitEvent[];
  outfitHistory: OutfitEvent[]; // Past events
}

// Try-On History Types
export interface TryOnHistory {
  id: string;
  sessionId: string;
  outfitId?: string;
  resultImageUri: string;
  previewImageUri?: string; // Original photo/avatar
  createdAt: string;
  items: ClothingItem[];
  rating?: number; // 1-5 stars
  notes?: string;
}

// Recommendation Types
export interface RecommendationScoreBreakdown {
  overall: number;
  styleMatch: number;
  completeness: number;
  novelty: number;
}

export interface StyleGap {
  category: string;
  reason: string;
  suggestedItems: string[];
  priority: 'high' | 'medium' | 'low';
  /** Short bullet points for UI (why this gap matters) */
  reasons?: string[];
}

export interface PurchaseRecommendation {
  id: string;
  itemDescription: string;
  category: string;
  reason: string;
  estimatedPrice?: string;
  styleMatchScore: number;
  priority: 'high' | 'medium' | 'low';
  scoreBreakdown?: RecommendationScoreBreakdown;
  /** Human-readable factors shown in recommendation cards */
  reasons?: string[];
}

export interface CompleteLookSuggestion {
  baseItem: ClothingItem;
  suggestedItems: ClothingItem[];
  reason: string;
  styleMatchScore: number;
}
