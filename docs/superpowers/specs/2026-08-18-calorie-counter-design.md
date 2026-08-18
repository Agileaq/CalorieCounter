# Calorie Counter — Design Spec

- **Date:** 2026-08-18
- **Status:** Approved (design phase)
- **Type:** New project (architectural)

## 1. Overview

An offline-first single-page app for tracking daily calorie and nutrition
intake. Deployed to GitHub Pages, installed on iOS via "Add to Home Screen,"
and fully usable offline. All user data lives on-device. Food metadata
(predefined and custom) shares one schema and supports JSON import/export.

### Goals
- Log Breakfast / Lunch / Dinner / Snacks and track calories against a daily budget.
- Browse and pick from predefined foods ("All") and custom foods ("My Foods").
- Maintain custom foods with a full nutrition-facts schema.
- View history via a calendar with per-day calorie rings and weekly Under/Over.
- Work offline as an installed PWA; upgrade in place when a new version ships.

### Non-goals (explicitly out of scope)
- Camera "Autofill," voice input, barcode scanning (require online/native APIs).
- The "Discover" tab (online content feed).
- The "Meals" and "Recipes" tabs in the food picker.
- Multi-user, accounts, cloud sync.

## 2. Tech Stack
- **React 18 + Vite + TypeScript** — SPA.
- **react-router (HashRouter)** — GitHub Pages has no history-API rewrite; hash
  routes (`/#/log`) avoid 404s on deep links.
- **vite-plugin-pwa** — service worker + web manifest; precaches the app shell
  for full offline use.
- **localStorage** — all user data (personal, single-user, small JSON blobs).
- **Vitest + React Testing Library** — unit and component tests.
- No UI framework dependency for the icon picker (curated, bundled).

## 3. Data Model

One `Food` schema is shared by predefined and custom foods so import/export is
identical for both.

```ts
Food {
  id: string
  name: string
  brand?: string
  icon: string                 // native emoji, default "🍽️"
  servings: Serving[]          // >= 1; exactly one isPrimary
  nutrition: Nutrition         // values expressed for the PRIMARY serving
  source: 'predefined' | 'custom'
  createdAt: string            // ISO; shown as "Aug 29" in the picker
}

Serving {
  id: string
  kind: 'weight' | 'volume' | 'amount'
  label: string                // e.g. "Grams", "Serving", "mL"
  amount: number               // e.g. 100
  unit: string                 // e.g. "g", "mL", "item"
  isPrimary: boolean
}

Nutrition {
  calories: number             // required
  fat: { total, mono, poly, saturated, trans }
  cholesterol: number          // mg
  sodium: number               // mg
  carbs: { total, fiber, sugar }
  protein: number              // g
  vitamins: { a, c, b1, b2, b3, b9, b6, b12 }
  minerals: { calcium, iron, magnesium, phosphorus, potassium, zinc }
  caffeine: number             // mg
}
// All Nutrition fields except `calories` are optional (default 0 / undefined).

DayLog {
  date: string                 // "YYYY-MM-DD" (also the storage key)
  meals: {
    breakfast: LogEntry[]
    lunch: LogEntry[]
    dinner: LogEntry[]
    snacks: LogEntry[]
  }
  exercise: ExerciseEntry[]
}

LogEntry {
  id: string
  foodSnapshot: Food           // snapshot so editing/deleting a food later
                               //   does not rewrite past diary history
  servingId: string            // which serving was chosen
  quantity: number             // in the chosen serving's unit
}

ExerciseEntry {
  id: string
  name: string
  caloriesBurned: number
}

Settings {
  dailyBudget: number          // e.g. 2012
  macroTargets: { protein: number; fiber: number }
}
```

### Scaling rule
Nutrition is stored for the **primary serving**. A log entry's contribution is:

```
factor = quantity / primaryServing.amount
contribution = nutrition * factor
```

This makes both "600 Grams → scaled calories" and "1 Serving → fixed calories"
work from the same model.

### Under / Over
```
net       = food - exercise
remaining = budget - net
remaining >= 0  → "UNDER remaining"  (green)
remaining <  0  → "OVER |remaining|" (red)
```

### Storage keys (localStorage)
- `cc.days` → `{ "2026-08-18": DayLog, ... }`
- `cc.myFoods` → `Food[]` (custom foods)
- `cc.settings` → `Settings`
- `cc.schemaVersion` → number (drives migrations)

Predefined foods are **not** in localStorage; they are bundled as a read-only
JSON file in the repo (`src/data/predefinedFoods.json`).

### Key decision — snapshots
Each `LogEntry` stores a full `foodSnapshot`. Editing or deleting a food later
does not silently rewrite historical diary entries. Standard practice for food
trackers.

### Key decision — editing predefined foods
Predefined foods are read-only. "Editing" a predefined food **clones it into My
Foods** (`source: 'custom'`); the bundled file stays pristine.

## 4. Screens

Routes under a bottom nav: **Dashboard · Log · Goals**. Date header + calendar
are shared by Dashboard and Log.

### 4.1 Shared — Date Header + Calendar
- Header: `‹ 📅 Tue, Aug 18 ›`. Arrows step ±1 day; center tap opens the
  Calendar modal.
- Calendar: month grid; each day cell shows a **calorie ring** (consumed ÷
  budget). A right "Week" column shows the week's Under/Over badge.
- Empty days: gray ring. "Today" jumps to today. Selecting a day updates all
  screens and closes the modal.

### 4.2 Dashboard (首页)
- **Budget gauge:** center = remaining (`budget − food + exercise`) with
  Under/Over label; left = **Food** (consumed); right = **Exercise** (burned).
- **Macro bars:** Protein and Fiber as `current / target`.
- **Build badge (bottom):** `v{APP_VERSION} · {GIT_SHA} · {BUILD_TIME}` for
  debugging; tap to copy the full build string. Derived live from the selected
  day's DayLog.

### 4.3 Log
- Four meal cards: Breakfast, Lunch, Dinner, Snacks.
- Each card: title + total calories, macro subtotals, list of logged foods
  (icon, name, quantity, cals), and an **Add Food** button.
- `···` per card: clear meal. Per row: tap to edit quantity/serving; delete via
  swipe/menu.
- **Add Food** opens the Food Picker for that meal.

### 4.4 Food Picker
- Search (name/brand) + tabs **All** (predefined) and **My Foods** (custom).
  Meals/Recipes tabs omitted.
- Alphabetical sections; each row: icon, name, "`X cals per Y unit`," created
  date, `+`.
- `+` → quantity/serving sheet → confirm into the current meal.
- **My Foods** tab has a **"+ New Food"** entry point (replaces the
  camera/voice/barcode buttons).
- Session count badge; ✓ closes the picker.

### 4.5 New / Edit Food
- Header: name, brand, icon (IconPicker).
- **Servings:** one or more (weight/volume/amount); exactly one primary; "one
  serving required" validation.
- **Nutrition Facts:** full tree, all optional except **Calories (required)** —
  Fat (total, mono, poly, saturated, trans), Cholesterol, Sodium, Carbs (total,
  fiber, sugar), Protein, Vitamins (A, C, B1, B2, B3, B9, B6, B12), Minerals
  (Ca, Fe, Mg, P, K, Zn), Caffeine.
- Save → My Foods (`source: 'custom'`). Editing a predefined food clones it.
- Camera "Autofill" omitted (offline).

### 4.6 Goals / Settings
- Daily calorie budget and macro targets (protein, fiber).
- Import / Export foods (JSON) — merge into My Foods with dedupe by name+brand.
- Export / Import full backup (days + foods + settings).
- App version display + manual "Check for updates."

## 5. Icon Picker (curated, offline, no dependency)
- `food.icon` stores a native emoji string (default 🍽️).
- `<IconPicker>` backed by a bundled `src/data/foodEmojis.ts` (~100 food emojis,
  category-grouped: Fruits, Vegetables, Grains, Meat & Fish, Dairy, Drinks,
  Sweets, Prepared, Other), each tagged with EN/中文 keywords for search.
- Grid + search box + "type your own" field. Fully offline; zero third-party
  deps. Emoji render as the platform's native set (Apple emoji on iOS).

## 6. Versioning & Auto-Upgrade

Two independent upgrade paths.

### 6.1 App code/assets (service worker)
- `vite-plugin-pwa` in `registerType: 'prompt'`. Each build stamps a fresh
  revision manifest.
- Update flow: boot → SW checks in background → new SW installs "waiting" →
  non-blocking banner "新版本可用 — 点击更新" → tap → `updateServiceWorker(true)`
  (skipWaiting + reload).
- Prompt (not silent) so an in-progress food entry is never lost to an
  unexpected reload.
- **iOS foreground check:** iOS suspends installed PWAs, so also trigger an
  update check on `visibilitychange` (app foregrounded) and on a light interval.
- GH Pages CDN-caches `index.html` briefly, but browsers bypass the HTTP cache
  when re-fetching the SW script; combined with the foreground check, updates
  propagate reliably.

### 6.2 Data/schema (migrations)
- `cc.schemaVersion` stored with the data.
- On boot, an ordered migration pipeline (`v1→v2→v3…`) transforms stored JSON up
  to the current version; already-current is a no-op.
- A version bump never corrupts or drops the diary.
- **Safety net:** JSON export doubles as a manual backup, since iOS can evict
  storage under pressure. Noted in the UI.

### 6.3 Version visibility
- Build metadata injected at build time via Vite `define`:
  - `__APP_VERSION__` ← `package.json` version
  - `__GIT_SHA__` ← short commit hash (from the GitHub Action)
  - `__BUILD_TIME__` ← build timestamp
- Shown on the Dashboard build badge and on Goals/Settings. The SHA is the
  reliable "which deploy is live" signal.

## 7. Project Structure
```
CalorieCounter/
├─ public/
│  └─ icons/                 # PWA app icons (192, 512, maskable, apple-touch)
├─ src/
│  ├─ main.tsx, App.tsx
│  ├─ routes/                # Dashboard, Log, Goals
│  ├─ components/            # DateHeader, CalendarModal, BudgetGauge, MacroBar,
│  │                         #   MealCard, FoodPicker, FoodForm, IconPicker,
│  │                         #   UpdateBanner, BuildInfo
│  ├─ state/                 # contexts + hooks (useDays, useFoods, useSettings)
│  ├─ lib/
│  │  ├─ storage.ts          # localStorage read/write, schemaVersion
│  │  ├─ migrations.ts       # v1→v2… data migrations
│  │  ├─ nutrition.ts        # serving scaling, day totals, under/over
│  │  ├─ importExport.ts     # JSON import/export + full backup
│  │  └─ date.ts             # date keys, week grouping, month grid
│  ├─ data/
│  │  ├─ predefinedFoods.json# bundled "All" foods (read-only)
│  │  └─ foodEmojis.ts       # curated icon data
│  └─ types.ts               # Food, Serving, Nutrition, DayLog, Settings
├─ vite.config.ts            # base:'/CalorieCounter/', pwa (prompt), build defines
├─ .github/workflows/deploy.yml
└─ package.json              # version = app version
```

## 8. Testing (Vitest + RTL)
TDD the math first. Priorities:
- **nutrition.ts** — serving scaling (per-100g and per-Serving foods), day
  totals, under/over sign.
- **migrations.ts** — v1→v2 preserves data; already-current is a no-op.
- **importExport.ts** — export→import round-trip identity; dedupe on merge;
  malformed-JSON handling.
- **date.ts** — week grouping; month-grid leading/trailing days.
- Component tests — logging a food updates the day total; editing a predefined
  food clones it into My Foods.

## 9. Deployment (GitHub Pages)
- `.github/workflows/deploy.yml`: push to `main` → `npm ci && npm run build` →
  deploy `dist/` via `actions/deploy-pages`. Inject `__GIT_SHA__` /
  `__BUILD_TIME__` in the workflow.
- `vite.config.ts` `base: '/CalorieCounter/'` for subpath asset resolution.
- HashRouter for deep links without 404s.
- PWA manifest (name, icons, `display: standalone`, theme color) → installable
  offline app on iOS.
- Release = bump `package.json` version + push; update banner + foreground check
  deliver it to the installed app.

## 10. Build Order (for the implementation plan)
1. Scaffold + PWA + deploy pipeline (get a live, installable "hello world").
2. Types + storage + migrations + nutrition math (TDD).
3. Predefined foods + food emojis data.
4. Food Picker + New/Edit Food + IconPicker.
5. Log screen + meal cards.
6. Dashboard + gauge + macros + build badge.
7. Calendar modal.
8. Goals/Settings + import/export + version UI.
9. Update banner + foreground update check.
10. Polish (styling to match mockups).
