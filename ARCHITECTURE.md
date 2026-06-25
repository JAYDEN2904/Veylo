# Veylo — Architecture

## Stack

- **Runtime:** Expo SDK 50, React Native 0.73, TypeScript (strict).
- **Navigation:** `@react-navigation` — root stack for modal flows (outfits, calendar, try-on, item details), bottom tabs for main app areas.
- **State:** Zustand with `persist` + AsyncStorage (`src/lib/zustandStorage.ts`); auth session tokens in `expo-secure-store` (`src/services/sessionTokenStore.ts`).
- **Styling:** NativeWind / Tailwind classNames + shared `theme` (`src/theme/`, `src/store/useThemeStore.ts`).
- **Media:** `expo-image` for remote images; legacy theme colors extended in `src/theme/types.ts`.
- **Errors / observability:** `react-error-boundary` + `RootErrorFallback`; `sentry-expo` when `EXPO_PUBLIC_SENTRY_DSN` is set (`src/instrument/sentry.ts`).
- **Network:** `NetworkGate` + `OfflineScreen` via `@react-native-community/netinfo`.

## Directory map

| Path                                 | Role                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `App.tsx`                            | Root: QueryClient if present, error boundary, Sentry init, navigation container.                      |
| `src/navigation/`                    | `AppNavigator`, `AuthNavigator`, param lists (`types.ts`), composite screen props (`screenProps.ts`). |
| `src/screens/`                       | Feature screens (auth, wardrobe, scan, outfit, calendar, try-on, settings, system).                   |
| `src/store/`                         | Zustand stores (wardrobe, outfit, auth, calendar, theme, etc.).                                       |
| `src/services/`                      | API façade, weather, notifications, avatar, outfit generation, **Supabase client** (when wired).      |
| `src/components/`                    | Shared UI (`common.tsx`, cards, empty states, error fallback).                                        |
| `veylo_backend/supabase/migrations/` | Postgres schema + RLS (checked in; apply via Supabase CLI or dashboard).                              |

## Data flow (target)

1. **Supabase Auth** → session in secure storage; profile row in `profiles`.
2. **TanStack Query** → server state (wardrobe, outfits, events); Zustand for UI-only / optimistic pieces.
3. **Storage buckets** → `item-photos`, `avatars`, `tryon-results`; clients use signed URLs.

## Agent / ops docs

- `AGENT_CONTEXT.md` — session memory and decisions.
- `TASKS.md` — task board.
- `AGENT_LEARNINGS.md` — patterns and corrections.

## Performance targets (launch)

- App interactive under ~2s on mid-tier devices after splash.
- Wardrobe grid: prefer fixed tile heights + `getItemLayout` where lists are tall.
- Scan → saved item: depends on Edge vision latency; queue retries belong in `useScanStore`.
