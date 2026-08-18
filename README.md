# Calorie Counter

An offline-first PWA calorie tracker. React + Vite + TypeScript, deployed to GitHub Pages.

## Develop
- `npm install`
- `npm run dev` — local dev server
- `npm run test` — unit tests (Vitest)
- `npm run build` — production build to `dist/`

## Deploy
Push to `main`; GitHub Actions builds and deploys to Pages. In the repo settings,
set **Settings → Pages → Build and deployment → Source = GitHub Actions** once.

Live URL: https://agileaq.github.io/CalorieCounter/

## Install on iOS
Open the URL in Safari → Share → Add to Home Screen. Launches standalone and
works offline. Updates prompt in-app when a new version is deployed.

## Data & backup
All data is stored on-device (localStorage). Use **Goals → Export Backup**
periodically — device storage can be cleared by the OS.

## Predefined foods
Bundled in `src/data/predefinedFoods.json`. Same schema as custom foods; import
your own via **Goals → Import Foods** (JSON).

## Languages
Six UN languages (English, 中文, Español, Français, العربية, Русский) with an
in-app switcher on the Dashboard. Arabic renders right-to-left.
