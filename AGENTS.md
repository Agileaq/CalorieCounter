# CalorieCounter Agent Guidelines

## Commands & Verification
- **Run Tests:** `npm run test` (Vitest with jsdom)
- **Typecheck & Build:** `npm run build` (runs `tsc && vite build`)
- **Dev Server:** `npm run dev`
- **Verification Rule:** Always run `npm run test`, `npm run tsc --noEmit` (or build), and check outputs before claiming completion. Run tests and git commits **separately** (never chain test execution into git commit via `&&` or grep pipes, as exit code masking caused previous test failures to be missed).

## Architecture & State
- **Tech Stack:** React 19, TypeScript, Vite, React Router (`HashRouter` for GitHub Pages).
- **Data Store:** 100% offline-first via `localStorage` (managed in `src/lib/storage.ts` with schema migrations).
- **i18n:** 6 languages (`en`, `zh`, `es`, `fr`, `ar`, `ru`) in `src/i18n/locales/`. RTL supported for Arabic (`ar`).
- **PWA:** Enabled via `vite-plugin-pwa` with prompt registration.

## Conventions & Gotchas
- **TDD:** Write failing tests first before implementing bugfixes or features.
- **Git:** Direct push to `main` when complete; no confirmation needed.
- **NumberInput UX:** Zero-default numeric inputs use `clearOnFocus` so tapping clears the 0 rather than appending. (Inputs with `hideZero` like weight inputs stay blank).
