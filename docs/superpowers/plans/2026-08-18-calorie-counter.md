# Calorie Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first PWA calorie tracker deployed to GitHub Pages, installable on iOS, with local storage, importable food metadata, calendar history, and 6-language i18n.

**Architecture:** React 18 + Vite + TypeScript SPA using HashRouter. All user data in localStorage behind a versioned storage layer with migrations. Predefined foods bundled as read-only JSON; custom foods and daily logs live on-device. Pure-function core (nutrition math, date logic, import/export) is TDD'd first, then UI is layered on top. vite-plugin-pwa provides offline caching and prompt-based updates.

**Tech Stack:** React 18, Vite, TypeScript, react-router (HashRouter), vite-plugin-pwa, react-i18next + i18next, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-18-calorie-counter-design.md`

## Global Constraints

- **Base path:** `base: '/CalorieCounter/'` in `vite.config.ts` — all asset paths resolve under this subpath.
- **Routing:** HashRouter only (GitHub Pages has no history-API rewrite).
- **Storage keys:** `cc.days`, `cc.myFoods`, `cc.settings`, `cc.schemaVersion` — exact strings, never rename without a migration.
- **Default language:** `en`. Supported: `en`, `zh`, `es`, `fr`, `ar`, `ru`. `en` is the i18next fallback.
- **Calories required:** every `Nutrition` object must have `calories`; all other nutrition fields default to `0`.
- **Nutrition basis:** stored for the PRIMARY serving; scale by `quantity / primaryServing.amount`.
- **Snapshots:** every `LogEntry` stores a full `foodSnapshot` — never reference a live food by id.
- **Predefined foods are read-only:** editing one clones it into My Foods with `source: 'custom'`.
- **Update mode:** `vite-plugin-pwa` `registerType: 'prompt'`.
- **Security:** never write the GitHub PAT into any tracked file. CI deploys via `GITHUB_TOKEN`/Pages OIDC, not the PAT.
- **Node:** use Node 20+ (Vite 5 requirement).

---

### Task 1: Scaffold project + PWA + deploy pipeline

Goal: a live, installable "hello world" at the GitHub Pages URL, proving the base path, HashRouter, PWA install, and CI deploy all work before any features exist.

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `public/manifest.webmanifest`, `public/icons/` (192, 512, maskable, apple-touch-icon)
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working Vite+React+TS app; `__APP_VERSION__`, `__GIT_SHA__`, `__BUILD_TIME__` global constants defined via `vite.config.ts` `define`; a `<HashRouter>`-wrapped `App`.

- [ ] **Step 1: Initialize package.json and install deps**

Run:
```bash
npm init -y
npm pkg set version="0.1.0" name="calorie-counter" private=true type="module"
npm pkg set scripts.dev="vite" scripts.build="tsc && vite build" scripts.preview="vite preview" scripts.test="vitest run" scripts.test:watch="vitest"
npm install react react-dom react-router-dom i18next react-i18next
npm install -D vite @vitejs/plugin-react typescript vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/react @types/react-dom
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create vite.config.ts with base path, PWA, build defines, and Vitest config**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

function gitSha(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}

export default defineConfig({
  base: '/CalorieCounter/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? gitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Calorie Counter',
        short_name: 'Calories',
        start_url: '/CalorieCounter/',
        scope: '/CalorieCounter/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#d2691e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 5: Create src/vite-env.d.ts declaring the build-time globals**

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
declare const __GIT_SHA__: string
declare const __BUILD_TIME__: string
```

- [ ] **Step 6: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="apple-touch-icon" href="/CalorieCounter/icons/apple-touch-icon.png" />
    <title>Calorie Counter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create placeholder PWA icons**

Generate solid-color PNG placeholders (replace with designed icons later). Run:
```bash
mkdir -p public/icons
# Use any 192/512 PNGs; if ImageMagick is available:
command -v magick >/dev/null && {
  magick -size 192x192 xc:'#d2691e' public/icons/icon-192.png
  magick -size 512x512 xc:'#d2691e' public/icons/icon-512.png
  magick -size 512x512 xc:'#d2691e' public/icons/maskable-512.png
  magick -size 180x180 xc:'#d2691e' public/icons/apple-touch-icon.png
} || echo "MANUAL: add 4 PNG placeholders to public/icons/ (icon-192, icon-512, maskable-512, apple-touch-icon)"
```
If ImageMagick is not present, create the four PNGs by any means (even 1x1 upscaled) — they are placeholders.

- [ ] **Step 8: Create src/App.tsx (hello world with build info)**

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          <main style={{ padding: 16, fontFamily: 'system-ui' }}>
            <h1>Calorie Counter</h1>
            <p>v{__APP_VERSION__} · {__GIT_SHA__} · {__BUILD_TIME__}</p>
          </main>
        } />
      </Routes>
    </HashRouter>
  )
}
```

- [ ] **Step 9: Create src/main.tsx with SW registration**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 10: Create .gitignore**

```
node_modules
dist
dist-ssr
*.local
.DS_Store
.vscode/*
!.vscode/extensions.json
```

- [ ] **Step 11: Run the dev server and verify it renders**

Run: `npm run dev`
Expected: dev server starts; opening the printed URL shows "Calorie Counter" and a version line. Stop with Ctrl-C.

- [ ] **Step 12: Run the production build**

Run: `npm run build`
Expected: `tsc` passes, `vite build` writes `dist/` including `sw.js`/`workbox-*.js` and `manifest.webmanifest`. No errors.

- [ ] **Step 13: Create .github/workflows/deploy.yml**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          GIT_SHA: ${{ github.sha }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React+TS PWA with base path and Pages deploy"
```

Note: The GIT_SHA env in CI is the full sha; the local `gitSha()` fallback uses short. Both are acceptable for the build badge.

---

### Task 2: Domain types

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Food`, `Serving`, `ServingKind`, `Nutrition`, `FatBreakdown`, `CarbBreakdown`, `Vitamins`, `Minerals`, `DayLog`, `MealKey`, `LogEntry`, `ExerciseEntry`, `Settings`, `Language`, `MealMap`. These types are consumed by nearly every later task.

- [ ] **Step 1: Create src/types.ts**

```ts
export type ServingKind = 'weight' | 'volume' | 'amount'

export interface Serving {
  id: string
  kind: ServingKind
  label: string      // "Grams", "Serving", "mL"
  amount: number     // e.g. 100
  unit: string       // "g", "mL", "item"
  isPrimary: boolean
}

export interface FatBreakdown { total: number; mono: number; poly: number; saturated: number; trans: number }
export interface CarbBreakdown { total: number; fiber: number; sugar: number }
export interface Vitamins { a: number; c: number; b1: number; b2: number; b3: number; b9: number; b6: number; b12: number }
export interface Minerals { calcium: number; iron: number; magnesium: number; phosphorus: number; potassium: number; zinc: number }

export interface Nutrition {
  calories: number
  fat: FatBreakdown
  cholesterol: number
  sodium: number
  carbs: CarbBreakdown
  protein: number
  vitamins: Vitamins
  minerals: Minerals
  caffeine: number
}

export type FoodSource = 'predefined' | 'custom'

export interface Food {
  id: string
  name: string
  brand?: string
  icon: string          // native emoji, default "🍽️"
  servings: Serving[]   // >=1, exactly one isPrimary
  nutrition: Nutrition  // expressed for the primary serving
  source: FoodSource
  createdAt: string     // ISO
}

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export interface LogEntry {
  id: string
  foodSnapshot: Food
  servingId: string
  quantity: number
}

export interface ExerciseEntry { id: string; name: string; caloriesBurned: number }

export type MealMap = Record<MealKey, LogEntry[]>

export interface DayLog {
  date: string          // "YYYY-MM-DD"
  meals: MealMap
  exercise: ExerciseEntry[]
}

export type Language = 'en' | 'zh' | 'es' | 'fr' | 'ar' | 'ru'

export interface Settings {
  dailyBudget: number
  macroTargets: { protein: number; fiber: number }
  language: Language
}

export const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snacks']
export const LANGUAGES: Language[] = ['en', 'zh', 'es', 'fr', 'ar', 'ru']
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add domain types"
```

---

### Task 3: Test setup file

**Files:**
- Create: `src/test/setup.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: jsdom + jest-dom matchers wired for all Vitest runs; a clean localStorage between tests.

- [ ] **Step 1: Create src/test/setup.ts**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
```

- [ ] **Step 2: Verify Vitest runs with zero tests**

Run: `npx vitest run`
Expected: exits cleanly with "no test files found" (or 0 tests). No config errors.

- [ ] **Step 3: Commit**

```bash
git add src/test/setup.ts
git commit -m "test: add Vitest setup"
```

---

### Task 4: Date utilities (TDD)

**Files:**
- Create: `src/lib/date.ts`
- Test: `src/lib/date.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `toDateKey(d: Date): string` → `"YYYY-MM-DD"` in local time.
  - `fromDateKey(key: string): Date` → local midnight for that key.
  - `addDays(key: string, n: number): string`
  - `todayKey(): string`
  - `formatHeader(key: string, locale: string): string` → e.g. "Tue, Aug 18".
  - `monthGrid(year: number, month0: number): string[][]` → array of weeks (Mon-first), each a 7-length array of date keys (including leading/trailing days from adjacent months).
  - `weekOf(key: string): string[]` → the 7 date keys (Mon-first) containing `key`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { toDateKey, fromDateKey, addDays, monthGrid, weekOf } from './date'

describe('date utils', () => {
  it('toDateKey formats local date', () => {
    expect(toDateKey(new Date(2026, 7, 18))).toBe('2026-08-18')
  })
  it('fromDateKey round-trips', () => {
    expect(toDateKey(fromDateKey('2026-08-18'))).toBe('2026-08-18')
  })
  it('addDays crosses month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31')
  })
  it('monthGrid for Aug 2026 is Mon-first and 6 weeks', () => {
    const grid = monthGrid(2026, 7)
    expect(grid[0][0]).toBe('2026-07-27') // Mon before Aug 1 (Sat)
    expect(grid.flat()).toContain('2026-08-18')
    expect(grid[grid.length - 1]).toHaveLength(7)
  })
  it('weekOf returns Mon..Sun containing the date', () => {
    const w = weekOf('2026-08-18') // Tue
    expect(w).toHaveLength(7)
    expect(w[0]).toBe('2026-08-17') // Mon
    expect(w[6]).toBe('2026-08-23') // Sun
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/date.test.ts`
Expected: FAIL — module/functions not found.

- [ ] **Step 3: Implement src/lib/date.ts**

```ts
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function formatHeader(key: string, locale: string): string {
  return fromDateKey(key).toLocaleDateString(locale, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// Monday = 0 offset
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function weekOf(key: string): string[] {
  const d = fromDateKey(key)
  const monday = addDays(key, -mondayIndex(d))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function monthGrid(year: number, month0: number): string[][] {
  const first = new Date(year, month0, 1)
  const start = addDays(toDateKey(first), -mondayIndex(first))
  const weeks: string[][] = []
  let cursor = start
  // 6 weeks covers every possible month layout
  for (let w = 0; w < 6; w++) {
    const week: string[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/date.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.ts src/lib/date.test.ts
git commit -m "feat: add date utilities with tests"
```

---

### Task 5: Nutrition math (TDD)

**Files:**
- Create: `src/lib/nutrition.ts`
- Test: `src/lib/nutrition.test.ts`

**Interfaces:**
- Consumes: `Food`, `Serving`, `Nutrition`, `LogEntry`, `DayLog`, `MealKey`, `MEAL_KEYS` from `src/types.ts`.
- Produces:
  - `emptyNutrition(): Nutrition` — all zeros.
  - `primaryServing(food: Food): Serving` — the serving with `isPrimary`, else the first.
  - `scaleNutrition(n: Nutrition, factor: number): Nutrition` — multiply every numeric leaf.
  - `entryNutrition(entry: LogEntry): Nutrition` — scaled by `quantity / primaryServing.amount`.
  - `sumNutrition(list: Nutrition[]): Nutrition`.
  - `mealNutrition(day: DayLog, meal: MealKey): Nutrition`.
  - `dayFoodNutrition(day: DayLog): Nutrition` — all meals combined.
  - `exerciseTotal(day: DayLog): number` — sum of caloriesBurned.
  - `remaining(budget: number, day: DayLog): number` — `budget - (foodCalories - exerciseTotal)`.
  - `underOver(budget: number, day: DayLog): { kind: 'under' | 'over'; amount: number }`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  emptyNutrition, scaleNutrition, entryNutrition, dayFoodNutrition,
  remaining, underOver, primaryServing,
} from './nutrition'
import type { Food, DayLog, LogEntry } from '../types'

function food(cal: number, primaryAmount = 100): Food {
  return {
    id: 'f1', name: 'Rice', icon: '🍚', source: 'custom', createdAt: '2026-08-18T00:00:00Z',
    servings: [{ id: 's1', kind: 'weight', label: 'Grams', amount: primaryAmount, unit: 'g', isPrimary: true }],
    nutrition: { ...emptyNutrition(), calories: cal, protein: 3, carbs: { total: 28, fiber: 1, sugar: 0 } },
  }
}
function entry(f: Food, qty: number): LogEntry {
  return { id: 'e1', foodSnapshot: f, servingId: f.servings[0].id, quantity: qty }
}
function day(entries: LogEntry[], burned = 0): DayLog {
  return {
    date: '2026-08-18',
    meals: { breakfast: entries, lunch: [], dinner: [], snacks: [] },
    exercise: burned ? [{ id: 'x', name: 'Run', caloriesBurned: burned }] : [],
  }
}

describe('nutrition', () => {
  it('emptyNutrition is all zeros', () => {
    expect(emptyNutrition().calories).toBe(0)
    expect(emptyNutrition().fat.total).toBe(0)
  })
  it('primaryServing picks the primary', () => {
    expect(primaryServing(food(130)).id).toBe('s1')
  })
  it('scaleNutrition multiplies leaves', () => {
    const n = scaleNutrition(food(130).nutrition, 2)
    expect(n.calories).toBe(260)
    expect(n.protein).toBe(6)
    expect(n.carbs.total).toBe(56)
  })
  it('entryNutrition scales by quantity/primary amount (per-100g)', () => {
    // 130 cal per 100g, log 600g -> 780
    expect(entryNutrition(entry(food(130), 600)).calories).toBe(780)
  })
  it('entryNutrition works for per-Serving foods', () => {
    // 120 cal per 1 Serving, log 2 servings -> 240
    const f = food(120, 1)
    f.servings[0] = { id: 's1', kind: 'amount', label: 'Serving', amount: 1, unit: 'serving', isPrimary: true }
    expect(entryNutrition(entry(f, 2)).calories).toBe(240)
  })
  it('dayFoodNutrition sums meals', () => {
    expect(dayFoodNutrition(day([entry(food(130), 100), entry(food(130), 100)])).calories).toBe(260)
  })
  it('remaining subtracts food and adds back exercise', () => {
    // budget 2000, food 500, exercise 100 -> 2000 - (500 - 100) = 1600
    expect(remaining(2000, day([entry(food(500), 100)], 100))).toBe(1600)
  })
  it('underOver: positive is under, negative is over', () => {
    expect(underOver(2000, day([entry(food(400), 100)]))).toEqual({ kind: 'under', amount: 1600 })
    expect(underOver(300, day([entry(food(400), 100)]))).toEqual({ kind: 'over', amount: 100 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/nutrition.test.ts`
Expected: FAIL — module/functions not found.

- [ ] **Step 3: Implement src/lib/nutrition.ts**

```ts
import type { Food, Serving, Nutrition, LogEntry, DayLog, MealKey } from '../types'
import { MEAL_KEYS } from '../types'

export function emptyNutrition(): Nutrition {
  return {
    calories: 0,
    fat: { total: 0, mono: 0, poly: 0, saturated: 0, trans: 0 },
    cholesterol: 0,
    sodium: 0,
    carbs: { total: 0, fiber: 0, sugar: 0 },
    protein: 0,
    vitamins: { a: 0, c: 0, b1: 0, b2: 0, b3: 0, b9: 0, b6: 0, b12: 0 },
    minerals: { calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, zinc: 0 },
    caffeine: 0,
  }
}

export function primaryServing(food: Food): Serving {
  return food.servings.find(s => s.isPrimary) ?? food.servings[0]
}

export function scaleNutrition(n: Nutrition, factor: number): Nutrition {
  return {
    calories: n.calories * factor,
    fat: {
      total: n.fat.total * factor, mono: n.fat.mono * factor, poly: n.fat.poly * factor,
      saturated: n.fat.saturated * factor, trans: n.fat.trans * factor,
    },
    cholesterol: n.cholesterol * factor,
    sodium: n.sodium * factor,
    carbs: { total: n.carbs.total * factor, fiber: n.carbs.fiber * factor, sugar: n.carbs.sugar * factor },
    protein: n.protein * factor,
    vitamins: {
      a: n.vitamins.a * factor, c: n.vitamins.c * factor, b1: n.vitamins.b1 * factor, b2: n.vitamins.b2 * factor,
      b3: n.vitamins.b3 * factor, b9: n.vitamins.b9 * factor, b6: n.vitamins.b6 * factor, b12: n.vitamins.b12 * factor,
    },
    minerals: {
      calcium: n.minerals.calcium * factor, iron: n.minerals.iron * factor, magnesium: n.minerals.magnesium * factor,
      phosphorus: n.minerals.phosphorus * factor, potassium: n.minerals.potassium * factor, zinc: n.minerals.zinc * factor,
    },
    caffeine: n.caffeine * factor,
  }
}

export function entryNutrition(entry: LogEntry): Nutrition {
  const base = primaryServing(entry.foodSnapshot)
  const factor = base.amount === 0 ? 0 : entry.quantity / base.amount
  return scaleNutrition(entry.foodSnapshot.nutrition, factor)
}

export function sumNutrition(list: Nutrition[]): Nutrition {
  return list.reduce((acc, n) => addNutrition(acc, n), emptyNutrition())
}

function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  return {
    calories: a.calories + b.calories,
    fat: {
      total: a.fat.total + b.fat.total, mono: a.fat.mono + b.fat.mono, poly: a.fat.poly + b.fat.poly,
      saturated: a.fat.saturated + b.fat.saturated, trans: a.fat.trans + b.fat.trans,
    },
    cholesterol: a.cholesterol + b.cholesterol,
    sodium: a.sodium + b.sodium,
    carbs: { total: a.carbs.total + b.carbs.total, fiber: a.carbs.fiber + b.carbs.fiber, sugar: a.carbs.sugar + b.carbs.sugar },
    protein: a.protein + b.protein,
    vitamins: {
      a: a.vitamins.a + b.vitamins.a, c: a.vitamins.c + b.vitamins.c, b1: a.vitamins.b1 + b.vitamins.b1, b2: a.vitamins.b2 + b.vitamins.b2,
      b3: a.vitamins.b3 + b.vitamins.b3, b9: a.vitamins.b9 + b.vitamins.b9, b6: a.vitamins.b6 + b.vitamins.b6, b12: a.vitamins.b12 + b.vitamins.b12,
    },
    minerals: {
      calcium: a.minerals.calcium + b.minerals.calcium, iron: a.minerals.iron + b.minerals.iron, magnesium: a.minerals.magnesium + b.minerals.magnesium,
      phosphorus: a.minerals.phosphorus + b.minerals.phosphorus, potassium: a.minerals.potassium + b.minerals.potassium, zinc: a.minerals.zinc + b.minerals.zinc,
    },
    caffeine: a.caffeine + b.caffeine,
  }
}

export function mealNutrition(day: DayLog, meal: MealKey): Nutrition {
  return sumNutrition(day.meals[meal].map(entryNutrition))
}

export function dayFoodNutrition(day: DayLog): Nutrition {
  return sumNutrition(MEAL_KEYS.flatMap(m => day.meals[m].map(entryNutrition)))
}

export function exerciseTotal(day: DayLog): number {
  return day.exercise.reduce((s, e) => s + e.caloriesBurned, 0)
}

export function remaining(budget: number, day: DayLog): number {
  return budget - (dayFoodNutrition(day).calories - exerciseTotal(day))
}

export function underOver(budget: number, day: DayLog): { kind: 'under' | 'over'; amount: number } {
  const r = remaining(budget, day)
  return r >= 0 ? { kind: 'under', amount: r } : { kind: 'over', amount: -r }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/nutrition.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition.ts src/lib/nutrition.test.ts
git commit -m "feat: add nutrition math with tests"
```

---

### Task 6: Migrations (TDD)

**Files:**
- Create: `src/lib/migrations.ts`
- Test: `src/lib/migrations.test.ts`

**Interfaces:**
- Consumes: nothing (operates on untyped stored JSON blobs).
- Produces:
  - `CURRENT_SCHEMA_VERSION: number` (start at `1`).
  - `migrate(raw: { version: number; data: unknown }): { version: number; data: unknown }` — runs ordered steps from `raw.version` up to `CURRENT_SCHEMA_VERSION`; no-op if already current; each step is a pure transform. Used by the storage layer.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { migrate, CURRENT_SCHEMA_VERSION } from './migrations'

describe('migrations', () => {
  it('is a no-op when already current', () => {
    const input = { version: CURRENT_SCHEMA_VERSION, data: { hello: 'world' } }
    expect(migrate(input)).toEqual(input)
  })
  it('never downgrades', () => {
    const input = { version: CURRENT_SCHEMA_VERSION + 5, data: {} }
    expect(migrate(input).version).toBe(CURRENT_SCHEMA_VERSION + 5)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/lib/migrations.ts**

```ts
export const CURRENT_SCHEMA_VERSION = 1

// Each step transforms data from version N to N+1. Add steps as the schema evolves.
// Example future step:
//   1: (data) => ({ ...data, newField: [] }),
const steps: Record<number, (data: unknown) => unknown> = {}

export function migrate(raw: { version: number; data: unknown }): { version: number; data: unknown } {
  let { version, data } = raw
  while (version < CURRENT_SCHEMA_VERSION && steps[version]) {
    data = steps[version](data)
    version += 1
  }
  // If already >= current (or no step exists), return as-is without downgrading.
  return { version: Math.max(version, raw.version), data }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat: add migration pipeline with tests"
```

---

### Task 7: Storage layer (TDD)

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `DayLog`, `Food`, `Settings`, `MealMap` from types; `migrate`, `CURRENT_SCHEMA_VERSION` from migrations.
- Produces:
  - `DEFAULT_SETTINGS: Settings` (`dailyBudget: 2000`, `macroTargets: { protein: 128, fiber: 28 }`, `language: 'en'`).
  - `loadSettings(): Settings`, `saveSettings(s: Settings): void`.
  - `loadMyFoods(): Food[]`, `saveMyFoods(f: Food[]): void`.
  - `loadDays(): Record<string, DayLog>`, `saveDays(d: Record<string, DayLog>): void`.
  - `getDay(days: Record<string, DayLog>, key: string): DayLog` — returns existing or a fresh empty `DayLog`.
  - `emptyDay(key: string): DayLog`.
  - `ensureSchema(): void` — reads `cc.schemaVersion`, runs migrate on stored blobs, writes back, sets current version. Called once at boot.
  - Keys are the exact Global Constraints strings.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, loadMyFoods, saveMyFoods,
  loadDays, saveDays, getDay, emptyDay, ensureSchema,
} from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('returns default settings when empty', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('round-trips settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, dailyBudget: 2012, language: 'zh' })
    expect(loadSettings().dailyBudget).toBe(2012)
    expect(loadSettings().language).toBe('zh')
  })
  it('round-trips my foods', () => {
    const foods = [{ id: 'f1', name: 'X', icon: '🍚', source: 'custom', createdAt: '', servings: [], nutrition: {} } as any]
    saveMyFoods(foods)
    expect(loadMyFoods()).toHaveLength(1)
  })
  it('getDay returns empty day for missing key', () => {
    const d = getDay(loadDays(), '2026-08-18')
    expect(d.date).toBe('2026-08-18')
    expect(d.meals.breakfast).toEqual([])
    expect(d.exercise).toEqual([])
  })
  it('round-trips days', () => {
    const days = { '2026-08-18': emptyDay('2026-08-18') }
    days['2026-08-18'].exercise.push({ id: 'x', name: 'Run', caloriesBurned: 50 })
    saveDays(days)
    expect(loadDays()['2026-08-18'].exercise[0].caloriesBurned).toBe(50)
  })
  it('ensureSchema sets the current version', () => {
    ensureSchema()
    expect(localStorage.getItem('cc.schemaVersion')).toBe('1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/lib/storage.ts**

```ts
import type { DayLog, Food, Settings, MealMap } from '../types'
import { migrate, CURRENT_SCHEMA_VERSION } from './migrations'

const K = {
  days: 'cc.days',
  myFoods: 'cc.myFoods',
  settings: 'cc.settings',
  schemaVersion: 'cc.schemaVersion',
} as const

export const DEFAULT_SETTINGS: Settings = {
  dailyBudget: 2000,
  macroTargets: { protein: 128, fiber: 28 },
  language: 'en',
}

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (raw == null) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K.settings, {}) }
}
export function saveSettings(s: Settings): void { write(K.settings, s) }

export function loadMyFoods(): Food[] { return read<Food[]>(K.myFoods, []) }
export function saveMyFoods(f: Food[]): void { write(K.myFoods, f) }

export function loadDays(): Record<string, DayLog> { return read<Record<string, DayLog>>(K.days, {}) }
export function saveDays(d: Record<string, DayLog>): void { write(K.days, d) }

export function emptyDay(key: string): DayLog {
  const meals: MealMap = { breakfast: [], lunch: [], dinner: [], snacks: [] }
  return { date: key, meals, exercise: [] }
}

export function getDay(days: Record<string, DayLog>, key: string): DayLog {
  return days[key] ?? emptyDay(key)
}

export function ensureSchema(): void {
  const stored = Number(localStorage.getItem(K.schemaVersion) ?? CURRENT_SCHEMA_VERSION)
  for (const key of [K.days, K.myFoods, K.settings]) {
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      const data = JSON.parse(raw)
      const migrated = migrate({ version: stored, data })
      localStorage.setItem(key, JSON.stringify(migrated.data))
    } catch { /* leave malformed blob; loaders fall back to defaults */ }
  }
  localStorage.setItem(K.schemaVersion, String(CURRENT_SCHEMA_VERSION))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add localStorage layer with schema versioning"
```

---

### Task 8: ID + Food factory helpers (TDD)

**Files:**
- Create: `src/lib/ids.ts`
- Create: `src/lib/food.ts`
- Test: `src/lib/food.test.ts`

**Interfaces:**
- Consumes: `Food`, `Serving`, `Nutrition`, `FoodSource` from types; `emptyNutrition` from nutrition.
- Produces:
  - `newId(): string` — uses `crypto.randomUUID()`.
  - `newServing(partial?: Partial<Serving>): Serving` — defaults to a primary 100g "Grams" weight serving.
  - `newFood(partial?: Partial<Food>): Food` — a blank custom food with default icon `🍽️`, one primary serving, `emptyNutrition()`, `createdAt = new Date().toISOString()`.
  - `cloneAsCustom(food: Food): Food` — deep clone with a new id and `source: 'custom'` (used when editing a predefined food).
  - `DEFAULT_ICON = '🍽️'`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { newId } from './ids'
import { newFood, newServing, cloneAsCustom, DEFAULT_ICON } from './food'

describe('food factory', () => {
  it('newId returns unique strings', () => {
    expect(newId()).not.toBe(newId())
  })
  it('newServing defaults to primary 100g', () => {
    const s = newServing()
    expect(s.isPrimary).toBe(true)
    expect(s.amount).toBe(100)
    expect(s.unit).toBe('g')
  })
  it('newFood is a blank custom food', () => {
    const f = newFood()
    expect(f.source).toBe('custom')
    expect(f.icon).toBe(DEFAULT_ICON)
    expect(f.servings).toHaveLength(1)
    expect(f.servings[0].isPrimary).toBe(true)
    expect(f.nutrition.calories).toBe(0)
    expect(f.createdAt).not.toBe('')
  })
  it('cloneAsCustom makes a custom copy with a new id', () => {
    const pre = { ...newFood(), id: 'orig', name: 'Rice', source: 'predefined' as const }
    const c = cloneAsCustom(pre)
    expect(c.id).not.toBe('orig')
    expect(c.source).toBe('custom')
    expect(c.name).toBe('Rice')
    // deep clone: mutating clone does not touch original
    c.servings[0].amount = 999
    expect(pre.servings[0].amount).toBe(100)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/food.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement src/lib/ids.ts**

```ts
export function newId(): string {
  return crypto.randomUUID()
}
```

- [ ] **Step 4: Implement src/lib/food.ts**

```ts
import type { Food, Serving } from '../types'
import { emptyNutrition } from './nutrition'
import { newId } from './ids'

export const DEFAULT_ICON = '🍽️'

export function newServing(partial: Partial<Serving> = {}): Serving {
  return {
    id: newId(),
    kind: 'weight',
    label: 'Grams',
    amount: 100,
    unit: 'g',
    isPrimary: true,
    ...partial,
  }
}

export function newFood(partial: Partial<Food> = {}): Food {
  return {
    id: newId(),
    name: '',
    icon: DEFAULT_ICON,
    servings: [newServing()],
    nutrition: emptyNutrition(),
    source: 'custom',
    createdAt: new Date().toISOString(),
    ...partial,
  }
}

export function cloneAsCustom(food: Food): Food {
  const copy: Food = JSON.parse(JSON.stringify(food))
  copy.id = newId()
  copy.source = 'custom'
  copy.servings = copy.servings.map(s => ({ ...s, id: newId() }))
  return copy
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/food.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ids.ts src/lib/food.ts src/lib/food.test.ts
git commit -m "feat: add id and food factory helpers"
```

---

### Task 9: Import / Export (TDD)

**Files:**
- Create: `src/lib/importExport.ts`
- Test: `src/lib/importExport.test.ts`

**Interfaces:**
- Consumes: `Food`, `Settings`, `DayLog` from types; `cloneAsCustom` is NOT used here.
- Produces:
  - `exportFoods(foods: Food[]): string` — pretty JSON of a `{ kind: 'foods'; version: number; foods: Food[] }` envelope.
  - `parseFoodsImport(text: string): Food[]` — accepts either the envelope or a bare `Food[]`; throws `Error('Invalid foods file')` on malformed input; forces `source: 'custom'` on imported foods and assigns new ids.
  - `mergeFoods(existing: Food[], incoming: Food[]): Food[]` — dedupe by `name`+`brand` (case-insensitive, trimmed); incoming overwrites matching existing, others appended.
  - `exportBackup(data: { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings }): string`.
  - `parseBackup(text: string): { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings }` — throws `Error('Invalid backup file')` on malformed input.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { exportFoods, parseFoodsImport, mergeFoods, exportBackup, parseBackup } from './importExport'
import type { Food } from '../types'

function f(name: string, brand?: string): Food {
  return { id: name, name, brand, icon: '🍚', source: 'predefined', createdAt: '',
    servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
    nutrition: { calories: 1 } as any }
}

describe('importExport', () => {
  it('exportFoods → parseFoodsImport round-trips names', () => {
    const out = parseFoodsImport(exportFoods([f('Rice'), f('Bread')]))
    expect(out.map(x => x.name)).toEqual(['Rice', 'Bread'])
  })
  it('imported foods become custom with new ids', () => {
    const out = parseFoodsImport(exportFoods([f('Rice')]))
    expect(out[0].source).toBe('custom')
    expect(out[0].id).not.toBe('Rice')
  })
  it('accepts a bare array too', () => {
    expect(parseFoodsImport(JSON.stringify([f('Rice')]))).toHaveLength(1)
  })
  it('throws on malformed foods input', () => {
    expect(() => parseFoodsImport('not json')).toThrow('Invalid foods file')
    expect(() => parseFoodsImport('{"nope":1}')).toThrow('Invalid foods file')
  })
  it('mergeFoods dedupes by name+brand case-insensitively', () => {
    const merged = mergeFoods([f('Rice')], [f('rice'), f('Bread')])
    expect(merged.map(x => x.name.toLowerCase()).sort()).toEqual(['bread', 'rice'])
  })
  it('backup round-trips', () => {
    const data = { days: {}, myFoods: [f('Rice')], settings: { dailyBudget: 2012, macroTargets: { protein: 1, fiber: 1 }, language: 'en' as const } }
    const parsed = parseBackup(exportBackup(data))
    expect(parsed.settings.dailyBudget).toBe(2012)
    expect(parsed.myFoods).toHaveLength(1)
  })
  it('throws on malformed backup', () => {
    expect(() => parseBackup('nope')).toThrow('Invalid backup file')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/importExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/lib/importExport.ts**

```ts
import type { Food, Settings, DayLog } from '../types'
import { newId } from './ids'

const FOODS_VERSION = 1
const BACKUP_VERSION = 1

export function exportFoods(foods: Food[]): string {
  return JSON.stringify({ kind: 'foods', version: FOODS_VERSION, foods }, null, 2)
}

function isFoodArray(v: unknown): v is Food[] {
  return Array.isArray(v) && v.every(x => x && typeof x === 'object' && 'name' in x && 'nutrition' in x)
}

export function parseFoodsImport(text: string): Food[] {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('Invalid foods file') }
  let foods: unknown
  if (isFoodArray(parsed)) foods = parsed
  else if (parsed && typeof parsed === 'object' && 'foods' in parsed) foods = (parsed as { foods: unknown }).foods
  if (!isFoodArray(foods)) throw new Error('Invalid foods file')
  return foods.map(food => ({ ...food, id: newId(), source: 'custom' as const }))
}

function normKey(f: Food): string {
  return `${f.name.trim().toLowerCase()}|${(f.brand ?? '').trim().toLowerCase()}`
}

export function mergeFoods(existing: Food[], incoming: Food[]): Food[] {
  const map = new Map<string, Food>()
  for (const f of existing) map.set(normKey(f), f)
  for (const f of incoming) map.set(normKey(f), f)
  return [...map.values()]
}

export function exportBackup(data: { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings }): string {
  return JSON.stringify({ kind: 'backup', version: BACKUP_VERSION, ...data }, null, 2)
}

export function parseBackup(text: string): { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings } {
  let parsed: any
  try { parsed = JSON.parse(text) } catch { throw new Error('Invalid backup file') }
  if (!parsed || typeof parsed !== 'object' || !('days' in parsed) || !('myFoods' in parsed) || !('settings' in parsed)) {
    throw new Error('Invalid backup file')
  }
  return { days: parsed.days, myFoods: parsed.myFoods, settings: parsed.settings }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/importExport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/importExport.ts src/lib/importExport.test.ts
git commit -m "feat: add JSON import/export and backup with tests"
```

---

### Task 10: Data files — predefined foods + food emojis

**Files:**
- Create: `src/data/predefinedFoods.json`
- Create: `src/data/foodEmojis.ts`
- Test: `src/data/predefinedFoods.test.ts`

**Interfaces:**
- Consumes: `Food` type; `emptyNutrition` shape (each entry must be a full valid `Food`).
- Produces:
  - `predefinedFoods.json` — an array of `Food` objects with `source: 'predefined'`, stable `id`s (e.g. `pre-rice`), one primary serving each, and complete `nutrition` (every field present; unknown → 0).
  - `foodEmojis.ts`: `FOOD_EMOJI_CATEGORIES: { key: string; emojis: { char: string; keywords: string[] }[] }[]` and `ALL_FOOD_EMOJIS: string[]`.

- [ ] **Step 1: Write failing test for predefined foods validity**

```ts
import { describe, it, expect } from 'vitest'
import foods from './predefinedFoods.json'
import type { Food } from '../types'

describe('predefinedFoods', () => {
  it('has at least 15 foods', () => {
    expect((foods as Food[]).length).toBeGreaterThanOrEqual(15)
  })
  it('every food is well-formed', () => {
    for (const f of foods as Food[]) {
      expect(f.source).toBe('predefined')
      expect(f.id).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(f.servings.length).toBeGreaterThanOrEqual(1)
      expect(f.servings.filter(s => s.isPrimary)).toHaveLength(1)
      expect(typeof f.nutrition.calories).toBe('number')
      expect(f.nutrition.fat).toBeDefined()
      expect(f.nutrition.carbs).toBeDefined()
      expect(f.nutrition.vitamins).toBeDefined()
      expect(f.nutrition.minerals).toBeDefined()
    }
  })
  it('ids are unique', () => {
    const ids = (foods as Food[]).map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/predefinedFoods.test.ts`
Expected: FAIL — file not found.

- [ ] **Step 3: Create src/data/predefinedFoods.json**

Create an array of ≥15 common foods. Each entry MUST have the full `Nutrition` shape. Template for one entry (repeat, varying values; fill unknown micronutrients with 0):

```json
[
  {
    "id": "pre-white-rice",
    "name": "White Rice (cooked)",
    "icon": "🍚",
    "source": "predefined",
    "createdAt": "2026-08-18T00:00:00.000Z",
    "servings": [
      { "id": "pre-white-rice-s1", "kind": "weight", "label": "Grams", "amount": 100, "unit": "g", "isPrimary": true }
    ],
    "nutrition": {
      "calories": 130,
      "fat": { "total": 0.3, "mono": 0.1, "poly": 0.1, "saturated": 0.1, "trans": 0 },
      "cholesterol": 0,
      "sodium": 1,
      "carbs": { "total": 28, "fiber": 0.4, "sugar": 0.1 },
      "protein": 2.7,
      "vitamins": { "a": 0, "c": 0, "b1": 0.02, "b2": 0.01, "b3": 0.4, "b9": 3, "b6": 0.05, "b12": 0 },
      "minerals": { "calcium": 10, "iron": 0.2, "magnesium": 12, "phosphorus": 43, "potassium": 35, "zinc": 0.5 },
      "caffeine": 0
    }
  }
]
```

Include at least these 15 foods (approx per-100g unless noted; values may be rounded, micronutrients 0 when unknown):
1. White Rice (cooked) 🍚 — 130 cal/100g
2. Chicken Breast (cooked) 🍗 — 165 cal/100g, protein 31
3. Egg (whole) 🥚 — serving "1 Egg" amount 1 unit "egg", 78 cal, protein 6
4. Banana 🍌 — 89 cal/100g
5. Apple 🍎 — 52 cal/100g
6. Bread (white) 🍞 — 265 cal/100g
7. Milk (whole) 🥛 — volume serving 250 mL, 150 cal
8. Broccoli (cooked) 🥦 — 35 cal/100g
9. Salmon (cooked) 🐟 — 208 cal/100g, protein 20
10. Beef (ground, cooked) 🥩 — 250 cal/100g
11. Pasta (cooked) 🍝 — 158 cal/100g
12. Oatmeal (cooked) 🥣 — 71 cal/100g
13. Greek Yogurt 🥣 — 59 cal/100g, protein 10
14. Almonds 🥜 — 579 cal/100g
15. Orange 🍊 — 47 cal/100g

- [ ] **Step 4: Create src/data/foodEmojis.ts**

```ts
export interface EmojiEntry { char: string; keywords: string[] }
export interface EmojiCategory { key: string; emojis: EmojiEntry[] }

export const FOOD_EMOJI_CATEGORIES: EmojiCategory[] = [
  { key: 'fruits', emojis: [
    { char: '🍎', keywords: ['apple', '苹果'] }, { char: '🍊', keywords: ['orange', '橙'] },
    { char: '🍌', keywords: ['banana', '香蕉'] }, { char: '🍇', keywords: ['grape', '葡萄'] },
    { char: '🍓', keywords: ['strawberry', '草莓', 'berry'] }, { char: '🫐', keywords: ['blueberry', '蓝莓', 'berry'] },
    { char: '🍉', keywords: ['watermelon', '西瓜'] }, { char: '🍑', keywords: ['peach', '桃'] },
    { char: '🍍', keywords: ['pineapple', '菠萝'] }, { char: '🥝', keywords: ['kiwi', '猕猴桃'] },
  ]},
  { key: 'vegetables', emojis: [
    { char: '🥕', keywords: ['carrot', '胡萝卜'] }, { char: '🥦', keywords: ['broccoli', '西兰花'] },
    { char: '🍅', keywords: ['tomato', '番茄'] }, { char: '🍆', keywords: ['eggplant', '茄子'] },
    { char: '🌽', keywords: ['corn', '玉米'] }, { char: '🥔', keywords: ['potato', '土豆'] },
    { char: '🧅', keywords: ['onion', '洋葱'] }, { char: '🥬', keywords: ['lettuce', 'greens', '生菜'] },
    { char: '🥒', keywords: ['cucumber', '黄瓜'] }, { char: '🍄', keywords: ['mushroom', '蘑菇'] },
  ]},
  { key: 'grains', emojis: [
    { char: '🍚', keywords: ['rice', '米饭'] }, { char: '🍞', keywords: ['bread', '面包'] },
    { char: '🥐', keywords: ['croissant', '可颂'] }, { char: '🍜', keywords: ['noodles', 'ramen', '面'] },
    { char: '🍝', keywords: ['pasta', 'spaghetti', '意面'] }, { char: '🥣', keywords: ['oatmeal', 'cereal', 'yogurt', '麦片'] },
    { char: '🥖', keywords: ['baguette', '法棍'] }, { char: '🌾', keywords: ['grain', 'wheat', '谷物'] },
  ]},
  { key: 'protein', emojis: [
    { char: '🥩', keywords: ['steak', 'beef', 'meat', '牛肉', '肉'] }, { char: '🍗', keywords: ['chicken', 'poultry', '鸡'] },
    { char: '🍖', keywords: ['meat', 'pork', '肉'] }, { char: '🍤', keywords: ['shrimp', 'prawn', '虾'] },
    { char: '🐟', keywords: ['fish', 'salmon', '鱼'] }, { char: '🥚', keywords: ['egg', '蛋'] },
    { char: '🧀', keywords: ['cheese', '奶酪'] }, { char: '🥜', keywords: ['nuts', 'almond', 'peanut', '坚果'] },
    { char: '🫘', keywords: ['beans', 'legume', '豆'] }, { char: '🍳', keywords: ['fried egg', 'cooking', '煎蛋'] },
  ]},
  { key: 'dairy', emojis: [
    { char: '🥛', keywords: ['milk', '牛奶'] }, { char: '🧈', keywords: ['butter', '黄油'] },
    { char: '🍦', keywords: ['ice cream', '冰淇淋'] }, { char: '🍶', keywords: ['sake', 'bottle', '瓶'] },
  ]},
  { key: 'drinks', emojis: [
    { char: '☕', keywords: ['coffee', '咖啡'] }, { char: '🍵', keywords: ['tea', '茶'] },
    { char: '🧃', keywords: ['juice', '果汁'] }, { char: '🥤', keywords: ['soda', 'soft drink', '饮料'] },
    { char: '🍷', keywords: ['wine', '葡萄酒', '红酒'] }, { char: '🍺', keywords: ['beer', '啤酒'] },
    { char: '💧', keywords: ['water', '水'] },
  ]},
  { key: 'sweets', emojis: [
    { char: '🍫', keywords: ['chocolate', '巧克力'] }, { char: '🍪', keywords: ['cookie', '饼干'] },
    { char: '🍰', keywords: ['cake', '蛋糕'] }, { char: '🍩', keywords: ['donut', '甜甜圈'] },
    { char: '🍬', keywords: ['candy', '糖'] }, { char: '🍯', keywords: ['honey', '蜂蜜'] },
  ]},
  { key: 'prepared', emojis: [
    { char: '🍔', keywords: ['burger', '汉堡'] }, { char: '🍕', keywords: ['pizza', '披萨'] },
    { char: '🌮', keywords: ['taco', '玉米卷'] }, { char: '🍱', keywords: ['bento', '便当'] },
    { char: '🍲', keywords: ['stew', 'hotpot', '炖菜'] }, { char: '🥗', keywords: ['salad', '沙拉'] },
    { char: '🍟', keywords: ['fries', '薯条'] }, { char: '🥪', keywords: ['sandwich', '三明治'] },
  ]},
  { key: 'other', emojis: [
    { char: '🍽️', keywords: ['default', 'meal', 'food', '默认'] }, { char: '🧂', keywords: ['salt', '盐'] },
    { char: '🫙', keywords: ['jar', 'supplement', '罐'] }, { char: '💊', keywords: ['supplement', 'pill', '补剂'] },
  ]},
]

export const ALL_FOOD_EMOJIS: string[] = FOOD_EMOJI_CATEGORIES.flatMap(c => c.emojis.map(e => e.char))
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/data/predefinedFoods.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/predefinedFoods.json src/data/foodEmojis.ts src/data/predefinedFoods.test.ts
git commit -m "feat: add predefined foods and curated food emoji data"
```

---

### Task 11: i18n scaffolding

**Files:**
- Create: `src/i18n/index.ts`
- Create: `src/i18n/locales/en.json`
- Create: `src/i18n/locales/zh.json`, `es.json`, `fr.json`, `ar.json`, `ru.json` (stubs = copies of en for now; real translations in Task 22)
- Test: `src/i18n/i18n.test.ts`

**Interfaces:**
- Consumes: `Language`, `LANGUAGES` from types.
- Produces:
  - default-exported configured `i18n` instance (react-i18next).
  - `applyDir(lang: Language): void` — sets `document.documentElement.dir` (`rtl` for `ar`, else `ltr`) and `lang`.
  - `setLanguage(lang: Language): void` — `i18n.changeLanguage` + `applyDir`.
  - `LANGUAGE_NATIVE_NAMES: Record<Language, string>` — `{ en:'English', zh:'中文', es:'Español', fr:'Français', ar:'العربية', ru:'Русский' }`.
  - Translation key namespaces (must exist in en.json): `nav.*`, `dashboard.*`, `meal.*`, `foodPicker.*`, `foodForm.*`, `calendar.*`, `goals.*`, `common.*`, `update.*`.

- [ ] **Step 1: Write en.json with the full key set**

```json
{
  "common": { "add": "Add", "save": "Save", "cancel": "Cancel", "delete": "Delete", "close": "Close", "done": "Done", "none": "None", "required": "Required", "today": "Today", "week": "Week" },
  "nav": { "dashboard": "Dashboard", "log": "Log", "goals": "Goals" },
  "dashboard": { "budget": "Budget: {{n}} cals", "food": "Food", "exercise": "Exercise", "under": "Under", "over": "Over", "protein": "Protein", "fiber": "Fiber", "language": "Language", "version": "Version" },
  "meal": { "breakfast": "Breakfast", "lunch": "Lunch", "dinner": "Dinner", "snacks": "Snacks", "cals": "{{n}} cals", "addFood": "Add Food", "proteinFiber": "{{p}}g protein · {{f}}g fiber", "clear": "Clear meal" },
  "foodPicker": { "search": "Search", "all": "All", "myFoods": "My Foods", "newFood": "New Food", "perServing": "{{cal}} cals per {{amount}} {{label}}" },
  "foodForm": { "newFood": "New Food", "editFood": "Edit Food", "foodName": "Food Name (e.g. Salad)", "brand": "Brand (e.g. McDonald's)", "icon": "Icon", "default": "Default", "nutritionFacts": "Nutrition Facts", "servingsNote": "Servings should contain the same number of calories", "servingWeight": "Serving Weight", "servingVolume": "Serving Volume", "servingAmount": "Serving Amount", "addServing": "Add Serving Amount", "oneServingRequired": "one serving required", "calories": "Calories", "fat": "Fat (g)", "mono": "Monounsaturated Fat (g)", "poly": "Polyunsaturated Fat (g)", "saturated": "Saturated Fat (g)", "trans": "Trans Fat (g)", "cholesterol": "Cholesterol (mg)", "sodium": "Sodium (mg)", "carbs": "Carbohydrates (g)", "fiber": "Fiber (g)", "sugar": "Sugar (g)", "protein": "Protein (g)", "vitamins": "Vitamins", "vitA": "Vitamin A (mcg)", "vitC": "Vitamin C (mg)", "b1": "Thiamin (B1) (mg)", "b2": "Riboflavin (B2) (mg)", "b3": "Niacin (B3) (mg)", "b9": "Folate (B9) (mcg)", "b6": "Vitamin B6 (mg)", "b12": "Vitamin B12 (mcg)", "minerals": "Minerals", "calcium": "Calcium (mg)", "iron": "Iron (mg)", "magnesium": "Magnesium (mg)", "phosphorus": "Phosphorus (mg)", "potassium": "Potassium (mg)", "zinc": "Zinc (mg)", "caffeine": "Caffeine (mg)", "quantity": "Quantity", "serving": "Serving" },
  "calendar": { "monthTitle": "{{month}} {{year}}", "mon": "Mon", "tue": "Tue", "wed": "Wed", "thu": "Thu", "fri": "Fri", "sat": "Sat", "sun": "Sun" },
  "goals": { "title": "Goals", "dailyBudget": "Daily Calorie Budget", "proteinTarget": "Protein Target (g)", "fiberTarget": "Fiber Target (g)", "data": "Data", "importFoods": "Import Foods", "exportFoods": "Export Foods", "exportBackup": "Export Backup", "importBackup": "Import Backup", "backupNote": "Export regularly — device storage can be cleared.", "checkUpdates": "Check for updates", "importFoodsDone": "Imported {{n}} foods", "importError": "Import failed: {{msg}}" },
  "update": { "available": "New version available", "reload": "Update", "upToDate": "You are up to date" }
}
```

- [ ] **Step 2: Create the 5 stub locales as copies of en.json**

Run:
```bash
mkdir -p src/i18n/locales
for l in zh es fr ar ru; do cp src/i18n/locales/en.json src/i18n/locales/$l.json; done
```

- [ ] **Step 3: Implement src/i18n/index.ts**

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../types'
import en from './locales/en.json'
import zh from './locales/zh.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import ru from './locales/ru.json'

export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  en: 'English', zh: '中文', es: 'Español', fr: 'Français', ar: 'العربية', ru: 'Русский',
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en }, zh: { translation: zh }, es: { translation: es },
    fr: { translation: fr }, ar: { translation: ar }, ru: { translation: ru },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function applyDir(lang: Language): void {
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}

export function setLanguage(lang: Language): void {
  i18n.changeLanguage(lang)
  applyDir(lang)
}

export default i18n
```

- [ ] **Step 4: Write i18n test**

```ts
import { describe, it, expect } from 'vitest'
import en from './locales/en.json'
import zh from './locales/zh.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import ru from './locales/ru.json'
import { applyDir } from './index'

function keyPaths(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`])
}

describe('i18n', () => {
  it('every locale has the same keys as en', () => {
    const base = keyPaths(en).sort()
    for (const [name, loc] of [['zh', zh], ['es', es], ['fr', fr], ['ar', ar], ['ru', ru]] as const) {
      expect({ [name]: keyPaths(loc).sort() }).toEqual({ [name]: base })
    }
  })
  it('applyDir sets rtl for ar and ltr otherwise', () => {
    applyDir('ar'); expect(document.documentElement.dir).toBe('rtl')
    applyDir('en'); expect(document.documentElement.dir).toBe('ltr')
  })
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS (stubs are copies, so keys match).

- [ ] **Step 6: Commit**

```bash
git add src/i18n
git commit -m "feat: add i18n scaffolding with en locale and 5 stubs"
```

---

### Task 12: App state (context + hooks)

**Files:**
- Create: `src/state/AppContext.tsx`
- Create: `src/state/useApp.ts`
- Test: `src/state/AppContext.test.tsx`

**Interfaces:**
- Consumes: storage loaders/savers, `emptyDay`, `getDay`; `predefinedFoods.json`; `setLanguage`, `applyDir`; nutrition helpers; types.
- Produces `AppContextValue` via `useApp()`:
  - `selectedDate: string`, `setSelectedDate(key: string): void`.
  - `settings: Settings`, `updateSettings(patch: Partial<Settings>): void`.
  - `days: Record<string, DayLog>`, `day: DayLog` (the selected day, always defined).
  - `allFoods: Food[]` (predefined ⧺ myFoods), `myFoods: Food[]`, `predefined: Food[]`.
  - `addMyFood(f: Food): void`, `updateMyFood(f: Food): void`, `deleteMyFood(id: string): void`.
  - `addEntry(meal: MealKey, entry: LogEntry): void`, `updateEntry(meal: MealKey, entry: LogEntry): void`, `deleteEntry(meal: MealKey, id: string): void`, `clearMeal(meal: MealKey): void`.
  - `addExercise(e: ExerciseEntry): void`, `deleteExercise(id: string): void`.
  - `setLanguage(lang: Language): void` (updates settings + i18n + dir).
  - `importMyFoods(foods: Food[]): number`, `replaceAll(data): void` (backup restore).
  - `<AppProvider>` component wrapping children; persists to localStorage on every mutation.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'
import { newFood } from '../lib/food'
import { entryNutrition } from '../lib/nutrition'

function Probe() {
  const app = useApp()
  return (
    <div>
      <span data-testid="date">{app.selectedDate}</span>
      <span data-testid="foodCount">{app.allFoods.length}</span>
      <span data-testid="dayCals">{Math.round(app.day.meals.breakfast.reduce((s, e) => s + entryNutrition(e).calories, 0))}</span>
      <button onClick={() => app.addMyFood(newFood({ name: 'Test', nutrition: { ...app.allFoods[0].nutrition } }))}>addFood</button>
      <button onClick={() => {
        const f = newFood({ name: 'Rice', nutrition: { ...app.allFoods[0].nutrition, calories: 130 } })
        app.addEntry('breakfast', { id: 'e1', foodSnapshot: f, servingId: f.servings[0].id, quantity: 200 })
      }}>log</button>
    </div>
  )
}

describe('AppContext', () => {
  it('provides predefined foods and logs entries into the selected day', () => {
    render(<AppProvider><Probe /></AppProvider>)
    const before = Number(screen.getByTestId('foodCount').textContent)
    expect(before).toBeGreaterThanOrEqual(15)
    act(() => { screen.getByText('log').click() })
    // 130 cal/100g × 200g = 260
    expect(screen.getByTestId('dayCals').textContent).toBe('260')
  })
  it('addMyFood increases food count and persists', () => {
    render(<AppProvider><Probe /></AppProvider>)
    const before = Number(screen.getByTestId('foodCount').textContent)
    act(() => { screen.getByText('addFood').click() })
    expect(Number(screen.getByTestId('foodCount').textContent)).toBe(before + 1)
    expect(JSON.parse(localStorage.getItem('cc.myFoods')!)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/AppContext.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement src/state/useApp.ts (context object + hook)**

```ts
import { createContext, useContext } from 'react'
import type { DayLog, ExerciseEntry, Food, Language, LogEntry, MealKey, Settings } from '../types'

export interface AppContextValue {
  selectedDate: string
  setSelectedDate: (key: string) => void
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  days: Record<string, DayLog>
  day: DayLog
  allFoods: Food[]
  myFoods: Food[]
  predefined: Food[]
  addMyFood: (f: Food) => void
  updateMyFood: (f: Food) => void
  deleteMyFood: (id: string) => void
  addEntry: (meal: MealKey, entry: LogEntry) => void
  updateEntry: (meal: MealKey, entry: LogEntry) => void
  deleteEntry: (meal: MealKey, id: string) => void
  clearMeal: (meal: MealKey) => void
  addExercise: (e: ExerciseEntry) => void
  deleteExercise: (id: string) => void
  setLanguage: (lang: Language) => void
  importMyFoods: (foods: Food[]) => number
  replaceAll: (data: { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings }) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
```

- [ ] **Step 4: Implement src/state/AppContext.tsx**

```tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DayLog, ExerciseEntry, Food, Language, LogEntry, MealKey, Settings } from '../types'
import {
  loadSettings, saveSettings, loadMyFoods, saveMyFoods, loadDays, saveDays,
  getDay, ensureSchema,
} from '../lib/storage'
import { mergeFoods } from '../lib/importExport'
import predefinedRaw from '../data/predefinedFoods.json'
import { setLanguage as applyI18nLanguage, applyDir } from '../i18n'
import { AppContext, type AppContextValue } from './useApp'
import { todayKey } from '../lib/date'

const predefined = predefinedRaw as Food[]

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => { ensureSchema(); return loadSettings() })
  const [myFoods, setMyFoods] = useState<Food[]>(() => loadMyFoods())
  const [days, setDays] = useState<Record<string, DayLog>>(() => loadDays())
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey())

  // apply language/dir on mount and whenever it changes
  useEffect(() => { applyI18nLanguage(settings.language); applyDir(settings.language) }, [settings.language])

  const day = getDay(days, selectedDate)

  function persistDays(next: Record<string, DayLog>) { setDays(next); saveDays(next) }
  function persistMyFoods(next: Food[]) { setMyFoods(next); saveMyFoods(next) }
  function persistSettings(next: Settings) { setSettings(next); saveSettings(next) }

  function mutateDay(fn: (d: DayLog) => DayLog) {
    const current = getDay(days, selectedDate)
    persistDays({ ...days, [selectedDate]: fn(current) })
  }

  const value: AppContextValue = {
    selectedDate, setSelectedDate,
    settings,
    updateSettings: (patch) => persistSettings({ ...settings, ...patch }),
    days, day,
    allFoods: useMemo(() => [...predefined, ...myFoods], [myFoods]),
    myFoods, predefined,
    addMyFood: (f) => persistMyFoods([...myFoods, f]),
    updateMyFood: (f) => persistMyFoods(myFoods.map(x => x.id === f.id ? f : x)),
    deleteMyFood: (id) => persistMyFoods(myFoods.filter(x => x.id !== id)),
    addEntry: (meal, entry) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], entry] } })),
    updateEntry: (meal, entry) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].map(e => e.id === entry.id ? entry : e) } })),
    deleteEntry: (meal, id) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].filter(e => e.id !== id) } })),
    clearMeal: (meal) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: [] } })),
    addExercise: (e) => mutateDay(d => ({ ...d, exercise: [...d.exercise, e] })),
    deleteExercise: (id) => mutateDay(d => ({ ...d, exercise: d.exercise.filter(e => e.id !== id) })),
    setLanguage: (lang: Language) => persistSettings({ ...settings, language: lang }),
    importMyFoods: (foods) => { const merged = mergeFoods(myFoods, foods); persistMyFoods(merged); return foods.length },
    replaceAll: (data) => { persistDays(data.days); persistMyFoods(data.myFoods); persistSettings(data.settings) },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/state/AppContext.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/state
git commit -m "feat: add app state context and hooks"
```

---

### Task 13: App shell — global styles, bottom nav, routing

**Files:**
- Modify: `src/App.tsx` (replace hello-world)
- Modify: `src/main.tsx` (wrap in AppProvider, import i18n + styles)
- Create: `src/styles.css`
- Create: `src/components/BottomNav.tsx`
- Create: `src/routes/Dashboard.tsx`, `src/routes/Log.tsx`, `src/routes/Goals.tsx` (placeholders)
- Test: `src/components/BottomNav.test.tsx`

**Interfaces:**
- Consumes: `useApp` (not yet, but routes will); `react-router-dom`; i18n `t`.
- Produces: routes `#/` (Dashboard), `#/log` (Log), `#/goals` (Goals); a `<BottomNav>` with three tabs using `NavLink`; CSS using logical properties for RTL.

- [ ] **Step 1: Write failing test for BottomNav**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../i18n'
import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  it('renders three tabs with links', () => {
    render(<MemoryRouter><BottomNav /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '#/')
    expect(screen.getByRole('link', { name: /Log/i })).toHaveAttribute('href', '#/log')
    expect(screen.getByRole('link', { name: /Goals/i })).toHaveAttribute('href', '#/goals')
  })
})
```

Note: with `MemoryRouter`, `NavLink to="/"` renders `href="#/"` only under HashRouter; for this test assert on accessible names and that three links exist. Adjust assertions to `expect(screen.getAllByRole('link')).toHaveLength(3)` if href differs under MemoryRouter.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/BottomNav.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create src/styles.css**

```css
:root {
  --bg: #f1f1f4; --card: #ffffff; --text: #1a1a1a; --muted: #8a8a8e;
  --accent: #e8730c; --green: #2e9d4f; --red: #d64545; --line: #e5e5ea;
  --nav-h: 64px;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
  background: var(--bg); color: var(--text);
  -webkit-tap-highlight-color: transparent;
}
.app { min-height: 100%; padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom)); }
.screen { padding: 12px; padding-inline: 12px; }
.card { background: var(--card); border-radius: 16px; padding: 16px; margin-block: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.row { display: flex; align-items: center; gap: 12px; }
.spread { justify-content: space-between; }
.muted { color: var(--muted); font-size: 13px; }
.btn-accent { background: var(--accent); color: #fff; border: none; border-radius: 999px; padding: 8px 16px; font-weight: 600; }
.btn-ghost { background: transparent; border: none; color: var(--accent); font-weight: 600; }
input, select { font: inherit; }

.bottom-nav {
  position: fixed; inset-inline: 0; bottom: 0; height: calc(var(--nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex; background: var(--card); border-top: 1px solid var(--line);
}
.bottom-nav a {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; text-decoration: none; color: var(--muted); font-size: 11px;
}
.bottom-nav a.active { color: var(--accent); }
.bottom-nav .icon { font-size: 20px; }

[dir="rtl"] body { text-align: start; }
```

- [ ] **Step 4: Create src/components/BottomNav.tsx**

```tsx
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function BottomNav() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/', icon: '📊', label: t('nav.dashboard') },
    { to: '/log', icon: '📋', label: t('nav.log') },
    { to: '/goals', icon: '🎯', label: t('nav.goals') },
  ]
  return (
    <nav className="bottom-nav">
      {tabs.map(tb => (
        <NavLink key={tb.to} to={tb.to} end={tb.to === '/'}
          className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="icon">{tb.icon}</span>
          <span>{tb.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Create placeholder route screens**

`src/routes/Dashboard.tsx`:
```tsx
export default function Dashboard() {
  return <div className="screen"><h2>Dashboard</h2></div>
}
```
`src/routes/Log.tsx`:
```tsx
export default function Log() {
  return <div className="screen"><h2>Log</h2></div>
}
```
`src/routes/Goals.tsx`:
```tsx
export default function Goals() {
  return <div className="screen"><h2>Goals</h2></div>
}
```

- [ ] **Step 6: Rewrite src/App.tsx**

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import Dashboard from './routes/Dashboard'
import Log from './routes/Log'
import Goals from './routes/Goals'

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<Log />} />
          <Route path="/goals" element={<Goals />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  )
}
```

- [ ] **Step 7: Rewrite src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n'
import './styles.css'
import { AppProvider } from './state/AppContext'
import App from './App'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/BottomNav.test.tsx`
Expected: PASS. (If `href` assertion fails under MemoryRouter, switch to the `getAllByRole('link')` length check as noted in Step 1.)

- [ ] **Step 9: Verify dev build renders nav + routes**

Run: `npm run dev`
Expected: three tabs at the bottom; tapping switches between Dashboard/Log/Goals placeholders. Ctrl-C to stop.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add app shell, global styles, bottom nav, routing"
```

---

### Task 14: CalorieRing + BudgetGauge components

**Files:**
- Create: `src/components/CalorieRing.tsx`
- Create: `src/components/BudgetGauge.tsx`
- Test: `src/components/BudgetGauge.test.tsx`

**Interfaces:**
- Consumes: `underOver`, `dayFoodNutrition`, `exerciseTotal` from nutrition; `DayLog` type; i18n `t`.
- Produces:
  - `CalorieRing({ consumed, budget, size? }): SVG` — an arc filled by `min(consumed/budget,1)`; gray when `budget<=0` or `consumed===0`.
  - `BudgetGauge({ budget, day }): JSX` — center shows remaining number + Under/Over label (green/red), left "Food" = consumed calories, right "Exercise" = burned.

- [ ] **Step 1: Write failing test for BudgetGauge**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { BudgetGauge } from './BudgetGauge'
import type { DayLog } from '../types'

const day: DayLog = {
  date: '2026-08-18',
  meals: {
    breakfast: [{ id: 'e', servingId: 's', quantity: 100, foodSnapshot: {
      id: 'f', name: 'x', icon: '🍚', source: 'custom', createdAt: '',
      servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: { calories: 782, fat:{total:0,mono:0,poly:0,saturated:0,trans:0}, cholesterol:0, sodium:0, carbs:{total:0,fiber:0,sugar:0}, protein:0, vitamins:{a:0,c:0,b1:0,b2:0,b3:0,b9:0,b6:0,b12:0}, minerals:{calcium:0,iron:0,magnesium:0,phosphorus:0,potassium:0,zinc:0}, caffeine:0 },
    } }],
    lunch: [], dinner: [], snacks: [],
  },
  exercise: [],
}

describe('BudgetGauge', () => {
  it('shows remaining, food consumed, and Under label', () => {
    render(<BudgetGauge budget={2012} day={day} />)
    expect(screen.getByTestId('gauge-remaining').textContent).toBe('1,230')
    expect(screen.getByTestId('gauge-food').textContent).toBe('782')
    expect(screen.getByText(/Under/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/BudgetGauge.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/components/CalorieRing.tsx**

```tsx
interface Props { consumed: number; budget: number; size?: number; children?: React.ReactNode }

export function CalorieRing({ consumed, budget, size = 48, children }: Props) {
  const stroke = size * 0.12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = budget > 0 ? Math.min(consumed / budget, 1) : 0
  const over = budget > 0 && consumed > budget
  const color = consumed === 0 ? '#d8d8dd' : over ? 'var(--red)' : 'var(--green)'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e5ea" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      {children && <foreignObject x="0" y="0" width={size} height={size}>{children}</foreignObject>}
    </svg>
  )
}
```

- [ ] **Step 4: Implement src/components/BudgetGauge.tsx**

```tsx
import { useTranslation } from 'react-i18next'
import type { DayLog } from '../types'
import { dayFoodNutrition, exerciseTotal, underOver } from '../lib/nutrition'
import { CalorieRing } from './CalorieRing'

export function BudgetGauge({ budget, day }: { budget: number; day: DayLog }) {
  const { t } = useTranslation()
  const food = Math.round(dayFoodNutrition(day).calories)
  const exercise = Math.round(exerciseTotal(day))
  const uo = underOver(budget, day)
  const nf = (n: number) => n.toLocaleString('en-US')
  return (
    <div className="card">
      <div className="muted">{t('dashboard.budget', { n: nf(budget) })}</div>
      <div className="row spread" style={{ marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="muted">{t('dashboard.food')}</div>
          <div data-testid="gauge-food" style={{ fontSize: 22, fontWeight: 700 }}>{nf(food)}</div>
        </div>
        <CalorieRing consumed={food} budget={budget} size={110}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div data-testid="gauge-remaining" style={{ fontSize: 26, fontWeight: 800, color: uo.kind === 'under' ? 'var(--green)' : 'var(--red)' }}>
              {nf(uo.amount)}
            </div>
            <div className="muted">{uo.kind === 'under' ? t('dashboard.under') : t('dashboard.over')}</div>
          </div>
        </CalorieRing>
        <div style={{ textAlign: 'center' }}>
          <div className="muted">{t('dashboard.exercise')}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{nf(exercise)}</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/BudgetGauge.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CalorieRing.tsx src/components/BudgetGauge.tsx src/components/BudgetGauge.test.tsx
git commit -m "feat: add calorie ring and budget gauge"
```

---

### Task 15: MacroBar + DateHeader components

**Files:**
- Create: `src/components/MacroBar.tsx`
- Create: `src/components/DateHeader.tsx`
- Test: `src/components/DateHeader.test.tsx`

**Interfaces:**
- Consumes: `useApp` (selectedDate, setSelectedDate, settings.language); `addDays`, `formatHeader`; i18n.
- Produces:
  - `MacroBar({ label, current, target }): JSX` — labeled progress bar `current / target g`.
  - `DateHeader({ onOpenCalendar }): JSX` — `‹  📅 {formatted}  ›`; arrows call `setSelectedDate(addDays(..., ±1))`; center button calls `onOpenCalendar`.

- [ ] **Step 1: Write failing test for DateHeader**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { DateHeader } from './DateHeader'

describe('DateHeader', () => {
  it('renders a formatted date and fires onOpenCalendar', () => {
    const onOpen = vi.fn()
    render(<AppProvider><DateHeader onOpenCalendar={onOpen} /></AppProvider>)
    fireEvent.click(screen.getByTestId('date-center'))
    expect(onOpen).toHaveBeenCalled()
  })
  it('prev/next buttons change the date', () => {
    render(<AppProvider><DateHeader onOpenCalendar={() => {}} /></AppProvider>)
    const label = screen.getByTestId('date-center').textContent
    fireEvent.click(screen.getByTestId('date-next'))
    expect(screen.getByTestId('date-center').textContent).not.toBe(label)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DateHeader.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/components/MacroBar.tsx**

```tsx
export function MacroBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div style={{ flex: 1 }}>
      <div className="muted">{label}</div>
      <div style={{ height: 6, background: '#e5e5ea', borderRadius: 999, marginBlock: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
      </div>
      <div className="muted">{Math.round(current)} / {target}g</div>
    </div>
  )
}
```

- [ ] **Step 4: Implement src/components/DateHeader.tsx**

```tsx
import { useApp } from '../state/useApp'
import { addDays, formatHeader } from '../lib/date'

export function DateHeader({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const { selectedDate, setSelectedDate, settings } = useApp()
  return (
    <div className="row spread" style={{ padding: '8px 12px' }}>
      <button className="btn-ghost" data-testid="date-prev" aria-label="previous day"
        onClick={() => setSelectedDate(addDays(selectedDate, -1))}>‹</button>
      <button className="btn-ghost" data-testid="date-center" onClick={onOpenCalendar}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        📅 {formatHeader(selectedDate, settings.language)}
      </button>
      <button className="btn-ghost" data-testid="date-next" aria-label="next day"
        onClick={() => setSelectedDate(addDays(selectedDate, 1))}>›</button>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/DateHeader.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/MacroBar.tsx src/components/DateHeader.tsx src/components/DateHeader.test.tsx
git commit -m "feat: add macro bar and date header"
```

---

### Task 16: IconPicker component

**Files:**
- Create: `src/components/IconPicker.tsx`
- Test: `src/components/IconPicker.test.tsx`

**Interfaces:**
- Consumes: `FOOD_EMOJI_CATEGORIES` from `foodEmojis`; i18n.
- Produces: `IconPicker({ value, onChange, onClose }): JSX` — a modal grid of food emojis grouped by category, a search box filtering by keyword, a "type your own" text input, and selection calling `onChange(char)` then `onClose()`.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { IconPicker } from './IconPicker'

describe('IconPicker', () => {
  it('selecting an emoji calls onChange and onClose', () => {
    const onChange = vi.fn(); const onClose = vi.fn()
    render(<IconPicker value="🍽️" onChange={onChange} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '🍚' }))
    expect(onChange).toHaveBeenCalledWith('🍚')
    expect(onClose).toHaveBeenCalled()
  })
  it('search filters by keyword', () => {
    render(<IconPicker value="🍽️" onChange={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    expect(screen.getByRole('button', { name: '🍚' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '🍎' })).not.toBeInTheDocument()
  })
  it('type-your-own applies a custom emoji', () => {
    const onChange = vi.fn()
    render(<IconPicker value="🍽️" onChange={onChange} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('custom-emoji'), { target: { value: '🥥' } })
    fireEvent.click(screen.getByTestId('custom-emoji-apply'))
    expect(onChange).toHaveBeenCalledWith('🥥')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/IconPicker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/components/IconPicker.tsx**

```tsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FOOD_EMOJI_CATEGORIES } from '../data/foodEmojis'

export function IconPicker({ value, onChange, onClose }: { value: string; onChange: (c: string) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState('')

  const categories = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return FOOD_EMOJI_CATEGORIES
    return FOOD_EMOJI_CATEGORIES
      .map(c => ({ ...c, emojis: c.emojis.filter(e => e.char === term || e.keywords.some(k => k.toLowerCase().includes(term))) }))
      .filter(c => c.emojis.length > 0)
  }, [q])

  function pick(c: string) { onChange(c); onClose() }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread">
          <strong>{t('foodForm.icon')}</strong>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <input placeholder={t('foodPicker.search')} value={q} onChange={e => setQ(e.target.value)}
          style={{ width: '100%', padding: 8, margin: '8px 0' }} />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {categories.map(c => (
            <div key={c.key}>
              <div className="muted" style={{ marginTop: 8 }}>{c.key}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {c.emojis.map(e => (
                  <button key={e.char} aria-label={e.char} onClick={() => pick(e.char)}
                    style={{ fontSize: 24, padding: 6, border: value === e.char ? '2px solid var(--accent)' : '1px solid var(--line)', borderRadius: 10, background: '#fff' }}>
                    {e.char}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <input data-testid="custom-emoji" placeholder="🙂" value={custom} onChange={e => setCustom(e.target.value)}
            style={{ width: 60, padding: 8, textAlign: 'center' }} />
          <button className="btn-accent" data-testid="custom-emoji-apply"
            onClick={() => { if (custom.trim()) pick(custom.trim()) }}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add modal styles to src/styles.css**

```css
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-end; justify-content: center; z-index: 50; }
.modal { background: var(--card); width: 100%; max-width: 480px; border-radius: 18px 18px 0 0; padding: 16px; max-height: 85vh; overflow-y: auto; }
@media (min-width: 520px) { .modal-backdrop { align-items: center; } .modal { border-radius: 18px; } }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/IconPicker.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/IconPicker.tsx src/components/IconPicker.test.tsx src/styles.css
git commit -m "feat: add curated food emoji icon picker"
```

---

### Task 17: FoodForm (New/Edit Food)

**Files:**
- Create: `src/components/FoodForm.tsx`
- Create: `src/components/NutritionFields.tsx`
- Test: `src/components/FoodForm.test.tsx`

**Interfaces:**
- Consumes: `Food`, `Serving`, `Nutrition` types; `newFood`, `newServing`, `cloneAsCustom`; `IconPicker`; i18n.
- Produces:
  - `NutritionFields({ nutrition, onChange }): JSX` — the full nested nutrition tree of number inputs (calories required; all others default 0).
  - `FoodForm({ initial?, onSave, onClose }): JSX` — full New/Edit form. `initial` optional (edit mode); if `initial.source === 'predefined'`, on save it clones via `cloneAsCustom`. Validates: name non-empty, ≥1 serving, calories is a number. Calls `onSave(food: Food)`.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { FoodForm } from './FoodForm'

describe('FoodForm', () => {
  it('requires a name and calories before saving', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('food-save'))
    expect(onSave).not.toHaveBeenCalled() // name empty
  })
  it('saves a new custom food', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('food-name'), { target: { value: 'Salad' } })
    fireEvent.change(screen.getByTestId('nutri-calories'), { target: { value: '150' } })
    fireEvent.click(screen.getByTestId('food-save'))
    expect(onSave).toHaveBeenCalled()
    const saved = onSave.mock.calls[0][0]
    expect(saved.name).toBe('Salad')
    expect(saved.nutrition.calories).toBe(150)
    expect(saved.source).toBe('custom')
  })
  it('cloning a predefined food yields a new custom id', () => {
    const onSave = vi.fn()
    const pre = { id: 'pre-x', name: 'Rice', icon: '🍚', source: 'predefined' as const, createdAt: '',
      servings: [{ id: 's', kind: 'weight' as const, label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: { calories: 130, fat:{total:0,mono:0,poly:0,saturated:0,trans:0}, cholesterol:0, sodium:0, carbs:{total:0,fiber:0,sugar:0}, protein:0, vitamins:{a:0,c:0,b1:0,b2:0,b3:0,b9:0,b6:0,b12:0}, minerals:{calcium:0,iron:0,magnesium:0,phosphorus:0,potassium:0,zinc:0}, caffeine:0 } }
    render(<FoodForm initial={pre} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('food-save'))
    const saved = onSave.mock.calls[0][0]
    expect(saved.id).not.toBe('pre-x')
    expect(saved.source).toBe('custom')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/FoodForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/components/NutritionFields.tsx**

```tsx
import { useTranslation } from 'react-i18next'
import type { Nutrition } from '../types'

type NumPath = (n: Nutrition, v: number) => Nutrition

function Field({ label, value, onChange, testId, indent }: { label: string; value: number; onChange: (v: number) => void; testId?: string; indent?: boolean }) {
  return (
    <div className="row spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', paddingInlineStart: indent ? 16 : 0 }}>
      <label style={{ color: indent ? 'var(--muted)' : 'inherit' }}>{label}</label>
      <input data-testid={testId} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : 0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: 90, textAlign: 'end', border: 'none', background: 'transparent' }} />
    </div>
  )
}

export function NutritionFields({ nutrition, onChange }: { nutrition: Nutrition; onChange: (n: Nutrition) => void }) {
  const { t } = useTranslation()
  const set: (fn: NumPath) => (v: number) => void = (fn) => (v) => onChange(fn(nutrition, v))
  return (
    <div className="card">
      <Field label={t('foodForm.calories')} value={nutrition.calories} testId="nutri-calories" onChange={set((n, v) => ({ ...n, calories: v }))} />
      <Field label={t('foodForm.fat')} value={nutrition.fat.total} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, total: v } }))} />
      <Field indent label={t('foodForm.mono')} value={nutrition.fat.mono} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, mono: v } }))} />
      <Field indent label={t('foodForm.poly')} value={nutrition.fat.poly} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, poly: v } }))} />
      <Field indent label={t('foodForm.saturated')} value={nutrition.fat.saturated} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, saturated: v } }))} />
      <Field indent label={t('foodForm.trans')} value={nutrition.fat.trans} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, trans: v } }))} />
      <Field label={t('foodForm.cholesterol')} value={nutrition.cholesterol} onChange={set((n, v) => ({ ...n, cholesterol: v }))} />
      <Field label={t('foodForm.sodium')} value={nutrition.sodium} onChange={set((n, v) => ({ ...n, sodium: v }))} />
      <Field label={t('foodForm.carbs')} value={nutrition.carbs.total} onChange={set((n, v) => ({ ...n, carbs: { ...n.carbs, total: v } }))} />
      <Field indent label={t('foodForm.fiber')} value={nutrition.carbs.fiber} onChange={set((n, v) => ({ ...n, carbs: { ...n.carbs, fiber: v } }))} />
      <Field indent label={t('foodForm.sugar')} value={nutrition.carbs.sugar} onChange={set((n, v) => ({ ...n, carbs: { ...n.carbs, sugar: v } }))} />
      <Field label={t('foodForm.protein')} value={nutrition.protein} onChange={set((n, v) => ({ ...n, protein: v }))} />
      <div className="muted" style={{ marginTop: 8 }}>{t('foodForm.vitamins')}</div>
      <Field indent label={t('foodForm.vitA')} value={nutrition.vitamins.a} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, a: v } }))} />
      <Field indent label={t('foodForm.vitC')} value={nutrition.vitamins.c} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, c: v } }))} />
      <Field indent label={t('foodForm.b1')} value={nutrition.vitamins.b1} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b1: v } }))} />
      <Field indent label={t('foodForm.b2')} value={nutrition.vitamins.b2} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b2: v } }))} />
      <Field indent label={t('foodForm.b3')} value={nutrition.vitamins.b3} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b3: v } }))} />
      <Field indent label={t('foodForm.b9')} value={nutrition.vitamins.b9} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b9: v } }))} />
      <Field indent label={t('foodForm.b6')} value={nutrition.vitamins.b6} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b6: v } }))} />
      <Field indent label={t('foodForm.b12')} value={nutrition.vitamins.b12} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b12: v } }))} />
      <div className="muted" style={{ marginTop: 8 }}>{t('foodForm.minerals')}</div>
      <Field indent label={t('foodForm.calcium')} value={nutrition.minerals.calcium} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, calcium: v } }))} />
      <Field indent label={t('foodForm.iron')} value={nutrition.minerals.iron} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, iron: v } }))} />
      <Field indent label={t('foodForm.magnesium')} value={nutrition.minerals.magnesium} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, magnesium: v } }))} />
      <Field indent label={t('foodForm.phosphorus')} value={nutrition.minerals.phosphorus} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, phosphorus: v } }))} />
      <Field indent label={t('foodForm.potassium')} value={nutrition.minerals.potassium} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, potassium: v } }))} />
      <Field indent label={t('foodForm.zinc')} value={nutrition.minerals.zinc} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, zinc: v } }))} />
      <Field label={t('foodForm.caffeine')} value={nutrition.caffeine} onChange={set((n, v) => ({ ...n, caffeine: v }))} />
    </div>
  )
}
```

- [ ] **Step 4: Implement src/components/FoodForm.tsx**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Food, Serving } from '../types'
import { newFood, newServing, cloneAsCustom } from '../lib/food'
import { newId } from '../lib/ids'
import { IconPicker } from './IconPicker'
import { NutritionFields } from './NutritionFields'

export function FoodForm({ initial, onSave, onClose }: { initial?: Food; onSave: (f: Food) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [food, setFood] = useState<Food>(() => initial ? JSON.parse(JSON.stringify(initial)) : newFood())
  const [showIcon, setShowIcon] = useState(false)
  const [error, setError] = useState('')

  function updateServing(id: string, patch: Partial<Serving>) {
    setFood(f => ({ ...f, servings: f.servings.map(s => s.id === id ? { ...s, ...patch } : s) }))
  }
  function addServing() { setFood(f => ({ ...f, servings: [...f.servings, newServing({ isPrimary: false })] })) }
  function makePrimary(id: string) {
    setFood(f => ({ ...f, servings: f.servings.map(s => ({ ...s, isPrimary: s.id === id })) }))
  }

  function save() {
    if (!food.name.trim()) { setError(t('foodForm.foodName')); return }
    if (food.servings.length < 1) { setError(t('foodForm.oneServingRequired')); return }
    let out = food
    if (initial?.source === 'predefined') out = { ...cloneAsCustom(initial), ...food, id: newId(), source: 'custom' }
    else out = { ...food, source: 'custom' }
    onSave(out)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread">
          <button className="btn-ghost" onClick={onClose}>✕</button>
          <strong>{initial ? t('foodForm.editFood') : t('foodForm.newFood')}</strong>
          <button className="btn-accent" data-testid="food-save" onClick={save}>✓</button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
        <div className="card">
          <input data-testid="food-name" placeholder={t('foodForm.foodName')} value={food.name}
            onChange={e => setFood({ ...food, name: e.target.value })} style={{ width: '100%', padding: 8, border: 'none', borderBottom: '1px solid var(--line)' }} />
          <input placeholder={t('foodForm.brand')} value={food.brand ?? ''}
            onChange={e => setFood({ ...food, brand: e.target.value })} style={{ width: '100%', padding: 8, border: 'none', borderBottom: '1px solid var(--line)' }} />
          <button className="row spread" style={{ width: '100%', padding: 8, background: 'transparent', border: 'none' }} onClick={() => setShowIcon(true)}>
            <span>{t('foodForm.icon')}</span><span style={{ fontSize: 22 }}>{food.icon}</span>
          </button>
        </div>
        <div className="card">
          <strong>{t('foodForm.nutritionFacts')}</strong>
          <div className="muted">{t('foodForm.servingsNote')}</div>
          {food.servings.map(s => (
            <div key={s.id} className="row spread" style={{ padding: '8px 0' }}>
              <input value={s.label} onChange={e => updateServing(s.id, { label: e.target.value })} style={{ width: 90 }} />
              <input type="number" value={s.amount} onChange={e => updateServing(s.id, { amount: parseFloat(e.target.value) || 0 })} style={{ width: 70, textAlign: 'end' }} />
              <input value={s.unit} onChange={e => updateServing(s.id, { unit: e.target.value })} style={{ width: 50 }} />
              <label className="muted"><input type="radio" name="primary" checked={s.isPrimary} onChange={() => makePrimary(s.id)} /> ★</label>
            </div>
          ))}
          <button className="btn-ghost" onClick={addServing}>{t('foodForm.addServing')}</button>
        </div>
        <NutritionFields nutrition={food.nutrition} onChange={n => setFood({ ...food, nutrition: n })} />
      </div>
      {showIcon && <IconPicker value={food.icon} onChange={c => setFood(f => ({ ...f, icon: c }))} onClose={() => setShowIcon(false)} />}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/FoodForm.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/FoodForm.tsx src/components/NutritionFields.tsx src/components/FoodForm.test.tsx
git commit -m "feat: add new/edit food form with full nutrition fields"
```

---

### Task 18: FoodPicker + QuantitySheet

**Files:**
- Create: `src/components/QuantitySheet.tsx`
- Create: `src/components/FoodPicker.tsx`
- Test: `src/components/FoodPicker.test.tsx`

**Interfaces:**
- Consumes: `useApp` (allFoods, predefined, myFoods, addMyFood); `Food`, `LogEntry`, `Serving`; `primaryServing`, `entryNutrition`; `newId`; `FoodForm`; i18n; `formatHeader`/date for the created date.
- Produces:
  - `QuantitySheet({ food, onConfirm, onClose }): JSX` — pick a serving + quantity; live calorie preview; confirm calls `onConfirm(entry: LogEntry)`.
  - `FoodPicker({ onPick, onClose }): JSX` — search + tabs All/My Foods; alphabetical sections; each row shows icon, name, `X cals per Y label`, created date, a `+` that opens QuantitySheet; My Foods tab has "+ New Food" opening FoodForm; `onPick(entry)` bubbles a confirmed entry.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { FoodPicker } from './FoodPicker'

describe('FoodPicker', () => {
  it('lists predefined foods under All and filters by search', () => {
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    expect(screen.getByText(/Rice/i)).toBeInTheDocument()
  })
  it('adding a food opens the quantity sheet and confirms an entry', () => {
    const onPick = vi.fn()
    render(<AppProvider><FoodPicker onPick={onPick} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-add')[0])
    fireEvent.click(screen.getByTestId('qty-confirm'))
    expect(onPick).toHaveBeenCalled()
    expect(onPick.mock.calls[0][0].quantity).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/FoodPicker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/components/QuantitySheet.tsx**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Food, LogEntry } from '../types'
import { primaryServing, entryNutrition } from '../lib/nutrition'
import { newId } from '../lib/ids'

export function QuantitySheet({ food, onConfirm, onClose }: { food: Food; onConfirm: (e: LogEntry) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [servingId, setServingId] = useState(primaryServing(food).id)
  const [qty, setQty] = useState(primaryServing(food).amount)
  const entry: LogEntry = { id: newId(), foodSnapshot: food, servingId, quantity: qty }
  const cals = Math.round(entryNutrition(entry).calories)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread"><strong>{food.icon} {food.name}</strong><button className="btn-ghost" onClick={onClose}>✕</button></div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input data-testid="qty-input" type="number" inputMode="decimal" value={qty}
            onChange={e => setQty(parseFloat(e.target.value) || 0)} style={{ width: 100, padding: 8 }} />
          <select value={servingId} onChange={e => setServingId(e.target.value)} style={{ padding: 8 }}>
            {food.servings.map(s => <option key={s.id} value={s.id}>{s.label} ({s.amount}{s.unit})</option>)}
          </select>
        </div>
        <div style={{ margin: '10px 0', fontSize: 20, fontWeight: 700 }}>{cals} cals</div>
        <button className="btn-accent" data-testid="qty-confirm" onClick={() => { onConfirm(entry); onClose() }}>{t('common.add')}</button>
      </div>
    </div>
  )
}
```

Note: quantity is expressed in the primary serving's unit basis; the `servingId` records the user's chosen serving for display. `entryNutrition` scales by `quantity / primaryServing.amount` per Global Constraints.

- [ ] **Step 4: Implement src/components/FoodPicker.tsx**

```tsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { Food, LogEntry } from '../types'
import { primaryServing } from '../lib/nutrition'
import { QuantitySheet } from './QuantitySheet'
import { FoodForm } from './FoodForm'

function groupByLetter(foods: Food[]): [string, Food[]][] {
  const map = new Map<string, Food[]>()
  for (const f of [...foods].sort((a, b) => a.name.localeCompare(b.name))) {
    const letter = (f.name[0] || '#').toUpperCase()
    map.set(letter, [...(map.get(letter) ?? []), f])
  }
  return [...map.entries()]
}

export function FoodPicker({ onPick, onClose }: { onPick: (e: LogEntry) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const { predefined, myFoods, addMyFood } = useApp()
  const [tab, setTab] = useState<'all' | 'my'>('all')
  const [q, setQ] = useState('')
  const [picking, setPicking] = useState<Food | null>(null)
  const [creating, setCreating] = useState(false)
  const [count, setCount] = useState(0)

  const source = tab === 'all' ? predefined : myFoods
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? source.filter(f => f.name.toLowerCase().includes(term) || (f.brand ?? '').toLowerCase().includes(term)) : source
  }, [source, q])
  const groups = useMemo(() => groupByLetter(filtered), [filtered])

  function confirm(entry: LogEntry) { setCount(c => c + 1); onPick(entry) }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread">
          <span className="muted">{count}</span>
          <input placeholder={t('foodPicker.search')} value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, padding: 8, margin: '0 8px' }} />
          <button className="btn-accent" onClick={onClose}>✓</button>
        </div>
        <div className="row" style={{ gap: 8, margin: '10px 0' }}>
          <button className={tab === 'all' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('all')}>{t('foodPicker.all')}</button>
          <button className={tab === 'my' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('my')}>{t('foodPicker.myFoods')}</button>
          {tab === 'my' && <button className="btn-ghost" data-testid="new-food" onClick={() => setCreating(true)}>+ {t('foodPicker.newFood')}</button>}
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {groups.map(([letter, foods]) => (
            <div key={letter}>
              <div className="muted" style={{ marginTop: 8 }}>{letter}</div>
              {foods.map(f => {
                const ps = primaryServing(f)
                return (
                  <div key={f.id} className="row spread card" style={{ padding: 10 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{f.icon}</span>
                      <div>
                        <div>{f.name}</div>
                        <div className="muted">{t('foodPicker.perServing', { cal: Math.round(f.nutrition.calories), amount: ps.amount, label: ps.label })}</div>
                      </div>
                    </div>
                    <button className="btn-ghost" data-testid="food-add" aria-label={`add ${f.name}`} style={{ fontSize: 22 }} onClick={() => setPicking(f)}>＋</button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {picking && <QuantitySheet food={picking} onConfirm={confirm} onClose={() => setPicking(null)} />}
      {creating && <FoodForm onSave={f => { addMyFood(f); setTab('my') }} onClose={() => setCreating(false)} />}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/FoodPicker.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/QuantitySheet.tsx src/components/FoodPicker.tsx src/components/FoodPicker.test.tsx
git commit -m "feat: add food picker and quantity sheet"
```

---

### Task 19: MealCard + Log screen

**Files:**
- Create: `src/components/MealCard.tsx`
- Modify: `src/routes/Log.tsx`
- Create: `src/components/CalendarModal.tsx` (stub used here; full impl in Task 20)
- Test: `src/components/MealCard.test.tsx`

**Interfaces:**
- Consumes: `useApp` (day, addEntry, deleteEntry, clearMeal, settings); `MealCard`; `FoodPicker`; `DateHeader`; nutrition helpers; `MEAL_KEYS`; i18n.
- Produces:
  - `MealCard({ meal }): JSX` — title + total cals, macro subtotals, list of entries (icon, name, quantity, cals, delete), "Add Food" button opening the FoodPicker into this meal, `···` menu to clear the meal.
  - `Log` screen — DateHeader + four MealCards; opening/closing the CalendarModal.
  - `CalendarModal({ onClose }): JSX` stub (renders a placeholder; replaced in Task 20).

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { MealCard } from './MealCard'

describe('MealCard', () => {
  it('adds a food via the picker and shows it with calories', () => {
    render(<AppProvider><MealCard meal="breakfast" /></AppProvider>)
    fireEvent.click(screen.getByText(/Add Food/i))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-add')[0])
    fireEvent.click(screen.getByTestId('qty-confirm'))
    // entry now visible in the card
    expect(screen.getByTestId('meal-total').textContent).toMatch(/\d/)
    expect(screen.getAllByText(/Rice/i).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/MealCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create src/components/CalendarModal.tsx (stub)**

```tsx
export function CalendarModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} data-testid="calendar-stub">Calendar</div>
    </div>
  )
}
```

- [ ] **Step 4: Implement src/components/MealCard.tsx**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { MealKey } from '../types'
import { mealNutrition, entryNutrition, primaryServing } from '../lib/nutrition'
import { FoodPicker } from './FoodPicker'

export function MealCard({ meal }: { meal: MealKey }) {
  const { t } = useTranslation()
  const { day, addEntry, deleteEntry, clearMeal } = useApp()
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
  const entries = day.meals[meal]
  const n = mealNutrition(day, meal)

  return (
    <div className="card">
      <div className="row spread">
        <strong>{t(`meal.${meal}`)}: {t('meal.cals', { n: Math.round(n.calories) })}</strong>
        <button className="btn-ghost" aria-label="menu" onClick={() => setMenu(m => !m)}>⋯</button>
      </div>
      <div className="muted" data-testid="meal-total">{t('meal.proteinFiber', { p: Math.round(n.protein), f: Math.round(n.carbs.fiber) })}</div>
      {menu && <button className="btn-ghost" onClick={() => { clearMeal(meal); setMenu(false) }}>{t('meal.clear')}</button>}
      {entries.map(e => {
        const ps = primaryServing(e.foodSnapshot)
        return (
          <div key={e.id} className="row spread" style={{ padding: '8px 0' }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20 }}>{e.foodSnapshot.icon}</span>
              <div>
                <div>{e.foodSnapshot.name}</div>
                <div className="muted">{e.quantity} {ps.label}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span>{Math.round(entryNutrition(e).calories)}</span>
              <button className="btn-ghost" aria-label={`delete ${e.foodSnapshot.name}`} onClick={() => deleteEntry(meal, e.id)}>✕</button>
            </div>
          </div>
        )
      })}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn-accent" onClick={() => setAdding(true)}>{t('meal.addFood')}</button>
      </div>
      {adding && <FoodPicker onPick={e => addEntry(meal, e)} onClose={() => setAdding(false)} />}
    </div>
  )
}
```

- [ ] **Step 5: Implement src/routes/Log.tsx**

```tsx
import { useState } from 'react'
import { MEAL_KEYS } from '../types'
import { DateHeader } from '../components/DateHeader'
import { MealCard } from '../components/MealCard'
import { CalendarModal } from '../components/CalendarModal'

export default function Log() {
  const [cal, setCal] = useState(false)
  return (
    <div className="screen">
      <DateHeader onOpenCalendar={() => setCal(true)} />
      {MEAL_KEYS.map(m => <MealCard key={m} meal={m} />)}
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/MealCard.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/MealCard.tsx src/routes/Log.tsx src/components/CalendarModal.tsx src/components/MealCard.test.tsx
git commit -m "feat: add meal cards and log screen"
```

---

### Task 20: CalendarModal (full)

**Files:**
- Modify: `src/components/CalendarModal.tsx` (replace stub)
- Test: `src/components/CalendarModal.test.tsx`

**Interfaces:**
- Consumes: `useApp` (days, selectedDate, setSelectedDate, settings); `monthGrid`, `weekOf`, `fromDateKey`, `toDateKey`, `todayKey`; `getDay`, `emptyDay`; `dayFoodNutrition`, `underOver`; `CalorieRing`; i18n.
- Produces: `CalendarModal({ onClose })` — month grid with a per-day `CalorieRing`, a right "Week" column with each week's Under/Over badge; month `‹ ›` nav; "Today" button; selecting a day calls `setSelectedDate` and `onClose`.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { CalendarModal } from './CalendarModal'

describe('CalendarModal', () => {
  it('shows a month grid and selecting a day closes it', () => {
    const onClose = vi.fn()
    render(<AppProvider><CalendarModal onClose={onClose} /></AppProvider>)
    // day cells are buttons labeled with the day number
    const anyDay = screen.getAllByTestId('cal-day')[10]
    fireEvent.click(anyDay)
    expect(onClose).toHaveBeenCalled()
  })
  it('renders weekly under/over badges', () => {
    render(<AppProvider><CalendarModal onClose={() => {}} /></AppProvider>)
    expect(screen.getAllByTestId('week-badge').length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CalendarModal.test.tsx`
Expected: FAIL (stub has no cal-day/week-badge testids).

- [ ] **Step 3: Implement src/components/CalendarModal.tsx**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { monthGrid, weekOf, fromDateKey, toDateKey, todayKey } from '../lib/date'
import { getDay } from '../lib/storage'
import { dayFoodNutrition, underOver } from '../lib/nutrition'
import { CalorieRing } from './CalorieRing'

export function CalendarModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { days, selectedDate, setSelectedDate, settings } = useApp()
  const sel = fromDateKey(selectedDate)
  const [year, setYear] = useState(sel.getFullYear())
  const [month0, setMonth0] = useState(sel.getMonth())

  const grid = monthGrid(year, month0)
  const dow = ['mon','tue','wed','thu','fri','sat','sun'] as const

  function shiftMonth(delta: number) {
    const d = new Date(year, month0 + delta, 1)
    setYear(d.getFullYear()); setMonth0(d.getMonth())
  }
  function goToday() {
    const tk = fromDateKey(todayKey()); setYear(tk.getFullYear()); setMonth0(tk.getMonth())
  }
  function selectDay(key: string) { setSelectedDate(key); onClose() }

  const monthName = new Date(year, month0, 1).toLocaleDateString(settings.language, { month: 'long' })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread">
          <strong>{monthName} {year}</strong>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="row spread" style={{ margin: '8px 0' }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn-ghost" onClick={() => shiftMonth(-1)}>‹</button>
            <button className="btn-ghost" onClick={() => shiftMonth(1)}>›</button>
          </div>
          <button className="btn-ghost" onClick={goToday}>{t('common.today')}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 1.2fr', gap: 4, fontSize: 11 }}>
          {dow.map(d => <div key={d} className="muted" style={{ textAlign: 'center' }}>{t(`calendar.${d}`)}</div>)}
          <div className="muted" style={{ textAlign: 'center' }}>{t('common.week')}</div>
          {grid.map((week, wi) => {
            const weekKeys = weekOf(week[0])
            const weekFood = weekKeys.reduce((s, k) => s + dayFoodNutrition(getDay(days, k)).calories, 0)
            const weekBudget = settings.dailyBudget * 7
            const wUO = weekBudget - weekFood >= 0
              ? { kind: 'under' as const, amount: Math.round(weekBudget - weekFood) }
              : { kind: 'over' as const, amount: Math.round(weekFood - weekBudget) }
            return (
              <WeekRow key={wi} week={week} month0={month0} days={days} budget={settings.dailyBudget}
                selectedDate={selectedDate} onSelect={selectDay} wUO={wUO} />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeekRow({ week, month0, days, budget, selectedDate, onSelect, wUO }: {
  week: string[]; month0: number; days: Record<string, any>; budget: number;
  selectedDate: string; onSelect: (k: string) => void; wUO: { kind: 'under' | 'over'; amount: number }
}) {
  return (
    <>
      {week.map(key => {
        const d = fromDateKey(key)
        const inMonth = d.getMonth() === month0
        const food = dayFoodNutrition(getDay(days, key)).calories
        const isSel = key === selectedDate
        return (
          <button key={key} data-testid="cal-day" onClick={() => onSelect(key)}
            style={{ background: 'transparent', border: isSel ? '2px solid var(--accent)' : 'none', borderRadius: 10, padding: 2, opacity: inMonth ? 1 : 0.35 }}>
            <div style={{ fontSize: 10 }}>{d.getDate()}</div>
            <CalorieRing consumed={food} budget={budget} size={26} />
          </button>
        )
      })}
      <div data-testid="week-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ background: wUO.kind === 'under' ? 'var(--green)' : 'var(--red)', color: '#fff', borderRadius: 6, padding: '1px 4px', fontSize: 10 }}>
          {wUO.kind === 'under' ? 'UNDER' : 'OVER'} {wUO.amount}
        </span>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/CalendarModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CalendarModal.tsx src/components/CalendarModal.test.tsx
git commit -m "feat: add full calendar modal with rings and weekly badges"
```

---

### Task 21: LanguageSwitcher + BuildInfo + Dashboard screen

**Files:**
- Create: `src/components/LanguageSwitcher.tsx`
- Create: `src/components/BuildInfo.tsx`
- Modify: `src/routes/Dashboard.tsx`
- Test: `src/components/LanguageSwitcher.test.tsx`
- Test: `src/routes/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `useApp` (settings, setLanguage, day); `LANGUAGES`, `LANGUAGE_NATIVE_NAMES`; `BudgetGauge`, `MacroBar`, `DateHeader`, `CalendarModal`; `dayFoodNutrition`; build globals; i18n.
- Produces:
  - `LanguageSwitcher()` — `🌐 {current}` button opening a sheet of the 6 languages by native name; selecting calls `setLanguage`.
  - `BuildInfo()` — `v{__APP_VERSION__} · {__GIT_SHA__} · {__BUILD_TIME__}`; click copies the string.
  - `Dashboard` — DateHeader, LanguageSwitcher, BudgetGauge, macro bars (Protein, Fiber), BuildInfo, CalendarModal.

- [ ] **Step 1: Write failing tests**

`src/components/LanguageSwitcher.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { LanguageSwitcher } from './LanguageSwitcher'

describe('LanguageSwitcher', () => {
  it('opens a sheet and switches to Chinese', () => {
    render(<AppProvider><LanguageSwitcher /></AppProvider>)
    fireEvent.click(screen.getByTestId('lang-button'))
    fireEvent.click(screen.getByText('中文'))
    // dir stays ltr for zh; button now shows zh native name
    expect(screen.getByTestId('lang-button').textContent).toContain('中文')
  })
  it('switching to Arabic sets rtl', () => {
    render(<AppProvider><LanguageSwitcher /></AppProvider>)
    fireEvent.click(screen.getByTestId('lang-button'))
    fireEvent.click(screen.getByText('العربية'))
    expect(document.documentElement.dir).toBe('rtl')
  })
})
```

`src/routes/Dashboard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  it('renders the budget gauge and a version badge', () => {
    render(<AppProvider><Dashboard /></AppProvider>)
    expect(screen.getByTestId('gauge-remaining')).toBeInTheDocument()
    expect(screen.getByTestId('build-info').textContent).toMatch(/^v/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/LanguageSwitcher.test.tsx src/routes/Dashboard.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement src/components/LanguageSwitcher.tsx**

```tsx
import { useState } from 'react'
import { useApp } from '../state/useApp'
import { LANGUAGES } from '../types'
import { LANGUAGE_NATIVE_NAMES } from '../i18n'

export function LanguageSwitcher() {
  const { settings, setLanguage } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn-ghost" data-testid="lang-button" onClick={() => setOpen(true)}>
        🌐 {LANGUAGE_NATIVE_NAMES[settings.language]}
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {LANGUAGES.map(l => (
              <button key={l} className="row spread" style={{ width: '100%', padding: 12, background: 'transparent', border: 'none', borderBottom: '1px solid var(--line)' }}
                onClick={() => { setLanguage(l); setOpen(false) }}>
                <span>{LANGUAGE_NATIVE_NAMES[l]}</span>
                {settings.language === l && <span style={{ color: 'var(--accent)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Implement src/components/BuildInfo.tsx**

```tsx
export function BuildInfo() {
  const text = `v${__APP_VERSION__} · ${__GIT_SHA__} · ${__BUILD_TIME__}`
  return (
    <button data-testid="build-info" className="muted"
      style={{ display: 'block', width: '100%', textAlign: 'center', background: 'transparent', border: 'none', padding: 12, fontSize: 11 }}
      onClick={() => { navigator.clipboard?.writeText(text) }}>
      {text}
    </button>
  )
}
```

- [ ] **Step 5: Implement src/routes/Dashboard.tsx**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { DateHeader } from '../components/DateHeader'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { BudgetGauge } from '../components/BudgetGauge'
import { MacroBar } from '../components/MacroBar'
import { BuildInfo } from '../components/BuildInfo'
import { CalendarModal } from '../components/CalendarModal'
import { dayFoodNutrition } from '../lib/nutrition'

export default function Dashboard() {
  const { t } = useTranslation()
  const { day, settings } = useApp()
  const [cal, setCal] = useState(false)
  const n = dayFoodNutrition(day)
  return (
    <div className="screen">
      <div className="row spread">
        <DateHeader onOpenCalendar={() => setCal(true)} />
        <LanguageSwitcher />
      </div>
      <BudgetGauge budget={settings.dailyBudget} day={day} />
      <div className="card row" style={{ gap: 16 }}>
        <MacroBar label={t('dashboard.protein')} current={n.protein} target={settings.macroTargets.protein} />
        <MacroBar label={t('dashboard.fiber')} current={n.carbs.fiber} target={settings.macroTargets.fiber} />
      </div>
      <BuildInfo />
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/LanguageSwitcher.test.tsx src/routes/Dashboard.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/LanguageSwitcher.tsx src/components/BuildInfo.tsx src/routes/Dashboard.tsx src/components/LanguageSwitcher.test.tsx src/routes/Dashboard.test.tsx
git commit -m "feat: add language switcher, build info, and dashboard"
```

---

### Task 22: Goals / Settings screen (budget, macros, exercise, import/export, backup)

**Files:**
- Create: `src/lib/download.ts`
- Modify: `src/routes/Goals.tsx`
- Test: `src/routes/Goals.test.tsx`

**Interfaces:**
- Consumes: `useApp` (settings, updateSettings, day, addExercise, deleteExercise, myFoods, days, importMyFoods, replaceAll); `exportFoods`, `parseFoodsImport`, `exportBackup`, `parseBackup`; `newId`; build globals; i18n.
- Produces:
  - `download(filename: string, text: string): void`, `readFileText(file: File): Promise<string>`.
  - `Goals` screen — number inputs for `dailyBudget`, protein target, fiber target (persist on change); an Exercise section (add/delete `ExerciseEntry` for the selected day); Data section with Export Foods, Import Foods (file input), Export Backup, Import Backup; version + Check for updates row.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Goals from './Goals'

describe('Goals', () => {
  it('edits the daily budget and persists it', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('budget-input'), { target: { value: '2012' } })
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(2012)
  })
  it('adds an exercise entry', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('exercise-name'), { target: { value: 'Run' } })
    fireEvent.change(screen.getByTestId('exercise-cals'), { target: { value: '120' } })
    fireEvent.click(screen.getByTestId('exercise-add'))
    expect(screen.getByText(/Run/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/Goals.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/lib/download.ts**

```ts
export function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
```

- [ ] **Step 4: Implement src/routes/Goals.tsx**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { exportFoods, parseFoodsImport, exportBackup, parseBackup } from '../lib/importExport'
import { download, readFileText } from '../lib/download'
import { newId } from '../lib/ids'

export default function Goals() {
  const { t } = useTranslation()
  const { settings, updateSettings, day, addExercise, deleteExercise, myFoods, days, importMyFoods, replaceAll } = useApp()
  const [exName, setExName] = useState('')
  const [exCals, setExCals] = useState(0)
  const [msg, setMsg] = useState('')

  async function onImportFoods(file?: File) {
    if (!file) return
    try { const n = importMyFoods(parseFoodsImport(await readFileText(file))); setMsg(t('goals.importFoodsDone', { n })) }
    catch (e) { setMsg(t('goals.importError', { msg: (e as Error).message })) }
  }
  async function onImportBackup(file?: File) {
    if (!file) return
    try { replaceAll(parseBackup(await readFileText(file))); setMsg(t('common.done')) }
    catch (e) { setMsg(t('goals.importError', { msg: (e as Error).message })) }
  }

  return (
    <div className="screen">
      <h2>{t('goals.title')}</h2>
      <div className="card">
        <label className="row spread">{t('goals.dailyBudget')}
          <input data-testid="budget-input" type="number" value={settings.dailyBudget}
            onChange={e => updateSettings({ dailyBudget: parseInt(e.target.value) || 0 })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.proteinTarget')}
          <input type="number" value={settings.macroTargets.protein}
            onChange={e => updateSettings({ macroTargets: { ...settings.macroTargets, protein: parseInt(e.target.value) || 0 } })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.fiberTarget')}
          <input type="number" value={settings.macroTargets.fiber}
            onChange={e => updateSettings({ macroTargets: { ...settings.macroTargets, fiber: parseInt(e.target.value) || 0 } })} style={{ width: 100, textAlign: 'end' }} /></label>
      </div>

      <div className="card">
        <strong>{t('dashboard.exercise')}</strong>
        {day.exercise.map(e => (
          <div key={e.id} className="row spread" style={{ padding: '6px 0' }}>
            <span>{e.name}</span>
            <div className="row" style={{ gap: 8 }}><span>{e.caloriesBurned}</span>
              <button className="btn-ghost" onClick={() => deleteExercise(e.id)}>✕</button></div>
          </div>
        ))}
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input data-testid="exercise-name" placeholder="Run" value={exName} onChange={e => setExName(e.target.value)} style={{ flex: 1 }} />
          <input data-testid="exercise-cals" type="number" value={exCals} onChange={e => setExCals(parseInt(e.target.value) || 0)} style={{ width: 80 }} />
          <button className="btn-accent" data-testid="exercise-add"
            onClick={() => { if (exName.trim()) { addExercise({ id: newId(), name: exName.trim(), caloriesBurned: exCals }); setExName(''); setExCals(0) } }}>{t('common.add')}</button>
        </div>
      </div>

      <div className="card">
        <strong>{t('goals.data')}</strong>
        <div className="muted">{t('goals.backupNote')}</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn-ghost" onClick={() => download('foods.json', exportFoods(myFoods))}>{t('goals.exportFoods')}</button>
          <label className="btn-ghost">{t('goals.importFoods')}
            <input type="file" accept="application/json" hidden onChange={e => onImportFoods(e.target.files?.[0] ?? undefined)} /></label>
          <button className="btn-ghost" onClick={() => download('backup.json', exportBackup({ days, myFoods, settings }))}>{t('goals.exportBackup')}</button>
          <label className="btn-ghost">{t('goals.importBackup')}
            <input type="file" accept="application/json" hidden onChange={e => onImportBackup(e.target.files?.[0] ?? undefined)} /></label>
        </div>
        {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
      </div>

      <div className="card row spread">
        <span className="muted">{t('dashboard.version')}: v{__APP_VERSION__} ({__GIT_SHA__})</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/routes/Goals.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/download.ts src/routes/Goals.tsx src/routes/Goals.test.tsx
git commit -m "feat: add goals/settings with exercise, import/export, backup"
```

---

### Task 23: Update banner + iOS foreground update check

**Files:**
- Create: `src/components/UpdateBanner.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx` (render `<UpdateBanner />`)
- Test: `src/components/UpdateBanner.test.tsx`

**Interfaces:**
- Consumes: `virtual:pwa-register/react` (`useRegisterSW`); i18n.
- Produces: `UpdateBanner()` — shows "New version available — Update" when `needRefresh`; clicking calls `updateServiceWorker(true)`. Also registers an `onRegisteredSW` callback that re-checks for updates on `visibilitychange` (foreground) and every 60 min.

- [ ] **Step 1: Write failing test (mock the virtual module)**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'

const updateSpy = vi.fn()
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: updateSpy,
  }),
}))

import { UpdateBanner } from './UpdateBanner'

describe('UpdateBanner', () => {
  it('shows when a refresh is needed and triggers update on click', () => {
    render(<UpdateBanner />)
    fireEvent.click(screen.getByText(/Update/i))
    expect(updateSpy).toHaveBeenCalledWith(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/UpdateBanner.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/components/UpdateBanner.tsx**

```tsx
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateBanner() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => { if (document.visibilityState === 'visible') registration.update() }
      document.addEventListener('visibilitychange', check)
      setInterval(check, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div style={{ position: 'fixed', insetInline: 12, bottom: 'calc(var(--nav-h) + 12px)', zIndex: 100,
      background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{t('update.available')}</span>
      <button className="btn-ghost" style={{ color: '#fff', fontWeight: 700 }} onClick={() => updateServiceWorker(true)}>{t('update.reload')}</button>
    </div>
  )
}
```

- [ ] **Step 4: Update src/main.tsx to remove the manual registerSW call**

Since `useRegisterSW` now handles registration, remove the `registerSW({ immediate: true })` line and its import from `src/main.tsx` to avoid double registration. The file becomes:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import './styles.css'
import { AppProvider } from './state/AppContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 5: Render UpdateBanner in src/App.tsx**

Add the import and place `<UpdateBanner />` just before `<BottomNav />`:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UpdateBanner } from './components/UpdateBanner'
import Dashboard from './routes/Dashboard'
import Log from './routes/Log'
import Goals from './routes/Goals'

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<Log />} />
          <Route path="/goals" element={<Goals />} />
        </Routes>
        <UpdateBanner />
        <BottomNav />
      </div>
    </HashRouter>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/UpdateBanner.test.tsx`
Expected: PASS.

- [ ] **Step 7: Full test + build**

Run: `npm run test && npm run build`
Expected: all tests pass; production build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/UpdateBanner.tsx src/main.tsx src/App.tsx src/components/UpdateBanner.test.tsx
git commit -m "feat: add update banner with iOS foreground update check"
```

---

### Task 24: Real translations for zh, es, fr, ar, ru

**Files:**
- Modify: `src/i18n/locales/zh.json`, `es.json`, `fr.json`, `ar.json`, `ru.json`

**Interfaces:**
- Consumes: the `en.json` key structure from Task 11.
- Produces: fully translated locale files with the EXACT same key structure as `en.json` (the i18n test from Task 11 enforces this).

- [ ] **Step 1: Translate each locale file**

Replace each stub with a translation of every value in `en.json`, keeping keys and interpolation placeholders (`{{n}}`, `{{cal}}`, `{{amount}}`, `{{label}}`, `{{p}}`, `{{f}}`, `{{month}}`, `{{year}}`, `{{msg}}`) intact. Do NOT translate placeholder names.

Guidance per language (translate all keys, not just these samples):
- **zh (中文):** `nav.dashboard`="仪表盘", `nav.log`="记录", `nav.goals`="目标", `meal.breakfast`="早餐", `meal.lunch`="午餐", `meal.dinner`="晚餐", `meal.snacks`="零食", `dashboard.under`="低于", `dashboard.over`="超出", `foodPicker.all`="全部", `foodPicker.myFoods`="我的食物", `common.add`="添加", `common.today`="今天".
- **es (Español):** `nav.dashboard`="Panel", `nav.log`="Registro", `nav.goals`="Metas", `meal.breakfast`="Desayuno", `meal.lunch`="Almuerzo", `meal.dinner`="Cena", `meal.snacks`="Snacks", `dashboard.under`="Debajo", `dashboard.over`="Excedido", `common.today`="Hoy".
- **fr (Français):** `nav.dashboard`="Tableau de bord", `nav.log`="Journal", `nav.goals`="Objectifs", `meal.breakfast`="Petit-déjeuner", `meal.lunch`="Déjeuner", `meal.dinner`="Dîner", `meal.snacks`="Collations", `dashboard.under`="Sous", `dashboard.over`="Au-dessus", `common.today`="Aujourd'hui".
- **ar (العربية):** `nav.dashboard`="لوحة", `nav.log`="السجل", `nav.goals`="الأهداف", `meal.breakfast`="الفطور", `meal.lunch`="الغداء", `meal.dinner`="العشاء", `meal.snacks`="وجبات خفيفة", `dashboard.under`="أقل", `dashboard.over`="أكثر", `common.today`="اليوم".
- **ru (Русский):** `nav.dashboard`="Панель", `nav.log`="Журнал", `nav.goals`="Цели", `meal.breakfast`="Завтрак", `meal.lunch`="Обед", `meal.dinner`="Ужин", `meal.snacks`="Перекусы", `dashboard.under`="Осталось", `dashboard.over`="Превышено", `common.today`="Сегодня".

Translate every remaining key (foodForm.*, calendar.*, goals.*, update.*, etc.) consistently in each language. When a nutrient/technical term has no common local word, a transliteration or the English term is acceptable.

- [ ] **Step 2: Run the i18n key-parity test**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS — every locale still has the same key set as `en`.

- [ ] **Step 3: Manually verify a switch in the browser**

Run: `npm run dev` → open the app → switch languages via the Dashboard 🌐 button → confirm nav labels and meal names change, and Arabic flips to RTL. Ctrl-C to stop.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales
git commit -m "feat: add translations for zh, es, fr, ar, ru"
```

---

### Task 25: First deploy + README

**Files:**
- Create: `README.md`
- (Uses `.github/workflows/deploy.yml` from Task 1)

**Interfaces:**
- Consumes: the GitHub remote configured to `Agileaq/CalorieCounter`; the deploy workflow.
- Produces: a live app at `https://agileaq.github.io/CalorieCounter/` installable on iOS.

- [ ] **Step 1: Create README.md**

```markdown
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
```

- [ ] **Step 2: Verify the full suite and build one more time**

Run: `npm run test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 3: Commit and push to main**

```bash
git add README.md
git commit -m "docs: add README"
git branch -M main
git push -u origin main
```

- [ ] **Step 4: Enable Pages (one-time, manual in GitHub UI)**

In the GitHub repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**. Then re-run the "Deploy to GitHub Pages" workflow if it did not trigger.

- [ ] **Step 5: Verify the live deploy**

Open `https://agileaq.github.io/CalorieCounter/`. Confirm: app loads, build badge shows the pushed commit SHA, install works in iOS Safari, and it opens offline after first load.

- [ ] **Step 6: Verify the upgrade flow (optional smoke test)**

Bump `package.json` version (e.g. `0.1.1`), push, wait for deploy, reopen the installed app → the update banner should appear; tapping it reloads to the new version.

---

## Self-Review

Run this checklist after all tasks are appended (author's pass, done now):

**Spec coverage:**
- §2 Tech stack → Task 1. ✓
- §3 Data model (types, scaling, under/over, keys, snapshots, clone) → Tasks 2, 5, 6, 7, 8. ✓
- §4 Screens (Dashboard, Log, Food Picker, New/Edit Food, Goals, Date header, Calendar) → Tasks 13–22. ✓
- §5 Icon picker → Task 16. ✓
- §6 i18n (6 langs, RTL, switcher, key parity test) → Tasks 11, 21, 24. ✓
- §7 Versioning (SW prompt, foreground check, migrations, build metadata) → Tasks 1, 6, 21, 23. ✓
- §8 Project structure → realized across all tasks. ✓
- §9 Testing (nutrition, migrations, importExport, date, i18n, components) → Tasks 4–12, 14–23. ✓
- §10 Deployment → Tasks 1, 25. ✓
- §11 Build order → tasks ordered accordingly. ✓
- §12 Security (no PAT in tracked files; CI uses GITHUB_TOKEN) → Task 1 workflow + Global Constraints. ✓

**Type consistency:** `AppContextValue` (Task 12) is the contract used by Tasks 13–23; `entryNutrition`/`primaryServing`/`underOver`/`dayFoodNutrition` names are stable from Task 5 onward; `parseFoodsImport`/`mergeFoods`/`parseBackup` from Task 9 used in Task 22.

**Known follow-ups (acceptable, non-blocking):**
- The QuantitySheet expresses quantity in the primary serving's unit basis; multi-serving foods scale from primary per Global Constraints. If per-serving independent nutrition is desired later, extend the model.
- Placeholder PWA icons in Task 1; replace with designed icons before public release.
