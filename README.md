# Veylo

Smart closet mobile app (Expo / React Native): wardrobe, AI outfit ideas, calendar, try-on flows, and style insights.

## Prerequisites

- Node.js (see `.nvmrc` if present)
- iOS Simulator or Android emulator for local runs
- **Native Android builds** (`npx expo run:android`): [Android Studio](https://developer.android.com/studio) (or the SDK + command-line tools). Set **`ANDROID_HOME`** to the SDK folder and put **`platform-tools`** on your **`PATH`** so **`adb`** resolves (this fixes `Failed to resolve the Android SDK path` and `Error: spawn adb ENOENT`).

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   cp veylo_backend/supabase/functions/.env.example veylo_backend/supabase/functions/.env
   ```

   Fill in Supabase URL + anon key, optional OpenWeather and Sentry in `.env`. Edge secrets (OpenAI, GCP Vertex, etc.) go in `veylo_backend/supabase/functions/.env` — push with `npm run backend:push` secrets flow documented in [veylo_backend/README.md](./veylo_backend/README.md).

   **`ios/` and `android/` are gitignored.** Regenerate locally with `npx expo prebuild` or `npm run ios` / `npm run android` when you need native projects.

3. **Expo / Metro (file watchers)**

   On macOS, if you hit `EMFILE` / “too many open files”, raise the file descriptor limit (see previous `README_SETUP` content):

   ```bash
   ulimit -n 8192
   ```

   Or run `source setup.sh` / use `npm start` which wraps the project script.

4. **Run**

   This app uses **`expo-dev-client`** (camera, Apple Sign In, etc.). **Expo Go will not work.**

   **First time on iOS** — build and install the dev client on your simulator (one-time, ~5–15 min):

   ```bash
   npm run ios
   # or target a specific simulator:
   npm run ios -- --device "iPhone 16 Pro Max"
   ```

   **Day to day** — start Metro, then open the **Veylo** app on the simulator (not Expo Go):

   ```bash
   npm start
   ```

   If `pod install` fails with a UTF-8 / `ASCII-8BIT` error, add to `~/.zshrc`:

   ```bash
   export LANG=en_US.UTF-8
   export LC_ALL=en_US.UTF-8
   ```

   Android:

   ```bash
   npm run android
   ```

### Android (Expo Go, API 34/35 crashes, Metro)

Screenshots pointing at `DETECT_SCREEN_CAPTURE` plus `"main" has not been registered` usually mean **native startup failed**, not a bad Metro folder:

- **`app.json` Android permissions apply only after you build your own APK.** They **do not** modify the Expo Go app from Google Play.

  **Prefer a development client** so your manifest includes `DETECT_SCREEN_CAPTURE`:

  ```bash
  npm install
  npx expo run:android
  ```

  After `✔ Finished prebuild`, if you see **no Android SDK** or **`spawn adb ENOENT`**, the SDK path/`adb` are not set. Typical macOS fix (adjust the path if Android Studio shows a different SDK location):

  ```bash
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
  adb --version   # should print a version; if not, open Android Studio → SDK Manager and install Platform Tools
  ```

  Add the same `export` lines to **`~/.zshrc`** so every terminal has them.

  Then use **`npm start`** and open **Veylo (dev)** on the phone — **not Expo Go.**

  Alternatives: use the latest **official Expo Go** from the Play Store (fully updated); or temporarily use an **API 33–34** emulator.

**“Cannot connect to Metro”** — same LAN as your machine, unblock Metro in the firewall, or use tunnel / USB reverse:

```bash
npm run start:tunnel
# Physical device via USB debugging:
npm run android:reverse
npm start
```

## Scripts

| Command                   | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `npm start`               | Expo / Metro (project script `expo-start.sh`)       |
| `npm run start:tunnel`    | Start with `--tunnel` (works across networks/NAT)   |
| `npm run android:reverse` | `adb reverse` common Metro/dev ports when using USB |
| `npm run ts:check`        | TypeScript (`tsc`)                                  |
| `npm test`                | Jest unit tests                                     |
| `npm run lint`            | ESLint (`src/`, `App.tsx`)                          |
| `npm run format`          | Prettier write                                      |

Git hooks (via Husky) run `lint-staged` on commit.

## Documentation

- **[docs/Feature_Specification.pdf](./docs/Feature_Specification.pdf)** — canonical FS-01–FS-14 feature spec (thesis scope).
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — stack, folders, data flow.
- **[veylo_backend/supabase/API.md](./veylo_backend/supabase/API.md)** — Edge Functions and RPC reference.
- **[AGENT_CONTEXT.md](./AGENT_CONTEXT.md)** — project memory for automation.
- **[TASKS.md](./TASKS.md)** — task board.
- **[AGENT_LEARNINGS.md](./AGENT_LEARNINGS.md)** — patterns and fixes.
- **[docs/archive/](./docs/archive/)** — legacy Wren-era PDFs (not current scope).

Cursor rules live under `.cursor/rules/`.

## Scope: FS-01–FS-14 vs V1 extensions

The authoritative product scope is **FS-01 through FS-14** in `docs/Feature_Specification.pdf`. The codebase also includes **V1 extensions** built for demo and backend completeness — document these as future work in the thesis, not as spec gaps:

| Extension                | Location                                                                    | Notes                                                                             |
| ------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Social style feed        | `StyleFeedScreen`, `veylo_backend/supabase/functions/feed-*`                | Extends FS-07 (personal masonry feed) with follow/like/comment; kept for V1 demo. |
| Avatar generation        | `src/screens/avatar/*`, `generate-avatar` edge fn                           | Imagen-based avatars; not a numbered FS feature.                                  |
| Closet analytics         | `AnalyticsDashboardScreen`, `ClosetCompositionScreen`, `ItemTimelineScreen` | Wardrobe insights under Feed tab; related to FS-07 intelligence cards.            |
| Shopping / style gaps    | `RecommendationsScreen`, `recommendationService.ts`                         | Purchase-gap heuristics; overlaps FS-09 intent but not spec UI.                   |
| Gamification             | `gamificationService.ts`, `ProfileScreen`                                   | Badges/points; backend + profile UI.                                              |
| Embeddings / vector RPCs | `vectorSimilarity.ts`, `generate-embedding`, `recommend-items`              | Deferred ML-adjacent tooling; MVP outfit engine remains rule-based.               |

**Deferred (spec V2):** FS-14 on-body try-on has a partial implementation (`VirtualTryOnScreen`, `tryon-generate`) — acceptable as a stub per project decisions.

**Orphan screens:** Several scan/wardrobe/system screens exist on disk but are not yet registered in the navigator (reserved for future wiring — see `TASKS.md`).

## License

Private project (`"private": true` in `package.json`).
