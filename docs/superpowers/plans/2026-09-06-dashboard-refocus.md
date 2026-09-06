# Dashboard Refocus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Dashboard into a mid-frequency review board (weight trend + deficit verdict → weekly calorie bars → 2×2 nutrient matrix), strip its single-day gauges, move the trend chart from Goals, and delete the dead StatCard path.

**Architecture:** The existing 5 stacked StatCards are replaced by three composed modules. Bar rendering is extracted once into a shared `WeekBars` primitive (consumed by the calorie card); the nutrient matrix is a new self-contained `MacroMatrix`. Two pure functions (`weeklyStats`, `deficitWeekSummary`/`trendDirection`) feed all conclusion lines. The Log page is untouched; Goals loses only the chart mount.

**Tech Stack:** React 19 + TypeScript + Vite, react-i18next (6 locales), vitest + React Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-09-06-dashboard-refocus-design.md` (read it first — it locks wording, colors, sign conventions, z-order and i18n degradation rules this plan implements).

> **As-built note (post-execution):** this plan was executed to completion (commits `0254f6b..1137656`); three internal code/test contradictions were corrected during execution and the code blocks below now reflect the as-built state — Task 4's bold assertion targets the day-label span (the component bolds the span, not the button), and Task 5's Cell carries `valueColor` on the `macro-value-*` host span with `macro-minis-*` as MiniBars' flex root (testid prop) instead of a wrapper div. Task 7's `Dashboard.tsx` also shipped without the `useTranslation` import and its test without the unused `foodDay` helper (`noUnusedLocals`). The spec is unchanged.

## Global Constraints

- Run tests with `npx vitest run`; typecheck with `npx tsc --noEmit`. Both must pass before every commit.
- Dates: NEVER `new Date("YYYY-MM-DD")`. Use `fromDateKey`/`addDays`/`daysBetween`/`weekOf` from `src/lib/date.ts` (pure local-calendar math).
- All display numbers: `Math.round(n).toLocaleString('en-US')` grouping; negative balances use U+2212 `−` (not hyphen) in UI and tests.
- i18n: every new key goes into ALL 6 locales (`en, zh, es, fr, ru, ar`) in the same commit; `src/i18n/i18n.test.ts` enforces key parity automatically.
- Colors (locked): calories `var(--green)`, carbs `var(--accent)`, protein `#5b3df5`, fat `#f5a623`, fiber `#34c0eb`, over-target `var(--red)`, track `#e5e5ea`.
- MiniBars are NOT clickable; calorie WeekBars ARE (`onBarClick={setSelectedDate}`).
- Commit message style: conventional (`feat:`, `test:`, `refactor:`), then `git push` (standing repo directive: push every commit to main).

---

### Task 1: `weeklyStats` in `src/lib/weekly.ts`

**Files:**
- Modify: `src/lib/weekly.ts`
- Test: `src/lib/weekly.test.ts`

**Interfaces:**
- Consumes: existing `weekOf`, `emptyDay`, `DayLog`, `WeeklyBar`.
- Produces: `weeklyStats(days: Record<string, DayLog>, selected: string, metric: (d: DayLog) => number, target: number, dir: 'max' | 'min'): { bars: WeeklyBar[]; avg: number | null; hitDays: number | null }`. Tasks 5 and 7 consume this. `weeklySeries` stays in place until Task 7 (Dashboard still imports it).

- [ ] **Step 1: Write the failing tests** — append to `src/lib/weekly.test.ts` (reuse the file's existing `dayWithCalories` helper and `metric`; extend the helper call pattern for carbs by adding a second helper):

```ts
import { weeklySeries, weeklyStats } from './weekly'

// like dayWithCalories but lets you set carbs/protein/fat/fiber on the fake food
function dayWithNutrition(key: string, macros: { calories?: number; carbs?: number; protein?: number; fat?: number; fiber?: number }): DayLog {
  const d = emptyDay(key)
  d.meals.breakfast.push({
    id: 'e' + key, servingId: 's', quantity: 1,
    foodSnapshot: {
      id: 'f', name: 'x', icon: '🍽️', source: 'custom', createdAt: key,
      servings: [{ id: 's', kind: 'weight', label: 'g', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: {
        calories: macros.calories ?? 0,
        fat: { total: macros.fat ?? 0, mono: 0, poly: 0, saturated: 0, trans: 0 },
        cholesterol: 0, sodium: 0,
        carbs: { total: macros.carbs ?? 0, fiber: macros.fiber ?? 0, sugar: 0 },
        protein: macros.protein ?? 0,
        vitamins: { a: 0, c: 0, b1: 0, b2: 0, b3: 0, b9: 0, b6: 0, b12: 0 },
        minerals: { calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, zinc: 0 },
        caffeine: 0,
      },
    },
  })
  return d
}

describe('weeklyStats', () => {
  // Week of Wed 2026-08-19 is Mon 2026-08-17 .. Sun 2026-08-23
  it('returns the same Mon..Sun bars as weeklySeries', () => {
    const days = { '2026-08-18': dayWithCalories('2026-08-18', 300) }
    const s = weeklyStats(days, '2026-08-19', metric, 2000, 'max')
    expect(s.bars).toHaveLength(7)
    expect(s.bars[0].date).toBe('2026-08-17')
    expect(s.bars[6].date).toBe('2026-08-23')
    expect(s.bars.find(b => b.date === '2026-08-18')!.value).toBe(300)
  })
  it('avg includes the selected day, counts present days only, null when none', () => {
    // present: 100, 300, and selected 500 → (100+300+500)/3 = 300
    const days = {
      '2026-08-17': dayWithCalories('2026-08-17', 100),
      '2026-08-18': dayWithCalories('2026-08-18', 300),
      '2026-08-19': dayWithCalories('2026-08-19', 500), // selected, present → included
    }
    expect(weeklyStats(days, '2026-08-19', metric, 0, 'max').avg).toBe(300)
    expect(weeklyStats({}, '2026-08-19', metric, 0, 'max').avg).toBeNull()
  })
  it('an opened-but-empty day counts as a real 0 in avg', () => {
    const days = {
      '2026-08-17': emptyDay('2026-08-17'), // opened, nothing eaten → 0
      '2026-08-19': dayWithCalories('2026-08-19', 800),
    }
    expect(weeklyStats(days, '2026-08-19', metric, 0, 'max').avg).toBe(400)
  })
  it('hitDays counts present days meeting the target per direction', () => {
    const days = {
      '2026-08-17': dayWithNutrition('2026-08-17', { carbs: 100 }), // ≤ 280 hit
      '2026-08-18': dayWithNutrition('2026-08-18', { carbs: 300 }), // > 280 miss
      '2026-08-19': dayWithNutrition('2026-08-19', { carbs: 280 }), // = target hit
    }
    expect(weeklyStats(days, '2026-08-19', d => dayFoodNutrition(d).carbs.total, 280, 'max').hitDays).toBe(2)
    const proteinDays = {
      '2026-08-17': dayWithNutrition('2026-08-17', { protein: 130 }), // ≥ 120 hit
      '2026-08-18': dayWithNutrition('2026-08-18', { protein: 90 }),  // < 120 miss
      '2026-08-19': dayWithNutrition('2026-08-19', { protein: 120 }), // = target hit
    }
    expect(weeklyStats(proteinDays, '2026-08-19', d => dayFoodNutrition(d).protein, 120, 'min').hitDays).toBe(2)
  })
  it('hitDays is null when target ≤ 0 or no present days', () => {
    expect(weeklyStats({}, '2026-08-19', metric, 280, 'max').hitDays).toBeNull()
    const days = { '2026-08-19': dayWithCalories('2026-08-19', 500) }
    expect(weeklyStats(days, '2026-08-19', metric, 0, 'max').hitDays).toBeNull()
  })
})
```

Also add `dayFoodNutrition` to the existing import from `./nutrition` (it already imports it — no change needed if `metric` uses it).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/weekly.test.ts`
Expected: FAIL — `weeklyStats` is not exported.

- [ ] **Step 3: Implement** — add below `weeklySeries` in `src/lib/weekly.ts`:

```ts
export interface WeeklyStats { bars: WeeklyBar[]; avg: number | null; hitDays: number | null }

/**
 * Dashboard review stats for the week containing `selected`: the same Mon..Sun
 * `bars` as weeklySeries plus an avg and a days-on-target count for the
 * conclusion lines. `avg` is the mean over days PRESENT in `days` (selected
 * day included; an opened-but-empty day is a real 0) — null when no day in the
 * week is present. `hitDays` counts present days meeting `target` (`dir='max'`:
 * value ≤ target, `dir='min'`: value ≥ target); null when target ≤ 0 or no
 * day is present.
 */
export function weeklyStats(
  days: Record<string, DayLog>,
  selected: string,
  metric: (d: DayLog) => number,
  target: number,
  dir: 'max' | 'min',
): WeeklyStats {
  const week = weekOf(selected)
  const bars: WeeklyBar[] = week.map(date => ({
    date,
    value: metric(days[date] ?? emptyDay(date)),
    isToday: date === selected,
  }))
  const present = week.filter(date => days[date] !== undefined)
  const values = present.map(date => metric(days[date]))
  const avg = present.length ? values.reduce((a, b) => a + b, 0) / present.length : null
  let hitDays: number | null = null
  if (target > 0 && present.length) {
    hitDays = values.filter(v => (dir === 'max' ? v <= target : v >= target)).length
  }
  return { bars, avg, hitDays }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/weekly.test.ts`
Expected: PASS (old `weeklySeries` tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/weekly.ts src/lib/weekly.test.ts
git commit -m "feat(weekly): weeklyStats — present-days avg + directional hitDays for dashboard conclusions" && git push
```

---

### Task 2: `deficitWeekSummary` + `trendDirection` in `src/lib/weight.ts`

**Files:**
- Modify: `src/lib/weight.ts`
- Test: `src/lib/weight.test.ts`

**Interfaces:**
- Consumes: `addDays`, `daysBetween`, `dayFoodNutrition`, `exerciseTotal` (already imported in weight.ts); test helpers `D(key, kg)` and `dayWithCals(key, calories, burned?)` already defined in weight.test.ts.
- Produces:
  - `deficitWeekSummary(days: Record<string, DayLog>, selected: string, budget: number): { totalKcal: number; hasData: boolean }`
  - `trendDirection(s: Series, date: string): 'down' | 'stable' | 'up' | null`
  Task 6 (verdict row) consumes both.

- [ ] **Step 1: Write the failing tests** — append to `src/lib/weight.test.ts`:

```ts
describe('deficitWeekSummary', () => {
  it('sums (food − exercise) − budget over the 7 days ending at selected, present days only', () => {
    const days: Record<string, DayLog> = {
      '2026-01-01': { ...dayWithCals('2026-01-01', 500, 200), weightKg: 80 }, // −1948
      '2026-01-02': { ...dayWithCals('2026-01-02', 0), weightKg: 80 },        // −2248 (opened, real zero)
      // 01-03..01-05 absent → skipped
    }
    days['2026-01-06'] = { ...dayWithCals('2026-01-06', 3000), weightKg: 80 } // +752
    const r = deficitWeekSummary(days, '2026-01-07', 2248)
    expect(r.hasData).toBe(true)
    expect(r.totalKcal).toBe(-1948 - 2248 + 752)
  })
  it('window edges: selected−6 counts, selected−7 does not', () => {
    const days: Record<string, DayLog> = {
      '2025-12-30': { ...dayWithCals('2025-12-30', 4248), weightKg: 80 }, // selected − 7 → excluded
      '2025-12-31': { ...dayWithCals('2025-12-31', 2248), weightKg: 80 }, // selected − 6 → (2248) − 2248 = 0
    }
    const r = deficitWeekSummary(days, '2026-01-06', 2248)
    expect(r.hasData).toBe(true)
    expect(r.totalKcal).toBe(0)
  })
  it('no present days in the window → hasData=false, total 0', () => {
    expect(deficitWeekSummary({}, '2026-01-07', 2248)).toEqual({ totalKcal: 0, hasData: false })
  })
})

describe('trendDirection', () => {
  const days = {
    ...D('2026-01-01', 80), ...D('2026-01-08', 78), ...D('2026-01-15', 76), ...D('2026-01-22', 74),
  }
  const s = dailySeries(days, 'all', '2026-01-22')
  it('falls on a steep decline (Δ ≤ −0.15)', () => {
    // trend(01-22) = 76 (carry window), trend(01-15) = (6×78 + 76)/7 ≈ 77.71 → Δ ≈ −1.71
    expect(trendDirection(s, '2026-01-22')).toBe('down')
  })
  it('is stable within the 0.15 kg threshold', () => {
    const flat = dailySeries({ ...D('2026-01-01', 80), ...D('2026-01-08', 79.9), ...D('2026-01-15', 79.8) }, 'all', '2026-01-15')
    expect(trendDirection(flat, '2026-01-15')).toBe('stable')
  })
  it('rises', () => {
    const up = dailySeries({ ...D('2026-01-01', 80), ...D('2026-01-08', 81), ...D('2026-01-15', 82) }, 'all', '2026-01-15')
    expect(trendDirection(up, '2026-01-15')).toBe('up')
  })
  it('is null when either endpoint lacks a trend', () => {
    expect(trendDirection(s, '2026-01-01')).toBeNull()  // no trend 7 days earlier
    expect(trendDirection(s, '2025-12-25')).toBeNull()  // date outside the series
  })
})
```

Add `deficitWeekSummary, trendDirection` to the existing `./weight` import line and `dayWithCals`/`D` are already in scope.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/weight.test.ts`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement** — append to `src/lib/weight.ts`:

```ts
export interface DeficitWeek { totalKcal: number; hasData: boolean }

/**
 * Sum of the food-budget deficit — the same numbers the trend chart's deficit
 * sub-chart draws — over the 7-day window ending at `selected`, so the verdict
 * line always equals the sum of the visible bars. Only day keys present in
 * `days` count (an opened-but-empty day is a real zero). Window keys come from
 * the pure local-calendar helpers, never `new Date("YYYY-MM-DD")`.
 */
export function deficitWeekSummary(days: Record<string, DayLog>, selected: string, budget: number): DeficitWeek {
  const keys = Array.from({ length: 7 }, (_, i) => addDays(selected, i - 6))
  const present = keys.filter(k => days[k] != null)
  if (present.length === 0) return { totalKcal: 0, hasData: false }
  const totalKcal = present.reduce((sum, k) => {
    const d = days[k]
    return sum + (dayFoodNutrition(d).calories - exerciseTotal(d)) - budget
  }, 0)
  return { totalKcal, hasData: true }
}

export type TrendDir = 'down' | 'stable' | 'up'

/**
 * Direction of the 7-day SMA at `date` vs 7 days earlier, read off the series'
 * points. Either endpoint undefined (or outside the series) → null.
 * |Δ| < 0.15 kg counts as stable.
 */
export function trendDirection(s: Series, date: string): TrendDir | null {
  const i0 = daysBetween(s.start, date)
  const i1 = daysBetween(s.start, addDays(date, -7))
  const a = s.points[i0]?.trend
  const b = s.points[i1]?.trend
  if (a == null || b == null) return null
  const delta = a - b
  if (Math.abs(delta) < 0.15) return 'stable'
  return delta < 0 ? 'down' : 'up'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/weight.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/weight.ts src/lib/weight.test.ts
git commit -m "feat(weight): deficitWeekSummary (7-day bar sum) + trendDirection (0.15kg stable band)" && git push
```

---

### Task 3: i18n keys in all 6 locales

**Files:**
- Modify: `src/i18n/locales/en.json`, `zh.json`, `es.json`, `fr.json`, `ru.json`, `ar.json`

**Interfaces:**
- Produces (consumed by Tasks 5–7): `weight.weekReview`, `weight.weekReviewDeficitOnly`, `weight.trendDown`, `weight.trendStable`, `weight.trendUp`, `dashboard.weekAvg`, `dashboard.hit`, `dashboard.remaining`.

- [ ] **Step 1: Add the weight keys** — inside each locale's existing `"weight"` object (e.g. after `"deficitSub"`), add these three plus the two verdict templates:

| key | en | zh | es | fr | ru | ar |
|---|---|---|---|---|---|---|
| `weekReview` | `This week's calorie balance {{kcal}} kcal · weight {{dir}}` | `本周累计热量差额 {{kcal}} kcal · 体重{{dir}}` | `Balance calórico semanal {{kcal}} kcal · peso {{dir}}` | `Bilan calorique de la semaine {{kcal}} kcal · poids {{dir}}` | `Баланс калорий за неделю {{kcal}} kcal · вес {{dir}}` | `رصيد السعرات هذا الأسبوع {{kcal}} سعرة · الوزن {{dir}}` |
| `weekReviewDeficitOnly` | `This week's calorie balance {{kcal}} kcal` | `本周累计热量差额 {{kcal}} kcal` | `Balance calórico semanal {{kcal}} kcal` | `Bilan calorique de la semaine {{kcal}} kcal` | `Баланс калорий за неделю {{kcal}} kcal` | `رصيد السعرات هذا الأسبوع {{kcal}} سعرة` |
| `trendDown` | `down` | `下降` | `bajando` | `en baisse` | `снижается` | `ينخفض` |
| `trendStable` | `stable` | `平稳` | `estable` | `stable` | `стабилен` | `مستقر` |
| `trendUp` | `up` | `上升` | `subiendo` | `en hausse` | `растёт` | `يرتفع` |

- [ ] **Step 2: Add the dashboard keys** — inside each locale's existing `"dashboard"` object (e.g. after `"fat"`):

| key | en | zh | es | fr | ru | ar |
|---|---|---|---|---|---|---|
| `weekAvg` | `Avg {{n}}/day` | `周日均 {{n}}` | `Media {{n}}/día` | `Moyenne {{n}}/j` | `В среднем {{n}}/день` | `المتوسط {{n}}/يوم` |
| `hit` | `{{n}}/7 days on target` | `达标 {{n}}/7 天` | `{{n}}/7 días en objetivo` | `{{n}}/7 jours dans l'objectif` | `{{n}}/7 дней в норме` | `{{n}}/7 أيام ضمن الهدف` |
| `remaining` | `{{left}} / {{target}}g` | `{{left}} / {{target}}g` | `{{left}} / {{target}}g` | `{{left}} / {{target}}g` | `{{left}} / {{target}}g` | `{{left}} / {{target}}g` |

- [ ] **Step 3: Run the parity + suite check**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS (all 6 locales carry the same new keys).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json src/i18n/locales/es.json src/i18n/locales/fr.json src/i18n/locales/ru.json src/i18n/locales/ar.json
git commit -m "i18n: dashboard review keys + weight verdict templates (6 locales)" && git push
```

---

### Task 4: `WeekBars` shared primitive

**Files:**
- Create: `src/components/WeekBars.tsx`
- Test: `src/components/WeekBars.test.tsx`

**Interfaces:**
- Consumes: `WeeklyBar` from `src/lib/weekly`.
- Produces: `export function WeekBars(props: { bars: WeeklyBar[]; target: number; color: string; barHeight?: number; onBarClick?: (date: string) => void })`. Testids: `week-bar-btn`, `week-bar`, `week-bar-fill`, `week-bar-over`, `week-budget-line`. Task 7 consumes it.

- [ ] **Step 1: Write the failing tests** — create `src/components/WeekBars.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { WeekBars } from './WeekBars'

const bars = [
  { date: '2026-08-17', value: 100, isToday: false },
  { date: '2026-08-18', value: 300, isToday: false },
  { date: '2026-08-19', value: 50, isToday: true },
  { date: '2026-08-20', value: 0, isToday: false },
  { date: '2026-08-21', value: 0, isToday: false },
  { date: '2026-08-22', value: 0, isToday: false },
  { date: '2026-08-23', value: 0, isToday: false },
]

describe('WeekBars', () => {
  it('renders 7 bars; fills scale with barHeight (under zone 55px at the 64px default)', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    expect(screen.getAllByTestId('week-bar')).toHaveLength(7)
    const fills = screen.getAllByTestId('week-bar-fill')
    expect(fills).toHaveLength(3)
    expect(fills[0].style.height).toBe('55px')   // at target → divider level
    expect(fills[1].style.height).toBe('55px')   // 3× target → under part capped
    expect(fills[2].style.height).toBe('27.5px') // half target
  })
  it('draws the red over-cap above the divider level for over-target days', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    const overs = screen.getAllByTestId('week-bar-over')
    expect(overs).toHaveLength(1)
    expect(overs[0].style.height).toBe('9px')
    expect(overs[0].style.background).toBe('var(--red)')
  })
  it('renders the full-width dashed budget line layered above the track but below fills', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    const line = screen.getByTestId('week-budget-line')
    expect(line.style.zIndex).toBe('1')
    const fill = screen.getAllByTestId('week-bar-fill')[0]
    expect(Number(fill.style.zIndex)).toBeGreaterThan(Number(line.style.zIndex))
  })
  it('no budget line and week-max-scaled fills when target is 0', () => {
    render(<WeekBars bars={bars} target={0} color="var(--accent)" />)
    expect(screen.queryByTestId('week-budget-line')).toBeNull()
    const fills = screen.getAllByTestId('week-bar-fill')
    expect(fills[1].style.height).toBe('55px') // 300 = week max → full under zone
  })
  it('clicking a bar calls onBarClick with its date; the today label is bold', () => {
    const onBarClick = vi.fn()
    render(<WeekBars bars={bars} target={100} color="var(--accent)" onBarClick={onBarClick} />)
    const btns = screen.getAllByTestId('week-bar-btn')
    expect(btns).toHaveLength(7)
    fireEvent.click(btns[2])
    expect(onBarClick).toHaveBeenCalledWith('2026-08-19')
    expect(btns[2].querySelector('span')).toHaveStyle({ fontWeight: 700 })
  })
  it('without onBarClick the buttons are disabled', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    for (const b of screen.getAllByTestId('week-bar-btn')) expect(b).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/WeekBars.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `src/components/WeekBars.tsx`:

```tsx
/**
 * Shared Mon–Sun weekly bar primitive, extracted from the old StatCard:
 * capsule track + under-fill + red over-cap + a full-width dashed budget
 * line. Layering (locked): the dashed line (z-index 1) sits above the capsule
 * track but below the fills/over-caps (z-index 2) — the capsules deliberately
 * create no stacking context (position:relative, no z-index/transform), so
 * the line never visually cuts through a bar's fill. The line replaces the
 * old per-bar divider; consumers own ring/gauge and footer rows.
 */
import { useTranslation } from 'react-i18next'
import type { WeeklyBar } from '../lib/weekly'

interface Props {
  bars: WeeklyBar[]
  target: number
  color: string
  /** capsule height in px; the under/over zones scale proportionally (default 64) */
  barHeight?: number
  onBarClick?: (date: string) => void
}

// Mon..Sun — matches WeeklyBar[] order from weeklyStats/weeklySeries
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function WeekBars({ bars, target, color, barHeight = 64, onBarClick }: Props) {
  const { t } = useTranslation()
  const UNDER = Math.round(barHeight * (82 / 96))
  const OVER = barHeight - UNDER

  function fillParts(value: number): { under: number; over: number } {
    if (value <= 0) return { under: 0, over: 0 }
    if (target <= 0) {
      const max = Math.max(1, ...bars.map(b => b.value))
      return { under: (value / max) * UNDER, over: 0 } // no target: scale to week max
    }
    const ratio = value / target
    return {
      under: Math.min(ratio, 1) * UNDER,
      over: Math.min(Math.max(ratio - 1, 0), 1) * OVER,
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {target > 0 && (
        <div data-testid="week-budget-line" aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, top: OVER - 1, borderTop: '1px dashed var(--muted)', zIndex: 1, pointerEvents: 'none' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        {bars.map((b, i) => (
          <button key={b.date} type="button" data-testid="week-bar-btn"
            disabled={!onBarClick}
            aria-label={b.date}
            onClick={onBarClick ? () => onBarClick(b.date) : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
              background: 'transparent', border: 'none', padding: 0, margin: 0,
              font: 'inherit', color: 'inherit', textAlign: 'inherit',
              cursor: onBarClick ? 'pointer' : 'default',
            }}>
            <div data-testid="week-bar" style={{
              position: 'relative', width: '100%', maxWidth: 16, height: barHeight,
              margin: '0 auto', background: '#e5e5ea', borderRadius: 5, overflow: 'hidden',
            }}>
              {b.value > 0 && (
                <div data-testid="week-bar-fill" style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  height: fillParts(b.value).under, background: color, zIndex: 2,
                }} />
              )}
              {fillParts(b.value).over > 0 && (
                <div data-testid="week-bar-over" style={{
                  position: 'absolute', left: 0, right: 0, bottom: UNDER + 1,
                  height: fillParts(b.value).over, background: 'var(--red)', zIndex: 2,
                }} />
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: b.isToday ? 700 : 400, color: b.isToday ? 'inherit' : 'var(--muted)' }}>
              {t(`calendar.${DOW[i]}`).slice(0, 2)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/WeekBars.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/WeekBars.tsx src/components/WeekBars.test.tsx
git commit -m "feat(dashboard): WeekBars primitive — capsule bars + full-width dashed budget line with locked layering" && git push
```

---

### Task 5: `MacroMatrix` 2×2 component

**Files:**
- Create: `src/components/MacroMatrix.tsx`
- Test: `src/components/MacroMatrix.test.tsx`

**Interfaces:**
- Consumes: `weeklyStats` (Task 1), `dayFoodNutrition`, `useApp` (`days`, `settings`, `selectedDate`), i18n keys from Task 3.
- Produces: `export function MacroMatrix()` (no props — reads context). Testids: `macro-cell-{carbs|protein|fat|fiber}`, `macro-value-{key}`, `macro-minis-{key}`. Task 7 mounts it.

Default macro targets in a fresh install: carbs 280, protein 120, fat 72, fiber 30 (asserted in Goals.test.tsx — reuse these numbers in tests).

- [ ] **Step 1: Write the failing tests** — create `src/components/MacroMatrix.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { MacroMatrix } from './MacroMatrix'
import { emptyDay } from '../lib/storage'
import { todayKey, weekOf } from '../lib/date'
import type { DayLog } from '../types'

function foodDay(key: string, macros: { calories?: number; carbs?: number; protein?: number; fat?: number; fiber?: number }): DayLog {
  const d = emptyDay(key)
  d.meals.breakfast.push({
    id: 'e' + key, servingId: 's', quantity: 1,
    foodSnapshot: {
      id: 'f', name: 'x', icon: '🍽️', source: 'custom', createdAt: key,
      servings: [{ id: 's', kind: 'weight', label: 'g', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: {
        calories: macros.calories ?? 0,
        fat: { total: macros.fat ?? 0, mono: 0, poly: 0, saturated: 0, trans: 0 },
        cholesterol: 0, sodium: 0,
        carbs: { total: macros.carbs ?? 0, fiber: macros.fiber ?? 0, sugar: 0 },
        protein: macros.protein ?? 0,
        vitamins: { a: 0, c: 0, b1: 0, b2: 0, b3: 0, b9: 0, b6: 0, b12: 0 },
        minerals: { calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, zinc: 0 },
        caffeine: 0,
      },
    },
  })
  return d
}

function seedDays(list: DayLog[]) {
  localStorage.setItem('cc.days', JSON.stringify(Object.fromEntries(list.map(d => [d.date, d]))))
}

beforeEach(() => localStorage.clear())

describe('MacroMatrix', () => {
  const today = todayKey()
  it('renders the four cells in order: carbs, protein, fat, fiber', () => {
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const cells = screen.getAllByTestId(/^macro-cell-/).map(c => c.dataset.testid)
    expect(cells).toEqual(['macro-cell-carbs', 'macro-cell-protein', 'macro-cell-fat', 'macro-cell-fiber'])
  })
  it('macros show a signed remaining: positive default, negative red when over target', () => {
    seedDays([foodDay(today, { carbs: 150, protein: 150 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    // carbs 150 vs 280 → +130; protein 150 vs 120 → −30 (red)
    expect(screen.getByTestId('macro-value-carbs')).toHaveTextContent('+130 / 280g')
    const protein = screen.getByTestId('macro-value-protein')
    expect(protein).toHaveTextContent('−30 / 120g')
    expect(protein).toHaveStyle({ color: 'var(--red)' })
  })
  it('fiber shows plain intake (never a signed remaining), muted when short, green when met', () => {
    seedDays([foodDay(today, { fiber: 12 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const fiber = screen.getByTestId('macro-value-fiber')
    expect(fiber).toHaveTextContent('12 / 30g')
    expect(fiber.textContent).not.toMatch(/^[+−]/)
    expect(fiber).toHaveStyle({ color: 'var(--muted)' })
  })
  it('fiber met turns green', () => {
    seedDays([foodDay(today, { fiber: 32 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const fiber = screen.getByTestId('macro-value-fiber')
    expect(fiber).toHaveTextContent('32 / 30g')
    expect(fiber).toHaveStyle({ color: 'var(--green)' })
  })
  it('selected day without a record shows — / targetg', () => {
    seedDays([foodDay('2026-01-01', { carbs: 100 })]) // some other day, not today
    render(<AppProvider><MacroMatrix /></AppProvider>)
    expect(screen.getByTestId('macro-value-carbs')).toHaveTextContent('— / 280g')
  })
  it('conclusion line: weekly avg over present days incl. selected + hit days', () => {
    const week = weekOf(todayKey())
    const others = week.filter(k => k !== todayKey()).slice(0, 3)
    seedDays([
      ...others.map(k => foodDay(k, { carbs: 100 })),
      foodDay(todayKey(), { carbs: 108 }), // avg (100×3 + 108)/4 = 102, all ≤ 280
    ])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const cell = screen.getByTestId('macro-cell-carbs')
    expect(cell.textContent).toContain('Avg 102/day')
    expect(cell.textContent).toContain('4/7 days on target')
  })
  it('MiniBars color over-target days red (macros) and met days green (fiber)', () => {
    const week = weekOf(todayKey())
    const today = todayKey()
    const other = week.find(k => k !== today)! // robust even when today is Monday
    const otherIdx = week.indexOf(other)
    const todayIdx = week.indexOf(today)
    seedDays([foodDay(other, { carbs: 300, fiber: 32 }), foodDay(today, { carbs: 100, fiber: 10 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const carbBars = screen.getByTestId('macro-minis-carbs').children
    expect((carbBars[todayIdx] as HTMLElement).style.background).toBe('var(--accent)') // 100 ≤ 280 → cell colour
    expect((carbBars[otherIdx] as HTMLElement).style.background).toBe('var(--red)')    // 300 > 280 → red
    const fiberBars = screen.getByTestId('macro-minis-fiber').children
    expect((fiberBars[otherIdx] as HTMLElement).style.background).toBe('var(--green)') // 32 ≥ 30
    expect((fiberBars[todayIdx] as HTMLElement).style.background).toBe('var(--muted)') // 10 < 30
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/MacroMatrix.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `src/components/MacroMatrix.tsx`:

```tsx
/**
 * Dashboard's 2×2 nutrient review matrix: carbs / protein / fat / fiber.
 * The three macros show a signed remaining ("+22 / 128g", red when negative);
 * fiber is a floor metric and shows plain intake ("12 / 30g") — a signed "+"
 * there would read as surplus. Cells are inline-styled mini-cards (no .card
 * class: its margin-block would fight the grid gap). Narrow-screen defense:
 * MiniBars use gap 2 / max-width 8 / min-width 6 inside minWidth:0 cells.
 */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { weeklyStats, type WeeklyBar } from '../lib/weekly'
import { dayFoodNutrition } from '../lib/nutrition'
import type { DayLog } from '../types'

const nf = (n: number) => Math.round(n).toLocaleString('en-US')

interface CellConfig {
  key: 'carbs' | 'protein' | 'fat' | 'fiber'
  label: string
  color: string
  dir: 'max' | 'min'
  metric: (d: DayLog) => number
  /** per-day MiniBars colour: macros red on over-target days, fiber green met / light short */
  miniColor: (v: number, target: number, color: string) => string
}

const macroMini = (v: number, target: number, color: string) =>
  target > 0 && v > target ? 'var(--red)' : color
const fiberMini = (v: number, target: number, color: string) =>
  target > 0 ? (v >= target ? 'var(--green)' : 'var(--muted)') : color

const CELLS: CellConfig[] = [
  { key: 'carbs', label: 'dashboard.carbs', color: 'var(--accent)', dir: 'max',
    metric: d => dayFoodNutrition(d).carbs.total, miniColor: macroMini },
  { key: 'protein', label: 'dashboard.protein', color: '#5b3df5', dir: 'min',
    metric: d => dayFoodNutrition(d).protein, miniColor: macroMini },
  { key: 'fat', label: 'dashboard.fat', color: '#f5a623', dir: 'max',
    metric: d => dayFoodNutrition(d).fat.total, miniColor: macroMini },
  { key: 'fiber', label: 'dashboard.fiber', color: '#34c0eb', dir: 'min',
    metric: d => dayFoodNutrition(d).carbs.fiber, miniColor: fiberMini },
]

/** 7 axis-less mini bars, per-day state colouring, heights capped by the week max. */
function MiniBars({ bars, target, color, miniColor, testId }: {
  bars: WeeklyBar[]; target: number; color: string; miniColor: CellConfig['miniColor']; testId: string
}) {
  const cellMax = Math.max(1, ...bars.map(b => b.value))
  return (
    <div data-testid={testId} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, minWidth: 0 }}>
      {bars.map(b => (
        <div key={b.date}
          style={{
            flex: 1, minWidth: 6, maxWidth: 8,
            height: b.value > 0 ? Math.max((b.value / cellMax) * 28, 2) : 0,
            background: b.value > 0 ? miniColor(b.value, target, color) : 'transparent',
            borderRadius: 2,
          }} />
      ))}
    </div>
  )
}

function Cell({ cfg, selected }: { cfg: CellConfig; selected: string }) {
  const { t } = useTranslation()
  const { days, settings } = useApp()
  const target = settings.macroTargets[cfg.key]
  const stats = weeklyStats(days, selected, cfg.metric, target, cfg.dir)
  const dayN = days[selected] != null ? cfg.metric(days[selected]) : null

  let value: React.ReactNode
  let valueColor: string | undefined
  if (target <= 0) value = <span>—</span>
  else if (dayN == null) value = <span>— / {nf(target)}g</span>
  else if (cfg.key === 'fiber') {
    valueColor = dayN >= target ? 'var(--green)' : 'var(--muted)'
    value = <>{t('dashboard.remaining', { left: nf(dayN), target: nf(target) })}</>
  } else {
    const left = target - dayN
    valueColor = left < 0 ? 'var(--red)' : 'inherit'
    value = <>{t('dashboard.remaining', { left: (left < 0 ? '−' : '+') + nf(Math.abs(left)), target: nf(target) })}</>
  }

  return (
    <div data-testid={`macro-cell-${cfg.key}`}
      style={{ background: 'var(--card)', borderRadius: 16, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 13 }}>{t(cfg.label)}</strong>
        <span data-testid={`macro-value-${cfg.key}`}
          style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: valueColor }}>
          {value}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        <MiniBars bars={stats.bars} target={target} color={cfg.color} miniColor={cfg.miniColor} testId={`macro-minis-${cfg.key}`} />
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        {t('dashboard.weekAvg', { n: stats.avg == null ? '—' : nf(stats.avg) })}
        {' · '}
        {t('dashboard.hit', { n: stats.hitDays == null ? '—' : stats.hitDays })}
      </div>
    </div>
  )
}

export function MacroMatrix() {
  const { selectedDate } = useApp()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {CELLS.map(c => <Cell key={c.key} cfg={c} selected={selectedDate} />)}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/MacroMatrix.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MacroMatrix.tsx src/components/MacroMatrix.test.tsx
git commit -m "feat(dashboard): MacroMatrix 2x2 — signed macro remaining, intake-based fiber, per-day mini bars, weekly conclusions" && git push
```

---

### Task 6: WeightTrendChart verdict row

**Files:**
- Modify: `src/components/WeightTrendChart.tsx`
- Test: `src/components/WeightTrendChart.test.tsx`

**Interfaces:**
- Consumes: `deficitWeekSummary`, `trendDirection` (Task 2); `weight.weekReview`, `weight.weekReviewDeficitOnly`, `weight.trendDown/Stable/Up` (Task 3); `selectedDate` from `useApp`.
- Produces: `data-testid="trend-verdict"` row rendered after the legend, only when the deficit sub-chart shows (`weighIns.length >= 3`) AND `deficitWeek.hasData`.

- [ ] **Step 1: Write the failing tests** — add inside the existing `describe('WeightTrendChart', ...)` in `src/components/WeightTrendChart.test.tsx` (reuse its existing `weighDay(date, kg, tags?, calories = 0, burned = 0)`, `threeWeighIns()`, `seedDays`, `today` helpers):

```tsx
it('verdict row: sums the visible deficit bars for the 7 days ending at the selected date, with the trend direction', () => {
  // weighDay days are present in `days`; default budget 2248. Window today−6..today:
  // today−2: 0 kcal → −2248; today−1: 3000 kcal → +752; today: weigh-in day, 0 kcal → −2248.
  seedDays([...threeWeighIns(), weighDay(addDays(today, -2), 79), weighDay(addDays(today, -1), 79.2, undefined, 3000)], { goalWeightKg: 78 })
  render(<AppProvider><WeightTrendChart /></AppProvider>)
  const verdict = screen.getByTestId('trend-verdict')
  expect(verdict.textContent).toContain('−3,744')
  expect(verdict.textContent).toContain('weight down')
})
it('verdict degrades to the deficit-only template when the trend direction is unavailable', () => {
  // series starts at today−2 → no trend 7 days before today → dir null
  seedDays([weighDay(addDays(today, -2), 79, undefined, 2248), weighDay(addDays(today, -1), 78.8), weighDay(today, 78.6)])
  render(<AppProvider><WeightTrendChart /></AppProvider>)
  const verdict = screen.getByTestId('trend-verdict')
  expect(verdict.textContent).toContain('−4,496') // 0 + (−2248) + (−2248)
  expect(verdict.textContent).not.toContain('weight')
})
it('no verdict row below 3 weigh-ins (deficit sub-chart hidden)', () => {
  seedDays([weighDay(today, 80)], { goalWeightKg: 78 })
  render(<AppProvider><WeightTrendChart /></AppProvider>)
  expect(screen.queryByTestId('trend-verdict')).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/WeightTrendChart.test.tsx`
Expected: FAIL — `trend-verdict` not found.

- [ ] **Step 3: Implement** in `src/components/WeightTrendChart.tsx`:

3a. Update the header doc-comment's first line to `Dashboard-top weight trend chart (moved from Goals): ...`.

3b. Extend the `useApp()` destructure to include `selectedDate`:

```tsx
const { days, settings, selectedDate } = useApp()
```

3c. Add a module-level sign formatter below the constants:

```tsx
/** Signed kcal for the verdict line: U+2212 minus, + prefix for surplus, en-US grouping. */
const signedKcal = (n: number) =>
  (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('en-US')
```

3d. Add memos after the existing `deficits` memo:

```tsx
const deficitWeek = useMemo(
  () => deficitWeekSummary(days, selectedDate, settings.dailyBudget),
  [days, selectedDate, settings.dailyBudget],
)
const dir = useMemo(() => trendDirection(s, selectedDate), [s, selectedDate])
```

3e. Extend the import from `../lib/weight` with `deficitWeekSummary, trendDirection`.

3f. Insert the verdict row directly after the legend `<div className="muted" style={{ fontSize: 11, display: 'flex', gap: 32, ... }}>` block:

```tsx
{showSubs && deficitWeek.hasData && (
  <div data-testid="trend-verdict" className="muted" style={{ fontSize: 12, marginTop: 4 }}>
    {dir
      ? t('weight.weekReview', {
          kcal: signedKcal(deficitWeek.totalKcal),
          dir: t(`weight.trend${dir[0].toUpperCase()}${dir.slice(1)}`),
        })
      : t('weight.weekReviewDeficitOnly', { kcal: signedKcal(deficitWeek.totalKcal) })}
  </div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/WeightTrendChart.test.tsx`
Expected: PASS (existing tests unchanged + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/WeightTrendChart.tsx src/components/WeightTrendChart.test.tsx
git commit -m "feat(trend): verdict row — 7-day deficit bar sum + SMA direction, degraded i18n template" && git push
```

---

### Task 7: CalorieWeekCard + Dashboard rewrite + dead-code removal

**Files:**
- Create: `src/components/CalorieWeekCard.tsx`
- Modify: `src/routes/Dashboard.tsx` (full rewrite)
- Modify: `src/lib/weekly.ts` (delete `weeklySeries` + `WeeklySeries`)
- Modify: `src/lib/weekly.test.ts` (delete the `weeklySeries` describe + its import)
- Modify: `src/i18n/locales/{en,zh,es,fr,ru,ar}.json` (delete `dashboard.of`, `dashboard.ofCals`, `dashboard.avgPrior` — all 6 in this task)
- Delete: `src/components/StatCard.tsx`, `src/components/StatCard.test.tsx`
- Test: rewrite `src/routes/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `WeekBars` (Task 4), `weeklyStats` (Task 1), `MacroMatrix` (Task 5), `WeightTrendChart` (existing), `dayFoodNutrition`.
- Produces: `export function CalorieWeekCard()` (no props); Dashboard route composes DateHeader + WeightTrendChart + CalorieWeekCard + MacroMatrix + BuildInfo + CalendarModal.

- [ ] **Step 1: Rewrite the failing Dashboard tests** — replace the whole content of `src/routes/Dashboard.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Dashboard from './Dashboard'
import { todayKey, weekOf, formatHeader } from '../lib/date'
import { emptyDay } from '../lib/storage'
import type { DayLog } from '../types'

function foodDay(key: string, calories: number): DayLog {
  const d = emptyDay(key)
  d.meals.breakfast.push({
    id: 'e' + key, servingId: 's', quantity: 1,
    foodSnapshot: {
      id: 'f', name: 'x', icon: '🍽️', source: 'custom', createdAt: key,
      servings: [{ id: 's', kind: 'weight', label: 'g', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: {
        calories,
        fat: { total: 0, mono: 0, poly: 0, saturated: 0, trans: 0 },
        cholesterol: 0, sodium: 0, carbs: { total: 0, fiber: 0, sugar: 0 }, protein: 0,
        vitamins: { a: 0, c: 0, b1: 0, b2: 0, b3: 0, b9: 0, b6: 0, b12: 0 },
        minerals: { calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, zinc: 0 },
        caffeine: 0,
      },
    },
  })
  return d
}

function weighDay(key: string): DayLog {
  return { ...emptyDay(key), weightKg: 80 }
}

beforeEach(() => localStorage.clear())

describe('Dashboard', () => {
  it('renders the three review modules and the version badge', () => {
    localStorage.setItem('cc.days', JSON.stringify({ [todayKey()]: weighDay(todayKey()) }))
    render(<AppProvider><Dashboard /></AppProvider>)
    expect(screen.getByText('Weight Trend')).toBeInTheDocument()
    expect(screen.getByText('Calories')).toBeInTheDocument()
    expect(screen.getByTestId('calorie-week-avg')).toBeInTheDocument()
    expect(screen.getAllByTestId('week-bar')).toHaveLength(7)
    for (const k of ['carbs', 'protein', 'fat', 'fiber']) {
      expect(screen.getByTestId(`macro-cell-${k}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('build-info').textContent).toMatch(/^v/)
  })
  it('no single-day gauges or old stat cards remain', () => {
    render(<AppProvider><Dashboard /></AppProvider>)
    expect(screen.queryByTestId('stat-gauge-value')).toBeNull()
    expect(screen.queryByTestId('stat-bar')).toBeNull()
    expect(screen.queryByTestId('stat-bar-btn')).toBeNull()
  })
  it('clicking a weekly calorie bar switches the selected date', () => {
    localStorage.setItem('cc.days', JSON.stringify({ [todayKey()]: weighDay(todayKey()) }))
    render(<AppProvider><Dashboard /></AppProvider>)
    const header = screen.getByTestId('date-center')
    const today = todayKey()
    expect(header).toHaveTextContent(formatHeader(today, 'en'))
    const target = weekOf(today).find(k => k !== today)!
    fireEvent.click(screen.getAllByLabelText(target)[0])
    expect(header).toHaveTextContent(formatHeader(target, 'en'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/routes/Dashboard.test.tsx`
Expected: FAIL — `calorie-week-avg` / `macro-cell-*` missing (old Dashboard renders stat cards).

- [ ] **Step 3: Create `src/components/CalorieWeekCard.tsx`**

```tsx
/** Dashboard's weekly calorie module: full-width Mon–Sun bars against the
 * daily budget (dashed line, red over-caps) with the week's logged-days
 * average in the title row. Bars switch the selected date on tap. */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { WeekBars } from './WeekBars'
import { weeklyStats } from '../lib/weekly'
import { dayFoodNutrition } from '../lib/nutrition'

const nf = (n: number) => Math.round(n).toLocaleString('en-US')

export function CalorieWeekCard() {
  const { t } = useTranslation()
  const { days, settings, selectedDate, setSelectedDate } = useApp()
  const stats = weeklyStats(days, selectedDate, d => dayFoodNutrition(d).calories, settings.dailyBudget, 'max')
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>{t('dashboard.calories')}</strong>
        <span className="muted" data-testid="calorie-week-avg" style={{ fontSize: 13 }}>
          {t('dashboard.weekAvg', { n: stats.avg == null ? '—' : nf(stats.avg) })} kcal
        </span>
      </div>
      <div style={{ marginTop: 8 }}>
        <WeekBars bars={stats.bars} target={settings.dailyBudget} color="var(--green)" onBarClick={setSelectedDate} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `src/routes/Dashboard.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DateHeader } from '../components/DateHeader'
import { BuildInfo } from '../components/BuildInfo'
import { CalendarModal } from '../components/CalendarModal'
import { WeightTrendChart } from '../components/WeightTrendChart'
import { CalorieWeekCard } from '../components/CalorieWeekCard'
import { MacroMatrix } from '../components/MacroMatrix'

/** Mid-frequency review board: outcome on top (weight + calorie balance),
 * weekly calories in the middle, the 2×2 nutrient matrix below. Daily
 * monitoring lives on the Log page; long-term config on Goals. */
export default function Dashboard() {
  const [cal, setCal] = useState(false)
  return (
    <div className="screen">
      <div className="header-row">
        <DateHeader onOpenCalendar={() => setCal(true)} />
      </div>
      <WeightTrendChart />
      <CalorieWeekCard />
      <MacroMatrix />
      <BuildInfo />
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
```

- [ ] **Step 5: Delete dead code**

```bash
git rm src/components/StatCard.tsx src/components/StatCard.test.tsx
```

In `src/lib/weekly.ts` delete the `WeeklySeries` interface and the whole `weeklySeries` function. In `src/lib/weekly.test.ts` delete the `weeklySeries` describe block and drop `weeklySeries` from the import (keep `weeklyStats`). In each of the 6 locale files delete the three lines `"of": ...`, `"avgPrior": ...`, `"ofCals": ...` from the `dashboard` object (keep `under`/`over` — DaySummaryCard uses them).

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS — StatCard tests gone, Dashboard tests green, i18n parity intact, no other file imported `weeklySeries` (only Dashboard did).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dashboard): review board composition — trend + calorie week card + macro matrix; delete StatCard path" && git push
```

---

### Task 8: Goals chart removal + full verification

**Files:**
- Modify: `src/routes/Goals.tsx` (remove the `WeightTrendChart` import and its `<WeightTrendChart />` mount)
- Test: `src/routes/Goals.test.tsx`

**Interfaces:**
- Consumes: nothing new. Goals keeps: LanguageSwitcher, targets card, AdviceCards, data/backup card, version row.

- [ ] **Step 1: Write the failing test** — add to `src/routes/Goals.test.tsx` inside the top-level `describe`:

```tsx
it('no longer renders the weight trend chart (it moved to the dashboard)', () => {
  render(<AppProvider><Goals /></AppProvider>)
  expect(screen.queryByText('Weight Trend')).toBeNull()
  expect(screen.queryByTestId('weight-trend-svg')).toBeNull()
  expect(screen.getByTestId('budget-input')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify it fails**

Run: `npx vitest run src/routes/Goals.test.tsx`
Expected: FAIL — the chart still renders.

- [ ] **Step 3: Implement** — in `src/routes/Goals.tsx` delete the line

```tsx
import { WeightTrendChart } from '../components/WeightTrendChart'
```

and the mount line

```tsx
<WeightTrendChart />
```

(alone between the header-row and the targets card).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/routes/Goals.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full verification gate**

Run:
```bash
npx vitest run && npx tsc --noEmit && npm run build
```
Expected: all green; `tsc` prints nothing; `vite build` completes. Then manually sanity-check the height budget against the spec (§6: whole page ≈ 890px ≈ 1.1–1.4 phone screens) by reviewing the composed module sizes — no code change expected.

- [ ] **Step 6: Commit**

```bash
git add src/routes/Goals.tsx src/routes/Goals.test.tsx
git commit -m "refactor(goals): drop the weight trend chart — dashboard owns trends now" && git push
```

---

## Final State Checklist (against the spec)

- [ ] Dashboard: DateHeader → WeightTrendChart (+ verdict row) → CalorieWeekCard → MacroMatrix → BuildInfo; no gauges.
- [ ] Log page untouched; Goals has no chart.
- [ ] `weeklySeries`, `StatCard`, `dashboard.of/ofCals/avgPrior` gone; `under/over`, `HalfRing` kept.
- [ ] Fiber shows intake without a sign; macros show signed remaining; verdict uses the degraded template when direction is null.
- [ ] All 6 locales parity-clean; full suite + typecheck + build green.
