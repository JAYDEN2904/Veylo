# Task Board

> Maintained by the AI agent. Updated after every task completion or discovery.

## In Progress

<!-- Active tasks — max 1-2 at a time -->

## Queued

1. **[P0] Smoke test on a real account** — sign up → scan photo → confirm `clothing_items` row + `tag-item` response → generate outfit → run try-on → inspect `outfits`, `try_on_history`, `push_tokens` via Supabase.
2. **[P1] Set Supabase Edge secrets in the dashboard** — `OPENAI_API_KEY`, `GCP_PROJECT_ID`, `GCP_LOCATION`, `GCP_SA_CLIENT_EMAIL`, `GCP_SA_PRIVATE_KEY`, `OPENWEATHER_API_KEY` (Project Settings → Edge Functions → Secrets).
3. **[P1] Enable Google + Apple providers** — Supabase Authentication → Providers; register `veylo://auth/callback` + Expo Go URI; add Google client id/secret and Apple service id/key.
4. **[P1] Try-on polling** — long-running Replicate jobs currently surface as an error; add a background poller (or `try_on_history` realtime subscription) so the user sees the result when it lands.
5. **[P1] Align `WardrobeState` type** — ensure `src/types/index.ts` stays in sync with store-only methods on `useWardrobeStore.ts`.
6. **[P2] Resolve stale TODOs in screens** — `PermissionsRequestScreen.tsx`, `ChangeItemPhotoScreen.tsx` comment "Install expo-image-picker" but `expo-image-picker` is already in `package.json` — either wire imports or update comments.
7. **[P2] Offline screen** — `src/screens/system/OfflineScreen.tsx`: `@react-native-community/netinfo` TODOs; install and wire or remove dead code paths.

## Blocked

<!-- Waiting on something. Always include the blocker. -->

## Enhancements

- Evaluate removing or adapting `.cursor/rules/060-stack-nextjs-supabase.mdc` for this Expo-only repo to reduce agent confusion.
- Consolidate feature doc markdown (`COMPLETED_FEATURES.md`, `FEATURES_COMPLETE.md`, etc.) or link them from a single product README.

## Done

- [x] Initial onboarding audit — memory files populated from codebase discovery (2026-04-03)
- [x] Backend stood up end-to-end: tables, RLS, RPCs, Edge Functions, `veylo_backend/supabase/API.md` (2026-04-20)
- [x] Frontend wired to backend per `frontend_backend_wiring_mvp` plan — scan pipeline, outfit generation, try-on, weather, push tokens, Google + Apple OAuth (2026-04-22)
- [x] Pre-push cleanup (Phase 4) — gitignore hardened, dead code/deps removed, legacy PDFs archived, README scope docs (2026-06-25)
