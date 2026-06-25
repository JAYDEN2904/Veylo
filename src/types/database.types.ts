/**
 * Supabase generated types placeholder for `public` schema.
 * Regenerate with Supabase CLI installed: `npm run backend:types`
 *
 * Vector columns are typed as `string` for PostgREST wire format compatibility.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          avatar_url: string | null;
          body_type: string | null;
          location: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      style_profiles: {
        Row: {
          user_id: string;
          preferences: string[];
          learned_preferences: Json;
          learned_colors: string[];
          learned_categories: string[];
          learned_brands: string[];
          style_score: Json;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['style_profiles']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['style_profiles']['Row']>;
      };
      clothing_items: {
        Row: Record<string, Json | string | number | string[] | null>;
        Insert: Record<string, Json | string | number | string[] | null | undefined>;
        Update: Record<string, Json | string | number | string[] | null | undefined>;
      };
      outfits: {
        Row: Record<string, Json | string | number | boolean | string[] | null>;
        Insert: Record<string, Json | string | number | boolean | string[] | null | undefined>;
        Update: Record<string, Json | string | number | boolean | string[] | null | undefined>;
      };
      outfit_items: {
        Row: { outfit_id: string; item_id: string; position: number };
        Insert: Database['public']['Tables']['outfit_items']['Row'];
        Update: Partial<Database['public']['Tables']['outfit_items']['Row']>;
      };
      outfit_events: {
        Row: Record<string, Json | string | boolean | null>;
        Insert: Record<string, Json | string | boolean | null | undefined>;
        Update: Record<string, Json | string | boolean | null | undefined>;
      };
      try_on_history: {
        Row: Record<string, Json | string | null>;
        Insert: Record<string, Json | string | null | undefined>;
        Update: Record<string, Json | string | null | undefined>;
      };
      scan_queue: {
        Row: Record<string, string | null>;
        Insert: Record<string, string | null | undefined>;
        Update: Record<string, string | null | undefined>;
      };
      embeddings: {
        Row: Record<string, Json | string | null>;
        Insert: Record<string, Json | string | null | undefined>;
        Update: Record<string, Json | string | null | undefined>;
      };
      push_tokens: {
        Row: Record<string, string | null>;
        Insert: Record<string, string | null | undefined>;
        Update: Record<string, string | null | undefined>;
      };
      account_deletion_requests: {
        Row: Record<string, string | null>;
        Insert: Record<string, string | null | undefined>;
        Update: Record<string, string | null | undefined>;
      };
      weather_cache: {
        Row: { cache_key: string; payload: Json; expires_at: string; created_at: string };
        Insert: Partial<Database['public']['Tables']['weather_cache']['Row']>;
        Update: Partial<Database['public']['Tables']['weather_cache']['Row']>;
      };
      api_usage: {
        Row: Record<string, Json | string | number | null>;
        Insert: Record<string, Json | string | number | null | undefined>;
        Update: Record<string, Json | string | number | null | undefined>;
      };
      avatars: {
        Row: Record<string, string | null>;
        Insert: Record<string, string | null | undefined>;
        Update: Record<string, string | null | undefined>;
      };
      collections: {
        Row: { id: string; user_id: string; name: string; created_at: string; updated_at: string };
        Insert: Partial<Database['public']['Tables']['collections']['Row']>;
        Update: Partial<Database['public']['Tables']['collections']['Row']>;
      };
      collection_items: {
        Row: { collection_id: string; item_id: string; position: number };
        Insert: Database['public']['Tables']['collection_items']['Row'];
        Update: Partial<Database['public']['Tables']['collection_items']['Row']>;
      };
      user_stats: {
        Row: {
          user_id: string;
          points: number;
          streak_days: number;
          last_active_date: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_stats']['Row']>;
        Update: Partial<Database['public']['Tables']['user_stats']['Row']>;
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          threshold_points: number | null;
        };
        Insert: Database['public']['Tables']['badges']['Row'];
        Update: Partial<Database['public']['Tables']['badges']['Row']>;
      };
      user_badges: {
        Row: { user_id: string; badge_id: string; awarded_at: string };
        Insert: Database['public']['Tables']['user_badges']['Row'];
        Update: Partial<Database['public']['Tables']['user_badges']['Row']>;
      };
      feed_posts: {
        Row: Record<string, string | null>;
        Insert: Record<string, string | null | undefined>;
        Update: Record<string, string | null | undefined>;
      };
      feed_post_items: {
        Row: { post_id: string; item_id: string };
        Insert: Database['public']['Tables']['feed_post_items']['Row'];
        Update: Partial<Database['public']['Tables']['feed_post_items']['Row']>;
      };
      feed_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: Partial<Database['public']['Tables']['feed_likes']['Row']>;
        Update: Partial<Database['public']['Tables']['feed_likes']['Row']>;
      };
      feed_comments: {
        Row: Record<string, string | null>;
        Insert: Record<string, string | null | undefined>;
        Update: Record<string, string | null | undefined>;
      };
      follows: {
        Row: { follower_id: string; followee_id: string; created_at: string };
        Insert: Database['public']['Tables']['follows']['Row'];
        Update: Partial<Database['public']['Tables']['follows']['Row']>;
      };
      notifications: {
        Row: Record<string, Json | string | null>;
        Insert: Record<string, Json | string | null | undefined>;
        Update: Record<string, Json | string | null | undefined>;
      };
      error_logs: {
        Row: Record<string, Json | string | null>;
        Insert: Record<string, Json | string | null | undefined>;
        Update: Record<string, Json | string | null | undefined>;
      };
      rate_limits: {
        Row: { cache_key: string; window_start: string; request_count: number };
        Insert: Database['public']['Tables']['rate_limits']['Row'];
        Update: Partial<Database['public']['Tables']['rate_limits']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_items: {
        Args: {
          query_embedding: string;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: Array<{ item_id: string; category: string; similarity: number }>;
      };
      wardrobe_stats: {
        Args: { target_user_id?: string | null };
        Returns: Json;
      };
      find_style_gaps: {
        Args: { target_user_id?: string | null };
        Returns: Json;
      };
      recommend_outfit: {
        Args: {
          query_embedding: string;
          occasion_filter?: string | null;
          season_filter?: string | null;
          match_count?: number | null;
        };
        Returns: Array<{ item_id: string; similarity: number; category: string }>;
      };
      style_match_score: {
        Args: { target_user_id?: string | null };
        Returns: number;
      };
      feed_for_user: {
        Args: {
          feed_scope?: string | null;
          page_limit?: number | null;
          page_offset?: number | null;
        };
        Returns: Array<{
          post_id: string;
          author_id: string;
          image_path: string;
          caption: string | null;
          visibility: string;
          created_at: string;
          likes_count: number;
          liked_by_me: boolean;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
