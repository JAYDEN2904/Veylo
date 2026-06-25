# Agent Learnings — Veylo

> Patterns, mistakes, and project-specific knowledge accumulated over time.

## Patterns That Work Well

<!-- Filled over time as recurring approaches are proven -->

## Mistakes & Corrections

<!-- Filled over time -->

## Project-Specific Gotchas

- **README at repo root** is the Agent OS / Cursor rules description, not Veylo’s product README. For Expo setup (EMFILE / `ulimit`), use `README_SETUP.md` and `expo-start.sh` / `npm start`.
- **Stack mismatch in rules:** `.cursor/rules/060-stack-nextjs-supabase.mdc` targets Next.js + Supabase; this project is **Expo + React Native + Zustand** with **no** Next/Supabase/Prisma in-tree — do not assume those files or patterns exist.
- **Metro:** Custom `metro.config.js` blocklists `.md`, `.sh`, lockfiles, and nested `node_modules` to reduce file watchers; development on macOS in `Downloads` may still need higher file descriptor limits (`ulimit -n 8192`).
- **Path alias:** Imports may use `@/` for `src/` per `tsconfig.json`.
- **Types vs stores:** Domain interfaces in `src/types/index.ts` may not fully match Zustand store shapes (e.g. `fetchItems` on wardrobe store not on `WardrobeState`).
- **`.ts` vs `.tsx`:** Files with JSX must use `.tsx`; otherwise `tsc` fails with misleading parse errors (see `imageCache.ts`).
- **Feature documentation:** Multiple markdown summaries (`COMPLETED_FEATURES.md`, `NEW_FEATURES_SUMMARY.md`, etc.) describe intended/completed UI work; they are not a substitute for running the app or checking stores/services for real API vs mock behavior.

## Speed Bumps

- Running `tsc` may fail early on syntax issues in a single file — fix order: structural/TS errors first, then address type drift across stores.
- No central API base URL or env file in repo — integrating a backend will require new conventions.
