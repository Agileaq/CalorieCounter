# Weight Tracking + Trend Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, chosen by user) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daily weight + event-tag logging card on the Log page, and a three-layer SVG weight-trend chart (dots / 7-day SMA / safe-loss corridor) with deficit & weekly-rate sub-charts on the Goals page.

**Architecture:** Weight data rides on `DayLog` (optional `weightKg`, `tags` fields) so backup/merge come free; all chart math lives in pure module `src/lib/weight.ts`; one hand-written SVG component renders the aligned three-section chart. No new dependencies.

**Tech Stack:** React 19 + TypeScript, custom SVG, vitest + RTL, i18next (6 locales, parity-tested).

**Spec:** `docs/superpowers/specs/2026-09-06-weight-tracking-design.md` (read together with this plan; spec wins on conflicts)

## Global Constraints

- No new npm dependencies; charts are hand-written SVG (codebase convention).
- Weight stored canonically in kg; `1 lb = 0.45359237 kg`; lb inputs → kg rounded to **2 decimals**; all display `toFixed(1)` via `round1()`.
- `weightUnit` toggle persists globally via `updateSettings({ weightUnit })`.
- Carry-forward fuse: `MAX_GAP_DAYS = 7`; trend undefined exactly where kg undefined; trend = mean of **defined** window values.
- Corridor anchor: first date with ≥3 cumulative weigh-ins, W₀ = trend there; rails 0.5%/wk (slow) and 1%/wk (fast); each rail stops at first touch of goal; corridor null when no goal / <3 weigh-ins / goal ≥ W₀.
- Weekly rate: completed weeks only (`weekStart+7 ≤ today`), Δ over week's defined-trend span, chart skips Δ=0.
- Deficit: `(food − exercise) − current dailyBudget`; only dates present in `days`.
- Date math: only `fromDateKey`/`addDays`/`daysBetween` (local 3-arg Date); NEVER `new Date("YYYY-MM-DD")`.
- SVG hit-testing: `getScreenCTM().inverse()` matrix math (no DOMPoint), fallback `rect.left + (clientX−left)×W/rect.width`; NEVER `offsetX`. SVG stays LTR under RTL locales.
- All 6 locales get identical key sets (en is source; `i18n.test.ts` enforces parity).
- Every task: TDD (failing test first), `npx vitest run`, `npx tsc --noEmit`, commit + push when green.

---

### Task 1: Types, Settings defaults, `daysBetween`

**Files:**
- Modify: `src/types.ts`, `src/lib/storage.ts` (DEFAULT_SETTINGS), `src/lib/date.ts`
- Test: `src/lib/date.test.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Produces: `type WeightTag = 'cheat' | 'strength' | 'cardio' | 'stress' | 'period'`; `DayLog.weightKg?: number`; `DayLog.tags?: WeightTag[]`; `Settings.weightUnit: 'kg' | 'lb'`; `Settings.goalWeightKg: number | null`; `daysBetween(a: string, b: string): number` (b−a in days).

- [ ] **Step 1: Failing tests**

```ts
// date.test.ts (append)
import { daysBetween } from './date'
it('daysBetween is pure local calendar math across month/year boundaries', () => {
  expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)  // 2026 not leap
  expect(daysBetween('2025-12-30', '2026-01-02')).toBe(3)
  expect(daysBetween('2026-01-15', '2026-01-15')).toBe(0)
  expect(daysBetween('2026-01-15', '2026-01-10')).toBe(-5)
})
// storage.test.ts (append)
it('settings defaults include weightUnit kg and null goal', () => {
  localStorage.clear()
  const s = loadSettings()
  expect(s.weightUnit).toBe('kg')
  expect(s.goalWeightKg).toBeNull()
})
```

- [ ] **Step 2: Run** `npx vitest run src/lib/date.test.ts src/lib/storage.test.ts` → FAIL (daysBetween missing, Settings type error).
- [ ] **Step 3: Implement**

```ts
// types.ts — add
export type WeightTag = 'cheat' | 'strength' | 'cardio' | 'stress' | 'period'
// DayLog: add  weightKg?: number  and  tags?: WeightTag[]
// Settings: add  weightUnit: 'kg' | 'lb'   and   goalWeightKg: number | null

// storage.ts — DEFAULT_SETTINGS gains:  weightUnit: 'kg', goalWeightKg: null
// (loadSettings spread already merges scalar fields)

// date.ts — add
export function daysBetween(a: string, b: string): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86400000)
}
```

- [ ] **Step 4: Run again** → PASS. Also `npx tsc --noEmit` (DayLog/Settings consumers unaffected — fields optional/defaults).
- [ ] **Step 5: Commit** `feat(weight): weight fields, settings defaults, daysBetween`

### Task 2: Context — `setDayWeight` / `toggleDayTag`

**Files:**
- Modify: `src/state/useApp.ts` (interface), `src/state/AppContext.tsx`
- Test: `src/state/AppContext.test.tsx`

**Interfaces:**
- Produces: `setDayWeight(kg: number | null): void` (null/≤0 deletes field), `toggleDayTag(tag: WeightTag): void` (removes if present, appends otherwise, stores `undefined` when empty).

- [ ] **Step 1: Failing test**

```tsx
it('setDayWeight persists per selected date and null deletes', async () => {
  render(<AppProvider><Probe /></AppProvider>)   // Probe calls setDayWeight(82.5) on mount via act
  const days = JSON.parse(localStorage.getItem('cc.days')!)
  expect(days[todayKey()].weightKg).toBe(82.5)
  act(() => setDayWeight(null))
  expect('weightKg' in JSON.parse(localStorage.getItem('cc.days')!)[todayKey()]).toBe(false)
})
it('toggleDayTag adds, removes, and clears to undefined', ...)
```

- [ ] **Step 2: Run → FAIL** (functions missing).
- [ ] **Step 3: Implement** in AppContext value + interface:

```ts
setDayWeight: (kg) => mutateDay(d => {
  const next = { ...d }
  if (kg != null && kg > 0) next.weightKg = kg
  else delete next.weightKg
  return next
}),
toggleDayTag: (tag) => mutateDay(d => {
  const cur = d.tags ?? []
  const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag]
  const out = { ...d }
  if (next.length) out.tags = next
  else delete out.tags
  return out
}),
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit** `feat(weight): day weight and tag context actions`

### Task 3: mergeBackup keeps weight/tags (incoming wins)

**Files:**
- Modify: `src/lib/importExport.ts` (days merge in `mergeBackup`)
- Test: `src/lib/importExport.test.ts`

**Interfaces:**
- Produces: merged `DayLog` carries `weightKg` = `incoming ?? existing`; `tags` = whole-array replace (`incoming.tags` present even if `[]` wins; absent → existing; empty result → field dropped).

- [ ] **Step 1: Failing test**

```ts
it('merge keeps weight/tags with incoming-wins semantics', () => {
  const base = { days: { '2026-01-01': { date: '2026-01-01', meals: emptyMeals(), exercise: [], weightKg: 80, tags: ['cheat' as const] } }, myFoods: [], settings: DEFAULT_SETTINGS }
  const inc  = { days: { '2026-01-01': { date: '2026-01-01', meals: emptyMeals(), exercise: [], weightKg: 81, tags: ['strength' as const] } }, myFoods: [], settings: DEFAULT_SETTINGS }
  const m = mergeBackup(base, inc).days['2026-01-01']
  expect(m.weightKg).toBe(81)                    // incoming wins
  expect(m.tags).toEqual(['strength'])           // whole-array replace, no union
  // incoming without fields keeps existing
  const inc2 = { ...inc, days: { '2026-01-01': { date: '2026-01-01', meals: emptyMeals(), exercise: [] } } }
  const m2 = mergeBackup(base, inc2).days['2026-01-01']
  expect(m2.weightKg).toBe(80); expect(m2.tags).toEqual(['cheat'])
  // incoming empty tags array clears
  const inc3 = { ...inc, days: { '2026-01-01': { date: '2026-01-01', meals: emptyMeals(), exercise: [], weightKg: 81, tags: [] } } }
  expect('tags' in mergeBackup(base, inc3).days['2026-01-01']).toBe(false)
})
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement** — replace days merge body:

```ts
const merged: DayLog = { date: key, meals: mergeMeals(exDay.meals, inDay.meals), exercise: mergeById(exDay.exercise, inDay.exercise) }
if (inDay.weightKg != null || exDay.weightKg != null) merged.weightKg = inDay.weightKg ?? exDay.weightKg
const tags = inDay.tags ?? exDay.tags
if (tags && tags.length) merged.tags = tags
days[key] = merged
```

- [ ] **Step 4: PASS.** **Step 5: Commit** `fix(backup): preserve weightKg/tags when merging days (incoming wins)`

### Task 4: `weight.ts` — series, carry-forward fuse, 7-day SMA

**Files:**
- Create: `src/lib/weight.ts`
- Test: `src/lib/weight.test.ts`

**Interfaces:**
- Produces: `LB_PER_KG`, `MAX_GAP_DAYS=7`, `SLOW_RATE=0.005`, `FAST_RATE=0.01`, `TAG_COLORS: Record<WeightTag,string>` (cheat `#f5a623`, strength `#5b3df5`, cardio `#34c0eb`, stress `#8a8a8e`, period `#f56fa1`), `type Range = 30 | 90 | 'all'`, `kgToLb`, `lbToKg` (2-dec), `round1`, `extractWeighIns(days): {date,kg}[]` (date-sorted), `interface DailyPoint { date; kg: number|undefined; trend: number|undefined }`, `interface Series { start; end; points: DailyPoint[]; weighInCount: number }`, `dailySeries(days, range, today?): Series`.

- [ ] **Step 1: Failing tests** (use a fixed `today` arg — never real clock):

```ts
const D = (date: string, kg: number, tags?: WeightTag[]): Record<string, DayLog> => ({ [date]: { date, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], weightKg: kg, tags } })
it('lb/kg conversions round-trip at locked precision', () => {
  expect(lbToKg(181.8)).toBeCloseTo(82.46, 2)
  expect(kgToLb(82.46)).toBeCloseTo(181.8, 1)
})
it('carry-forward fills ≤7 days then fuses', () => {
  const days = { ...D('2026-01-01', 80), ...D('2026-01-11', 79) }
  const s = dailySeries(days, 'all', '2026-01-11')
  expect(s.points[0].kg).toBe(80)                    // 01-01
  expect(s.points[7].kg).toBe(80)                    // 01-08 = last carry (1+7)
  expect(s.points[8].kg).toBeUndefined()             // 01-09 fused
  expect(s.points[10].kg).toBe(79)                   // 01-11 resume
})
it('trend dies with kg (fuse) and resumes immediately at new weigh-in', () => {
  const days = { ...D('2026-01-01', 80), ...D('2026-01-11', 79) }
  const s = dailySeries(days, 'all', '2026-01-11')
  expect(s.points[8].trend).toBeUndefined()
  expect(s.points[10].trend).toBeCloseTo(79.5, 5)    // defined window values: 01-05..01-08 carry 80 + 01-11 79
  expect(s.points[0].trend).toBe(80)                 // expanding window from day one
})
it('range window clamps to first weigh-in with pre-window carry', () => {
  const days = { ...D('2025-12-01', 80), ...D('2026-01-15', 79) }
  const s = dailySeries(days, 30, '2026-01-15')
  expect(s.start).toBe('2025-12-17')                 // today−29
  expect(s.points[0].kg).toBe(80)                    // carry from 12-01 (≤7 days)
})
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement**

```ts
import type { DayLog, WeightTag } from '../types'
import { addDays, daysBetween, todayKey } from './date'

export const LB_PER_KG = 2.2046226218
export const MAX_GAP_DAYS = 7
export const SLOW_RATE = 0.005
export const FAST_RATE = 0.01
export const TAG_COLORS: Record<WeightTag, string> = { cheat: '#f5a623', strength: '#5b3df5', cardio: '#34c0eb', stress: '#8a8a8e', period: '#f56fa1' }
export type Range = 30 | 90 | 'all'
export interface WeighIn { date: string; kg: number }
export interface DailyPoint { date: string; kg: number | undefined; trend: number | undefined }
export interface Series { start: string; end: string; points: DailyPoint[]; weighInCount: number }

export const round1 = (x: number) => Math.round(x * 10) / 10
export const kgToLb = (kg: number) => kg * LB_PER_KG
export const lbToKg = (lb: number) => Math.round((lb / LB_PER_KG) * 100) / 100

export function extractWeighIns(days: Record<string, DayLog>): WeighIn[] {
  return Object.entries(days)
    .filter(([, d]) => typeof d.weightKg === 'number' && d.weightKg > 0)
    .map(([date, d]) => ({ date, kg: d.weightKg as number }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export function dailySeries(days: Record<string, DayLog>, range: Range, today = todayKey()): Series {
  const weighIns = extractWeighIns(days)
  const first = weighIns[0]?.date
  if (!first || first > today) return { start: today, end: today, points: [], weighInCount: weighIns.length }
  const windowStart = range === 'all' ? first : addDays(today, -(range - 1))
  const start = windowStart < first ? first : windowStart
  const byDate = new Map(weighIns.map(w => [w.date, w.kg]))
  const pre = [...weighIns].reverse().find(w => w.date <= start)
  let lastDate: string | null = pre ? pre.date : null
  let lastKg: number | undefined = pre ? pre.kg : undefined
  const points: DailyPoint[] = []
  const n = daysBetween(start, today)
  for (let i = 0; i <= n; i++) {
    const date = addDays(start, i)
    const w = byDate.get(date)
    if (w != null) { lastDate = date; lastKg = w }
    const kg = w != null ? w
      : lastKg != null && lastDate != null && daysBetween(lastDate, date) <= MAX_GAP_DAYS ? lastKg
      : undefined
    let trend: number | undefined
    if (kg !== undefined) {
      let sum = 0, cnt = 0
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        const v = points[j]?.kg
        if (v !== undefined) { sum += v; cnt++ }
      }
      trend = cnt > 0 ? sum / cnt : undefined
    }
    points.push({ date, kg, trend })
  }
  return { start, end: today, points, weighInCount: weighIns.length }
}
```

- [ ] **Step 4: Run → PASS** (`npx vitest run src/lib/weight.test.ts`). **Step 5: Commit** `feat(weight): daily series with carry-forward fuse and 7-day SMA`

### Task 5: `weight.ts` — corridor, weekly rate, deficit, bounds

**Files:**
- Modify: `src/lib/weight.ts` (append)
- Test: `src/lib/weight.test.ts` (append)

**Interfaces:**
- Produces: `interface Corridor { anchorDate: string; slow: {date;v}[]; fast: {date;v}[] }`, `safeCorridor(weighIns, s, goalWeightKg): Corridor | null`; `interface WeekRate { weekStart: string; delta: number }`, `weeklyRate(s, today?): WeekRate[]`; `interface DeficitPoint { date; deficit }`, `deficitSeries(days, s, budget): DeficitPoint[]`; `padBounds(min,max,padRatio?,minPad?)`, `symmetricBounds(values, floor)`.

- [ ] **Step 1: Failing tests**

```ts
const WI = [{ date: '2026-01-01', kg: 80 }, { date: '2026-01-02', kg: 79.5 }, { date: '2026-01-03', kg: 79 }]
it('corridor anchors at 3rd weigh-in, rails at 0.5%/1% per week, stops at goal', () => {
  const s = dailySeries({ ...D('2026-01-01', 80), ...D('2026-01-02', 79.5), ...D('2026-01-03', 79) }, 'all', '2026-02-15')
  const c = safeCorridor(WI, s, 70)
  expect(c!.anchorDate).toBe('2026-01-03')
  const w0 = s.points[2].trend!
  expect(c!.slow[0].v).toBe(w0)
  expect(c!.slow[7].v).toBeCloseTo(w0 * 0.995, 5)    // 7 days later
  expect(c!.fast[c!.fast.length - 1].v).toBe(70)     // clamped at goal, ends there
  expect(safeCorridor(WI, s, 90)).toBeNull()         // goal ≥ W₀
  expect(safeCorridor(WI.slice(0, 2), s, 70)).toBeNull()
  expect(safeCorridor(WI, s, null)).toBeNull()
})
it('weekly rate: completed weeks only, mid-week first week folds to defined span', () => {
  // Wed 2026-01-07 weigh-in 80; Fri 01-09 79; next Wed 01-14 78.2 → week 01-05 completes 01-12
  const days = { ...D('2026-01-07', 80), ...D('2026-01-09', 79), ...D('2026-01-14', 78.2) }
  const s = dailySeries(days, 'all', '2026-01-20')
  const r = weeklyRate(s, '2026-01-20')
  const w1 = r.find(x => x.weekStart === '2026-01-05')!
  expect(w1.delta).toBeCloseTo(s.points[9].trend! - s.points[7].trend!, 5)  // defined span Fri..Sun
  expect(r.find(x => x.weekStart === '2026-01-12')).toBeDefined()
  // in-progress week excluded: weekStart 2026-01-19 must be absent (ends 01-25 > today)
  expect(r.find(x => x.weekStart === '2026-01-19')).toBeUndefined()
})
it('deficit series: only existing day keys; net − budget', () => {
  const day = (cal: number, ex: number): DayLog => ({ date: 'x', meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: ex ? [{ id: 'e', name: 'Run', caloriesBurned: ex }] : [] })
  // seed food calories via a food entry would be heavy — instead assert with a stubbed DayLog built by helper `seedDayFood` below
})
it('bounds padding: 20% with 0.5 floor; symmetric ×1.2 around 0', () => {
  expect(padBounds(80, 82)).toEqual({ lo: 79.6, hi: 82.4 })
  expect(padBounds(80, 80.05)).toEqual({ lo: 79.5, hi: 80.55 })  // floor pad 0.5
  expect(symmetricBounds([1948, -500], 1)).toEqual({ lo: -2337.6, hi: 2337.6 })
})
```

(For the deficit test, build a `DayLog` with one `LogEntry` whose `foodSnapshot.nutrition.calories` is set — same helper style as `DaySummaryCard.test.tsx`'s `food()`.)

- [ ] **Step 2: FAIL.** **Step 3: Implement** (append to weight.ts; deficit uses `dayFoodNutrition`/`exerciseTotal` from `./nutrition`; `weekOf` from `./date`):

```ts
export interface Corridor { anchorDate: string; slow: { date: string; v: number }[]; fast: { date: string; v: number }[] }
export function safeCorridor(weighIns: WeighIn[], s: Series, goalWeightKg: number | null): Corridor | null {
  if (goalWeightKg == null || weighIns.length < 3) return null
  const anchorDate = weighIns[2].date < s.start ? s.start : weighIns[2].date
  const idx = daysBetween(s.start, anchorDate)
  const w0 = s.points[idx]?.trend
  if (w0 == null || goalWeightKg >= w0) return null
  const rail = (rate: number) => {
    const out: { date: string; v: number }[] = []
    for (let i = idx; i < s.points.length; i++) {
      const v = w0 - w0 * rate * (daysBetween(anchorDate, s.points[i].date) / 7)
      if (v <= goalWeightKg) { out.push({ date: s.points[i].date, v: goalWeightKg }); break }
      out.push({ date: s.points[i].date, v })
    }
    return out
  }
  return { anchorDate, slow: rail(SLOW_RATE), fast: rail(FAST_RATE) }
}

export interface WeekRate { weekStart: string; delta: number }
export function weeklyRate(s: Series, today = todayKey()): WeekRate[] {
  const first = s.points.find(p => p.trend !== undefined)
  if (!first) return []
  const out: WeekRate[] = []
  let ws = weekOf(first.date)[0]
  while (daysBetween(addDays(ws, 7), today) >= 0 && addDays(ws, 7) <= today) {
    const defined = s.points.filter(p => p.date >= ws && p.date < addDays(ws, 7) && p.trend !== undefined)
    if (defined.length >= 2) out.push({ weekStart: ws, delta: (defined[defined.length - 1].trend as number) - (defined[0].trend as number) })
    ws = addDays(ws, 7)
  }
  return out
}

export interface DeficitPoint { date: string; deficit: number }
export function deficitSeries(days: Record<string, DayLog>, s: Series, budget: number): DeficitPoint[] {
  return s.points.filter(p => days[p.date] != null).map(p => {
    const d = days[p.date]
    return { date: p.date, deficit: (dayFoodNutrition(d).calories - exerciseTotal(d)) - budget }
  })
}

export function padBounds(min: number, max: number, padRatio = 0.2, minPad = 0.5): { lo: number; hi: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return { lo: 0, hi: 1 }
  if (min === max) return { lo: min - minPad, hi: max + minPad }
  const pad = Math.max((max - min) * padRatio, minPad)
  return { lo: min - pad, hi: max + pad }
}
export function symmetricBounds(values: number[], floor: number): { lo: number; hi: number } {
  const m = Math.max(0, ...values.map(v => Math.abs(v)), floor)
  return { lo: -m * 1.2, hi: m * 1.2 }
}
```

- [ ] **Step 4: PASS.** **Step 5: Commit** `feat(weight): safe-loss corridor, weekly rate, deficit series, bounds`

### Task 6: i18n — `weight.*` namespace + `goals.goalWeight` ×6 locales

**Files:**
- Modify: `src/i18n/locales/{en,zh,es,fr,ru,ar}.json`

**Interfaces:**
- Produces: keys `weight.title, weight.placeholder, weight.kg, weight.lb, weight.range30, weight.range90, weight.rangeAll, weight.trendTitle, weight.legendDot, weight.legendTrend, weight.legendCorridor, weight.readoutWeight, weight.readoutTrend, weight.noData, weight.tagCheat, weight.tagStrength, weight.tagCardio, weight.tagStress, weight.tagPeriod, weight.empty0, weight.empty1, weight.corridorNoGoal, weight.corridorBadGoal, weight.rateSub, weight.deficitSub, goals.goalWeight`.

- [ ] **Step 1: Add en block (source of truth) after `"dashboard"`:**

```json
"weight": {
  "title": "Weight", "placeholder": "Not recorded", "kg": "kg", "lb": "lb",
  "range30": "30d", "range90": "90d", "rangeAll": "All",
  "trendTitle": "Weight Trend",
  "legendDot": "Weigh-in", "legendTrend": "7-day average", "legendCorridor": "Safe corridor",
  "readoutWeight": "Weight", "readoutTrend": "Trend", "noData": "Not recorded",
  "tagCheat": "Cheat meal", "tagStrength": "Strength", "tagCardio": "Cardio", "tagStress": "Poor sleep/stress", "tagPeriod": "Period",
  "empty0": "Record your first weigh-in on the Log page to see your trend here.",
  "empty1": "Log a few more days to reveal the 7-day average.",
  "corridorNoGoal": "Set a goal weight to see the safe-loss corridor.",
  "corridorBadGoal": "Goal weight must be below your starting trend.",
  "rateSub": "Weekly change", "deficitSub": "Daily calorie balance"
}
```
and `"goalWeight": "Goal weight"` inside `goals`. Then mirror to zh (体重/未记录/kg/磅/30天/90天/全部/体重趋势/打卡/7天均值/安全通道/体重/均线/未记录/放纵餐/力量训练/大体量有氧/熬夜高压/生理期/在 Log 页记录第一次体重后，这里会出现你的趋势图。/再记录几天，7 天均线就会显现。/设置目标体重后显示安全减重通道。/目标体重需低于起始趋势。/每周变化/每日热量差额/目标体重), es, fr, ru, ar (translate all 25+1 keys; parity test enforces completeness).

- [ ] **Step 2: Run** `npx vitest run src/i18n/i18n.test.ts` → PASS only when all 6 files complete.
- [ ] **Step 3: Commit** `feat(i18n): weight namespace and goal weight label in all locales`

### Task 7: WeightCard + NumberInput Enter commit + Log mount

**Files:**
- Create: `src/components/WeightCard.tsx`, `src/components/WeightCard.test.tsx`
- Modify: `src/components/NumberInput.tsx` (add optional `onKeyDown` prop), `src/routes/Log.tsx` (render after `<ExerciseCard />`)

**Interfaces:**
- Consumes: Task 2 context fns, Task 4 converters, Task 6 keys.
- Produces: component `WeightCard`; testids `weight-input`, `weight-unit-kg`, `weight-unit-lb`, `weight-tag-{cheat|strength|cardio|stress|period}`.

- [ ] **Step 1: Failing tests** (seed `cc.settings` for unit tests; render inside `AppProvider`)

```tsx
it('renders after ExerciseCard', ...)                       // Log route: index of weight-input > index of exercise-add
it('kg input stores kg', type '82.5' → cc.days weightKg 82.5)
it('lb input stores kg at 2 decimals', seed unit lb, type '181.8' → 82.46)
it('unit toggle persists globally', click weight-unit-lb → cc.settings.weightUnit 'lb')
it('input displays converted value per unit', seed weightKg 82.5 + unit lb → input value '181.9')  // round1(82.5×2.20462)=181.88→181.9
it('clearing input deletes weightKg', userEvent.clear → 'weightKg' absent)
it('tags multi-toggle', click cheat + strength → tags ['cheat','strength']; click cheat → ['strength'])
it('Enter commits', fire keydown Enter on input → blur normalizes)
```

- [ ] **Step 2: FAIL.** **Step 3: Implement** — NumberInput gains `onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void` passed to `<input>`. WeightCard:

```tsx
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { NumberInput } from './NumberInput'
import { kgToLb, lbToKg, round1 } from '../lib/weight'
import type { WeightTag } from '../types'

const TAGS: { key: WeightTag; label: string }[] = [
  { key: 'cheat', label: 'weight.tagCheat' }, { key: 'strength', label: 'weight.tagStrength' },
  { key: 'cardio', label: 'weight.tagCardio' }, { key: 'stress', label: 'weight.tagStress' },
  { key: 'period', label: 'weight.tagPeriod' },
]

export function WeightCard() {
  const { t } = useTranslation()
  const { day, settings, updateSettings, setDayWeight, toggleDayTag } = useApp()
  const unit = settings.weightUnit
  const stored = day.weightKg ?? null
  const shown = stored == null ? 0 : round1(unit === 'kg' ? stored : kgToLb(stored))
  return (
    <div className="card">
      <strong>{t('weight.title')}</strong>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <NumberInput testId="weight-input" value={shown} hideZero placeholder={t('weight.placeholder')}
          onChange={v => setDayWeight(v > 0 ? (unit === 'kg' ? Math.round(v * 100) / 100 : lbToKg(v)) : null)}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{ width: 100, textAlign: 'end' }} />
        <div className="row" style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {(['kg', 'lb'] as const).map(u => (
            <button key={u} type="button" data-testid={`weight-unit-${u}`} onClick={() => updateSettings({ weightUnit: u })}
              style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: unit === u ? 'var(--accent)' : 'var(--card)', color: unit === u ? '#fff' : 'inherit' }}>
              {t(`weight.${u}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {TAGS.map(({ key, label }) => {
          const on = (day.tags ?? []).includes(key)
          return (
            <button key={key} type="button" data-testid={`weight-tag-${key}`} onClick={() => toggleDayTag(key)}
              style={{ padding: '6px 10px', borderRadius: 999, border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'inherit', fontSize: 12 }}>
              {t(label)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

Log.tsx: `import { WeightCard } from '../components/WeightCard'` + `<WeightCard />` directly after `<ExerciseCard />`.

- [ ] **Step 4: PASS + full suite.** **Step 5: Commit** `feat(log): weight check-in card with unit toggle and event tags`

### Task 8: Goals page — goal weight row

**Files:**
- Modify: `src/routes/Goals.tsx` (after fiberTarget row), `src/routes/Goals.test.tsx`

**Interfaces:**
- Consumes: `settings.goalWeightKg`, `settings.weightUnit`, Task 4 converters, `goals.goalWeight` key.
- Produces: testid `goal-weight` (NumberInput, value per display unit; persists `goalWeightKg` in kg; empty → `null`).

- [ ] **Step 1: Failing tests**: render Goals → set `goal-weight` to 80 → `cc.settings.goalWeightKg === 80`; with unit lb type 176.37 → `goalWeightKg === 80`; clear → `goalWeightKg === null`.
- [ ] **Step 2: FAIL.** **Step 3: Implement**:

```tsx
const gwUnit = settings.weightUnit
const gwShown = settings.goalWeightKg == null ? 0 : round1(gwUnit === 'kg' ? settings.goalWeightKg : kgToLb(settings.goalWeightKg))
<label className="row spread">{t('goals.goalWeight')}
  <NumberInput testId="goal-weight" value={gwShown} hideZero
    onChange={v => updateSettings({ goalWeightKg: v > 0 ? (gwUnit === 'kg' ? Math.round(v * 100) / 100 : lbToKg(v)) : null })}
    style={{ width: 100, textAlign: 'end' }} /></label>
```

- [ ] **Step 4: PASS.** **Step 5: Commit** `feat(goals): goal weight input`

### Task 9: WeightTrendChart (SVG, three sections + readout)

**Files:**
- Create: `src/components/WeightTrendChart.tsx`, `src/components/WeightTrendChart.test.tsx`
- Modify: `src/routes/Goals.tsx` (render card between header row and targets card)

**Interfaces:**
- Consumes: Task 4/5 everything, Task 6 keys, `TAG_COLORS`.
- Produces: exported `WeightTrendChart`; testids: `weight-trend-svg`, `range-30|90|all`, `trend-readout`, `trend-dot-{date}`, `trend-line`, `corridor-fill`, `corridor-rail-slow`, `corridor-rail-fast`, `event-dot-{date}`, `event-multi-{date}`, `deficit-bar-{date}`, `rate-bar-{weekStart}`, hit rects `hit-{date}`.

- [ ] **Step 1: Failing tests** (fixed dates, no real clock: pass `today` through? — component uses `todayKey()` internally; tests seed data relative to real today via `todayKey()`/`addDays`):

```tsx
// helpers: seed days via cc.days with weightKg/tags/food entries relative to todayKey()
it('empty state when no weigh-ins')                                     // weight.empty0 text, no svg
it('single weigh-in: dot but no trend line + empty1 hint')
it('dots render per weigh-in in range; trend line present at ≥3')
it('corridor renders with goal below W0; hidden with hints otherwise')  // rail testids + hint text
it('range switch filters dots', ...)                                    // seed old weigh-in: visible at 'all', absent at 30
it('event lane: single colored dot vs multi "+"')                       // fill = TAG_COLORS.cheat; event-multi present
it('readout defaults to latest in-range weigh-in; updates on tap')      // fireEvent.pointerDown(svg, {clientX}) with getBoundingClientRect mocked
it('deficit bars only for existing day keys, green when negative')
it('rate bars for completed non-zero weeks, centered on week span')     // x(width) = 7-day span; assert width ratio ≈ 7/total
```

- [ ] **Step 2: FAIL.** **Step 3: Implement** (core skeleton; full code in component):

```tsx
const W = 360, PAD_L = 36, PAD_R = 6, MAIN_H = 200, LANE_H = 16, SUB_H = 60, GAP = 10
// layout: readout div → range buttons → svg (three sections stacked with fixed y offsets) → legend
export function WeightTrendChart() {
  const { t } = useTranslation()
  const { days, settings } = useApp()
  const [range, setRange] = useState<Range>(90)
  const [sel, setSel] = useState<string | null>(null)
  const weighIns = useMemo(() => extractWeighIns(days), [days])
  const s = useMemo(() => dailySeries(days, range), [days, range])
  const corr = useMemo(() => safeCorridor(weighIns, s, settings.goalWeightKg), [weighIns, s, settings.goalWeightKg])
  const rates = useMemo(() => weeklyRate(s).filter(r => r.delta !== 0), [s])
  const deficits = useMemo(() => deficitSeries(days, s, settings.dailyBudget), [days, s, settings.dailyBudget])
  const perLb = settings.weightUnit === 'lb'
  const conv = (kg: number) => round1(perLb ? kgToLb(kg) : kg)
  const total = Math.max(1, daysBetween(s.start, s.end))
  const x = (date: string) => PAD_L + (daysBetween(s.start, date) / total) * (W - PAD_L - PAD_R)
  if (weighIns.length === 0) return <div className="card"><strong>{t('weight.trendTitle')}</strong><div className="muted">{t('weight.empty0')}</div></div>
  // main bounds from dots+trend+rails; sub bounds symmetricBounds(...)
  // readout point: sel ?? last weigh-in within [s.start, s.end]
  // hit handler (locked): CTM inverse matrix math, fallback rect ratio; nearest column → setSel
  // render: corridor fill+rails → dots → trend segments (M on gaps) → x/y labels → event lane → deficit bars → rate bars
}
```

Rendering rules (verbatim from spec §6): corridor fill opacity 0.08 `var(--green)`; rails `var(--muted)` dasharray `4 4`; dots r=3 `#b0b0b5` opacity 0.55; trend `var(--accent)` width 2.5; event lane single r=4 TAG_COLORS / multi r=5 card-fill + accent stroke + `+` glyph; deficit bars column width ×0.7 green/red; rate bars full-week span centered; x labels 5 ticks `Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' })`; y labels converted `toFixed(1)`; legend muted row.

- [ ] **Step 4: PASS + full suite + `npx tsc --noEmit`.** **Step 5: Commit** `feat(goals): weight trend chart with corridor, deficit and rate sub-charts`

### Task 10: Regression, build, push

- [ ] `npx vitest run` (all green), `npx tsc --noEmit`, `npm run build` succeeds.
- [ ] `git push` (tasks already committed individually).
