// Navigation Types
// These types define the parameter lists for each navigator

export type RootStackParamList = {
  App: undefined;
  Auth: undefined;
};

export type AppTabParamList = {
  TodayStack: undefined;
  OutfitsStack: undefined;
  ScanStack: undefined;
  FeedStack: undefined;
  ProfileStack: undefined;
};

export type TodayStackParamList = {
  Today: undefined;
  WardrobeHome: undefined;
  WardrobeSearch: undefined;
  Collections: undefined;
  CollectionDetail: { collectionId: string };
  OutfitOrganization: undefined;
  ItemDetails: { itemId: string };
};

/** @deprecated use TodayStackParamList — kept as alias during migration. */
export type WardrobeStackParamList = TodayStackParamList;

export type ScanStackParamList = {
  LiveCameraScan: undefined;
  ScanProcessing: { imageUri?: string } | undefined;
  TagReview:
    | { itemId?: string; imageUri?: string; aiConfidence?: number; aiCategory?: string }
    | undefined;
  BatchSummary: undefined;
  SaveItemConfirmation:
    | { itemId?: string; imageUri?: string; category?: string; brand?: string; tags?: string[] }
    | undefined;
  ScanFailure: { error?: string } | undefined;
};

export type OutfitStackParamList = {
  OutfitHome: undefined;
};

export type FeedStackParamList = {
  StyleFeed: undefined;
  ClosetInsights: undefined;
  Recommendations: undefined;
  ClosetComposition: undefined;
  ItemTimeline: undefined;
};

/** @deprecated Use FeedStackParamList — alias kept for incremental migration */
export type AnalyticsStackParamList = FeedStackParamList;

export type ProfileStackParamList = {
  Profile: undefined;
  AppPreferences: undefined;
  NotificationSettings: undefined;
  PrivacyPermissions: undefined;
  HelpCenter: undefined;
  About: undefined;
  TermsPrivacy: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  StyleQuiz: undefined;
  StyleDnaReveal: { answers?: Record<string, unknown> } | undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  EmailVerification: { email?: string } | undefined;
  Permissions: undefined;
};

/** Root stack above tab navigator (modal/full-screen flows). */
export type AppRootStackParamList = {
  MainTabs: undefined;
  GenerateOutfitFlow: undefined;
  CreateOutfit: undefined;
  OutfitLoading: undefined;
  OutfitResult: { outfitId?: string };
  AvatarPreview: { outfitId?: string };
  VirtualTryOn: { outfitId?: string };
  TryOnProcessing: undefined;
  TryOnResult: undefined;
  TryOnHistory: undefined;
  AvatarGeneration: undefined;
  AvatarProcessing: { photoUri: string; bodyType: string };
  AvatarResult: { avatarUrl: string; avatarId: string };
  CalendarHome: undefined;
  CalendarEventCreate: { outfitId?: string };
  CalendarDay: { date: string };
  CalendarEventDetail: { eventId: string };
  CalendarHistory: undefined;
  CalendarRecurring: undefined;
  CalendarOutfitSelect: { onSelect: (outfitId: string) => void };
  ItemDetails: { itemId?: string; id?: string };
  EditItem: { id: string };
  ChangeItemPhoto: { id: string };
  OutfitFavorites: undefined;
};
