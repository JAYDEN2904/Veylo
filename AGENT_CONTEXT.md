# Agent Context — Veylo

## Project

**Name:** Veylo  
**Type:** Expo / React Native smart closet app  
**Status:** Client hardened; Supabase schema + client wiring in-repo; production deploy TBD

## Stack

- **Framework:** Expo SDK ~49, React 18.2, RN 0.72, TypeScript strict
- **Navigation:** React Navigation 6 — root stack + tabs (`src/navigation/`)
- **State:** Zustand + persist (AsyncStorage); auth token also in SecureStore helpers
- **Backend:** Supabase optional — `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`; migrations under `veylo_backend/supabase/migrations/`
- **Server state:** TanStack Query (`AppProviders` in `App.tsx`)
- **Observability:** `sentry-expo` (DSN optional)
- **Tooling:** ESLint 9 flat config, Prettier, Husky + lint-staged, CI workflow `.github/workflows/ci.yml`

## Key Decisions

- Supabase Auth + `profiles` trigger for new users; RLS owner-only on app tables; private Storage buckets with path prefix `auth.uid()`.
- Wardrobe: `fetchWardrobeItemsRemote()` when Supabase configured; else mock seed in store.
- Edge Functions live under `veylo_backend/supabase/functions/` (Deno; excluded from app `tsc`).

## Known Issues / Deferred

- [ ] Frontend should call `tryon-status` (or subscribe to `try_on_history` realtime) when `tryon-generate` returns `processing`.
- [ ] Expo SDK upgrade + EAS dev client (see `eas.json` placeholder).
- [ ] OAuth redirect URIs must be registered in the Supabase dashboard and in the Google / Apple developer consoles (scheme `veylo://auth/callback`).

## Backend (live)

- **Project ref:** `igeyjmcfklymyeaahmtw` — `https://igeyjmcfklymyeaahmtw.supabase.co` (eu-west-1)
- **Migrations applied (hosted):** baseline `initial_schema`, `rls_policies`, `backend_extras`; apply newer SQL via `npm run backend:push` after review (social/gamification/notifications/cron bootstrap).
- **Tables (baseline + new in migrations):** profiles, style_profiles, clothing_items, outfits, outfit_items, outfit_events, try_on_history, scan_queue, embeddings, push_tokens, account_deletion_requests, weather_cache, api_usage, avatars, collections, collection_items, user_stats, badges, user_badges, feed_posts, feed_post_items, feed_likes, feed_comments, follows, notifications, error_logs, rate_limits
- **Migrations in-repo:** `veylo_backend/supabase/migrations/` — includes social feed, gamification, notifications, try-on polling fields, pgvector RPC additions, optional pg_cron extension bootstrap.
- **RPCs:** `match_items`, `wardrobe_stats`, `find_style_gaps`, `recommend_outfit`, `style_match_score`, `feed_for_user`.
- **Edge Functions (JWT unless noted):** `tag-item`, `generate-embedding`, `tryon-generate`, `tryon-status`, `delete-account`, `weather-enrich`, `generate-outfit-ideas`, `recommend-items`, `style-chat`, `generate-avatar`, `moderate-image`, `feed-create-post`, `feed-list`, `feed-toggle-like`, `feed-add-comment`, `feed-follow`, `notifications-send` (service-role JWT), `digest-weekly` (cron secret, verify_jwt off), `gamification-events`, `embeddings-backfill` (cron secret, verify_jwt off).
- **Shared helpers:** `veylo_backend/supabase/functions/_shared/` (`cors`, `auth`, `internalAuth`, `supabase`, `usage`, `openai`, `gpt`, `replicate`, `expoPush`, `rateLimit`, `sentry`, `moderation`).
- **Docs:** `veylo_backend/supabase/API.md` (full request/response spec + curl smoke-test recipe)

## Pending manual steps

- Set Edge Function secrets: `OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, `OPENWEATHER_API_KEY`, `READY_PLAYER_ME_API_KEY`, `CRON_SECRET` (for cron HTTP callers), optional `SENTRY_EDGE_DSN`, `EXPO_ACCESS_TOKEN`.
- Enable Google + Apple OAuth providers in the Supabase dashboard; add `veylo://auth/callback` + the Expo Go URI as authorised redirects.
- Register the `veylo` scheme with Google Cloud (OAuth client) and Apple developer portal (Service ID + Sign in with Apple key).

## Known Limitations

- **Background removal (A5):** The `tag-item` edge function sends raw photos to GPT-4o with no background-removal step. The Virtual Try-On flat-lay (FS-10) therefore uses raw photos rather than isolated garment PNGs. Fix requires adding a `remove.bg` or OpenAI image-edit call in `veylo_backend/supabase/functions/tag-item/index.ts` before `tagGarment()`, storing the cleaned PNG path, and referencing it in the try-on pipeline. Noted in the edge function with a `KNOWN LIMITATION` comment.

## Last Session

**Date:** 2026-05-07  
**What was done (Expo / simulator):** PostHog removed from the app (npm packages, root navigator wrapper, Metro `@posthog/core` resolver, Hermes `TextEncoder` polyfill import). Zustand `createJSONStorage` falls back to in-memory storage if AsyncStorage APIs are missing. Tailwind `fontFamily` uses `System` only; Ionicons use `flash` / `flash-outline` instead of v6-only `sparkles` names. `npm run ts:check` passes.  
**Earlier same day:** Supabase backend expanded under `veylo_backend/`: moved workspace from root `supabase/`; added migrations (social feed + `feed-photos` bucket, gamification, notifications, collections, avatars, try-on polling columns + realtime, style_profile columns, observability tables, RPCs `recommend_outfit` / `style_match_score` / `feed_for_user`, pg_cron/pg_net bootstrap, `user_stats` update policy); new Edge Functions (`tryon-status`, `recommend-items`, `style-chat`, `generate-avatar`, feed suite, `moderate-image`, `notifications-send`, `digest-weekly`, `gamification-events`, `embeddings-backfill`); shared helpers (`gpt`, `replicate`, `expoPush`, `rateLimit`, `sentry`, `moderation`, `internalAuth`); `tryon-generate` writes pending rows; docs (`API.md`, `veylo_backend/README.md`), npm scripts, `.env.example`, `src/types/database.types.ts` scaffold, `metro.config.js` blocklist, `veylo_backend/scripts/smoke.sh`.  
**What's next:** `npm run backend:push` + `npm run backend:fns:deploy`; wire Expo `functionsClient` to new endpoints; regenerate types with CLI when available.

### 2026-04-22 — Frontend wiring milestone

Summary of the earlier client/backend wiring pass:

- Added a typed `src/services/functionsClient.ts` wrapper around all six Edge Functions.
- Replaced the mock scan pipeline: `ScanProcessingScreen` now uploads to `item-photos`, inserts into `clothing_items`, invokes `tag-item`, and routes to the new `ScanFailureScreen` on error. `TagReviewScreen` hydrates from the row and persists edits; `SaveItemConfirmationScreen` refreshes the wardrobe from Supabase.
- `useOutfitStore` now calls `generate-outfit-ideas` and upserts favourites/saves into `outfits` + `outfit_items`.
- `useTryOnStore` calls `tryon-generate`, resolves the result via a signed URL from `tryon-results`, and the Unsplash mock is gone. `TryOnHistoryScreen` fetches real rows from `try_on_history`.
- `weatherService` prefers the `weather-enrich` Edge Function, with a direct-API + mock fallback chain.
- `notificationService.registerForPushNotifications` upserts Expo push tokens into `push_tokens`; it runs automatically after email, Google, and Apple sign-in.
- Added `expo-auth-session` + `expo-web-browser` + `expo-apple-authentication` + `expo-crypto` + `expo-device`; implemented `signInWithGoogle` / `signInWithApple` in `authService`; wired the social buttons on `LoginScreen` / `SignupScreen`; created a minimal `app.json` with scheme `veylo`.
  **What's next:** Dashboard config (Edge secrets, OAuth provider credentials, redirect URIs) + a physical-device smoke test (sign up → scan → tag → outfit → try-on → history).
