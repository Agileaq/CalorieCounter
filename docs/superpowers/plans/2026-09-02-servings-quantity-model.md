# Servings / Quantity Model Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reinterpret `LogEntry.quantity` as number of servings (default 1, 2 decimals) and collapse every food to a single serving, removing the multi-serving UI and the detail-page serving dropdown.

**Architecture:** One semantic change in `entryNutrition` (factor = quantity, not quantity/amount). A `collapseToPrimaryServing` helper normalizes foods to their single primary serving at load/import/restore (no schema bump). `Food.servings` stays a `Serving[]` (single-element) for storage/format compatibility. `cc.days` is not migrated — legacy entries keep raw quantities and overcount until deleted/re-logged (accepted).

**Tech Stack:** React 19, react-router-dom 7, Vite, i18next, Vitest, @testing-library/react, TypeScript strict (`noUnusedLocals` + `noUnusedParameters`).

**Spec:** `docs/superpowers/specs/2026-09-02-servings-quantity-model-design.md`

## Global Constraints

- **TDD:** Write the failing test, watch it fail for the right reason, write minimal code to pass, watch it pass. Every behavior change is test-first.
- **Strict TS:** `noUnusedLocals` and `noUnusedParameters` are on. When you remove a function's call sites, you MUST also remove its declaration, and remove imports that become unused (e.g. `primaryServing` in `nutrition.ts` after Task 1). Failing to do so breaks `tsc`/build.
- **i18n parity:** All 6 locale files (en/zh/es/fr/ru/ar) must share keys. This plan adds NO new keys, so no locale edits are needed — but if you add a key, add it to all 6.
- **No schema bump:** `CURRENT_SCHEMA_VERSION` stays 1; `migrations.ts` stays empty. Do not touch `cc.days`.
- **Commit after every task** and push (user rule: "always push after commit"). End commit messages with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- **Test command:** `npx vitest run <path>` for a single file; `npm test` for the whole suite.

---

## File Structure

- `src/lib/nutrition.ts` — change `entryNutrition` factor; drop now-unused `primaryServing` import.
- `src/lib/food.ts` — add `collapseToPrimaryServing`.
- `src/lib/nutrition.test.ts` — rewrite 4 contract assertions to servings semantics.
- `src/lib/food.test.ts` — add `collapseToPrimaryServing` test.
- `src/state/AppContext.tsx` — apply collapse at 3 initializers + `importFoods` + `replaceAll`.
- `src/state/AppContext.test.tsx` — rewrite the `quantity: 200` test to servings; add collapse-on-load test.
- `src/components/FoodForm.tsx` — single serving row; remove `addServing`/`makePrimary`; collapse `initial`; drop save guard.
- `src/components/FoodForm.test.tsx` — add single-serving-row test.
- `src/components/FoodDetail.tsx` — default qty 1; remove serving dropdown + bottom servings card; drop `servingId` state.
- `src/components/FoodDetail.test.tsx` — add qty-defaults-to-1 + no-dropdown test.
- `src/lib/weekly.test.ts` — fix the `quantity: 100` fixture (overcounts under new semantics) to `quantity: 1`.

No new files. No changes to `types.ts`, `predefinedFoods.json`, `MealCard.tsx`, `importExport.ts`, `storage.ts`, `migrations.ts`, `NumberInput.tsx`, or locale files.

---

### Task 1: Rewrite `entryNutrition` to servings semantics

The single production semantic change. TDD: rewrite the contract tests first (RED), then the function (GREEN).

**Files:**
- Modify: `src/lib/nutrition.ts:45-49` (`entryNutrition`)
- Test: `src/lib/nutrition.test.ts` (rewrite 4 assertions)

**Interfaces:**
- Consumes: `scaleNutrition`, `LogEntry` (already imported in `nutrition.ts`).
- Produces: `entryNutrition(entry) = scaleNutrition(entry.foodSnapshot.nutrition, entry.quantity)`. Downstream consumers (`mealNutrition`, `dayFoodNutrition`, `remaining`, `underOver`, `MealCard`, `Dashboard`) unchanged — they get new behavior automatically.

- [ ] **Step 1: Rewrite the failing contract tests in `src/lib/nutrition.test.ts`**

Replace these four test bodies (keep the `entry`/`food`/`day` helpers and the other tests untouched). The `entry(food(120,1)` per-Serving test stays as-is — it already matches new semantics.

Replace the test at lines ~40-43:
```ts
  it('entryNutrition scales by servings count', () => {
    // 130 cal per serving, log 6 servings -> 780
    expect(entryNutrition(entry(food(130), 6)).calories).toBe(780)
  })
```

Replace the `dayFoodNutrition sums meals` test (~50-52):
```ts
  it('dayFoodNutrition sums meals', () => {
    expect(dayFoodNutrition(day([entry(food(130), 1), entry(food(130), 1)])).calories).toBe(260)
  })
```

Replace the `remaining` test (~53-56):
```ts
  it('remaining subtracts food and adds back exercise', () => {
    // budget 2000, food 500, exercise 100 -> 2000 - (500 - 100) = 1600
    expect(remaining(2000, day([entry(food(500), 1)], 100))).toBe(1600)
  })
```

Replace the `underOver` test (~61-64):
```ts
  it('underOver: positive is under, negative is over', () => {
    expect(underOver(2000, day([entry(food(400), 1)])).toEqual({ kind: 'under', amount: 1600 })
    expect(underOver(300, day([entry(food(400), 1)])).toEqual({ kind: 'over', amount: 100 })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/nutrition.test.ts`
Expected: 4 tests FAIL — current `entryNutrition` divides quantity by amount, so `entry(food(130), 6)` gives `130 × 6/100 = 7.8`, not 780. The failures confirm the tests encode the new contract.

- [ ] **Step 3: Rewrite `entryNutrition` in `src/lib/nutrition.ts:45-49`**

Replace:
```ts
export function entryNutrition(entry: LogEntry): Nutrition {
  const base = primaryServing(entry.foodSnapshot)
  const factor = base.amount === 0 ? 0 : entry.quantity / base.amount
  return scaleNutrition(entry.foodSnapshot.nutrition, factor)
}
```
With:
```ts
export function entryNutrition(entry: LogEntry): Nutrition {
  // quantity is the number of servings; the food's nutrition is expressed
  // for its (single, primary) serving, so the factor is the quantity itself.
  return scaleNutrition(entry.foodSnapshot.nutrition, entry.quantity)
}
```

Then remove the now-unused `primaryServing` import at `src/lib/nutrition.ts:1`. Change:
```ts
import type { Food, Serving, Nutrition, LogEntry, DayLog, MealKey } from '../types'
```
It imports types, not `primaryServing`. Check the actual import — `primaryServing` is defined in this same file (`nutrition.ts:18`), not imported. So **no import to remove here** — `primaryServing` remains defined and exported (other files import it). Only `entryNutrition` stops using it. Leave `primaryServing` untouched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/nutrition.test.ts`
Expected: all PASS.

- [ ] **Step 5: Run the full suite to find tests encoding the OLD contract**

Run: `npm test`
Expected: failures in `src/state/AppContext.test.tsx` (the `log` button uses `quantity: 200` expecting 260 → now 26000) and `src/lib/weekly.test.ts` (`quantity: 100` → overcounts). These are fixed in Tasks 3 and 7. **Do not commit with these failing** — proceed to Task 2, then 3, then 7, then commit once green. (The next tasks must land together as a coherent change; committing mid-red would break the suite.)

---

### Task 2: Add `collapseToPrimaryServing` helper

**Files:**
- Modify: `src/lib/food.ts` (add export)
- Test: `src/lib/food.test.ts` (add test)

**Interfaces:**
- Consumes: `Food`, `Serving` types (already imported).
- Produces: `collapseToPrimaryServing(food: Food): Food` — returns a copy with `servings: [primary]` (`isPrimary: true`), nutrition untouched.

- [ ] **Step 1: Write the failing test in `src/lib/food.test.ts`**

Add to the imports at line 3:
```ts
import { newFood, newServing, cloneAsCustom, DEFAULT_ICON, collapseToPrimaryServing } from './food'
```
Add a new test inside the `describe('food factory', ...)` block, after the `cloneAsCustom` test:
```ts
  it('collapseToPrimaryServing keeps only the primary serving', () => {
    const primary = { ...newServing(), id: 'p', label: 'Grams', isPrimary: true }
    const other = { ...newServing(), id: 'o', label: 'Cup', isPrimary: false }
    const f = { ...newFood(), name: 'Rice', servings: [primary, other] }
    const c = collapseToPrimaryServing(f)
    expect(c.servings).toHaveLength(1)
    expect(c.servings[0].id).toBe('p')
    expect(c.servings[0].isPrimary).toBe(true)
    expect(c.nutrition).toBe(f.nutrition) // untouched, same reference
    expect(c.name).toBe('Rice')
    // original is not mutated
    expect(f.servings).toHaveLength(2)
  })
  it('collapseToPrimaryServing falls back to the first serving if none is primary', () => {
    const a = { ...newServing(), id: 'a', isPrimary: false }
    const f = { ...newFood(), servings: [a] }
    const c = collapseToPrimaryServing(f)
    expect(c.servings[0].id).toBe('a')
    expect(c.servings[0].isPrimary).toBe(true) // forced true
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/food.test.ts`
Expected: FAIL — `collapseToPrimaryServing is not a function` (import error).

- [ ] **Step 3: Implement `collapseToPrimaryServing` in `src/lib/food.ts`**

Add after `cloneAsCustom` (after line 38):
```ts
/** Collapse to the primary serving only — the single-serving model keeps the
 *  primary and discards the rest. Nutrition is already expressed for the
 *  primary serving (per the Food type doc), so no rescaling is needed. */
export function collapseToPrimaryServing(food: Food): Food {
  const primary = food.servings.find(s => s.isPrimary) ?? food.servings[0]
  return { ...food, servings: [{ ...primary, isPrimary: true }] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/food.test.ts`
Expected: PASS.

---

### Task 3: Apply collapse in `AppContext` + fix the `quantity: 200` test

**Files:**
- Modify: `src/state/AppContext.tsx` (3 initializers + `importFoods` + `replaceAll`)
- Test: `src/state/AppContext.test.tsx` (rewrite `log` test + add collapse-on-load test)

**Interfaces:**
- Consumes: `collapseToPrimaryServing` (from Task 2), `loadMyFoods`/`loadFoodOverrides`/`predefinedRaw` (already imported).
- Produces: `AppProvider` exposes `allFoods`/`myFoods`/`predefined`/`foodOverrides` always single-serving.

- [ ] **Step 1: Fix the failing `AppContext` test (contract rewrite) in `src/state/AppContext.test.tsx`**

In the `Probe` component (lines ~16-19), change the `log` button so `quantity` reflects servings (1 serving = 130 cal):
```tsx
      <button onClick={() => {
        const f = newFood({ name: 'Rice', nutrition: { ...app.allFoods[0].nutrition, calories: 130 } })
        app.addEntry('breakfast', { id: 'e1', foodSnapshot: f, servingId: f.servings[0].id, quantity: 2 })
      }}>log</button>
```
And update the assertion (line ~30-31) — 2 servings × 130 = 260:
```tsx
    // 130 cal/serving × 2 servings = 260
    expect(screen.getByTestId('dayCals').textContent).toBe('260')
```

Then add a collapse-on-load test. Add a new `describe` block at the end of the file:
```tsx
import { newServing } from '../lib/food'

function MultiServingProbe() {
  const app = useApp()
  const first = app.myFoods[0]
  return <span data-testid="myServings">{first ? first.servings.length : 0}</span>
}

describe('AppContext collapse', () => {
  beforeEach(() => localStorage.clear())
  it('collapses myFoods loaded from storage to a single serving', () => {
    const twoServings = newFood({ name: 'Zebra' })
    twoServings.servings = [
      { ...newServing(), id: 'p', label: 'Grams', isPrimary: true },
      { ...newServing(), id: 'o', label: 'Cup', isPrimary: false },
    ]
    localStorage.setItem('cc.myFoods', JSON.stringify([twoServings]))
    render(<AppProvider><MultiServingProbe /></AppProvider>)
    expect(screen.getByTestId('myServings').textContent).toBe('1')
  })
})
```
(Add `newServing` to the existing import from `../lib/food` at the top instead of a second import line if the linter complains — merge into one import.)

- [ ] **Step 2: Run tests to verify the contract test now passes (AppContext) and the collapse test fails**

Run: `npx vitest run src/state/AppContext.test.tsx`
Expected: the rewritten `log` test PASSES (AppContext still uses old `entryNutrition`? No — Task 1 already changed it; `quantity: 2 × 130 = 260` passes). The NEW collapse test FAILS — `myServings` shows `2` because AppContext doesn't collapse yet.

- [ ] **Step 3: Apply collapse in `src/state/AppContext.tsx`**

Add the import (line 10, after the `useApp` import or near other `lib/food`-style imports — there is none yet, so add):
```ts
import { collapseToPrimaryServing } from '../lib/food'
```

Change line 13:
```ts
const predefined = (predefinedRaw as Food[]).map(collapseToPrimaryServing)
```

Change the `myFoods` initializer (line 17):
```ts
  const [myFoods, setMyFoods] = useState<Food[]>(() => loadMyFoods().map(collapseToPrimaryServing))
```

Change the `overrides` initializer (line 18):
```ts
  const [overrides, setOverrides] = useState<Record<string, Food>>(() =>
    Object.fromEntries(Object.entries(loadFoodOverrides()).map(([k, f]) => [k, collapseToPrimaryServing(f)]))
  )
```

In `importFoods` (lines ~57-67), collapse incoming foods before persisting. Change:
```ts
    importFoods: (foods) => {
      const collapsed = foods.map(collapseToPrimaryServing)
      // custom entries become My Foods; predefined entries become in-place overrides
      persistMyFoods(mergeFoods(myFoods, collapsed.filter(f => f.source === 'custom')))
      const overs = collapsed.filter(f => f.source === 'predefined')
      if (overs.length) {
        const next = { ...overrides }
        for (const f of overs) next[f.id] = f
        persistOverrides(next)
      }
      return foods.length
    },
```

In `replaceAll` (lines ~68-71), collapse before persisting:
```ts
    replaceAll: (data) => {
      persistDays(data.days)
      persistMyFoods(data.myFoods.map(collapseToPrimaryServing))
      persistSettings(data.settings)
      persistOverrides(Object.fromEntries(Object.entries(data.foodOverrides ?? {}).map(([k, f]) => [k, collapseToPrimaryServing(f)])))
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/AppContext.test.tsx`
Expected: all PASS, including the new collapse test.

---

### Task 4: Single-serving `FoodForm`

**Files:**
- Modify: `src/components/FoodForm.tsx:11-68` (initial collapse, remove `addServing`/`makePrimary`/guard, single serving row)
- Test: `src/components/FoodForm.test.tsx` (add single-serving-row test)

**Interfaces:**
- Consumes: `collapseToPrimaryServing` (from Task 2).
- Produces: `FoodForm` always renders and saves a single serving. New testIds: `serving-label`, `serving-amount`.

- [ ] **Step 1: Write the failing test in `src/components/FoodForm.test.tsx`**

Add inside the `describe('FoodForm', ...)` block:
```tsx
  it('renders a single serving row and no add-serving or make-primary controls', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    // exactly one label input and one amount input for the serving
    expect(screen.getByTestId('serving-label')).toBeInTheDocument()
    expect(screen.getByTestId('serving-amount')).toBeInTheDocument()
    // no add-serving button
    expect(() => screen.getByText(/add serving/i)).toThrow()
    // no primary radio (no radio named "primary")
    expect(document.querySelector('input[name="primary"]')).toBeNull()
  })
  it('saves the edited serving label/amount/unit on the single serving', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('food-name'), { target: { value: 'Oats' } })
    fireEvent.change(screen.getByTestId('serving-label'), { target: { value: 'Bowl' } })
    fireEvent.change(screen.getByTestId('serving-amount'), { target: { value: '40' } })
    fireEvent.click(screen.getByTestId('food-save'))
    const saved = onSave.mock.calls[0][0]
    expect(saved.servings).toHaveLength(1)
    expect(saved.servings[0].label).toBe('Bowl')
    expect(saved.servings[0].amount).toBe(40)
    expect(saved.servings[0].isPrimary).toBe(true)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/FoodForm.test.tsx`
Expected: both FAIL — no `serving-label`/`serving-amount` testIds exist yet, and `add serving` button is still in the DOM.

- [ ] **Step 3: Refactor `src/components/FoodForm.tsx`**

Add the import at the top (after line 4, the `newFood, newServing` import):
```ts
import { newFood, newServing, collapseToPrimaryServing } from '../lib/food'
```
(Remove the old `import { newFood, newServing } from '../lib/food'` line to avoid a duplicate.)

Change the `useState` initializer (lines 13):
```tsx
  const [food, setFood] = useState<Food>(() => {
    const base = initial ? JSON.parse(JSON.stringify(initial)) : newFood()
    return collapseToPrimaryServing(base)
  })
```

Remove `addServing` and `makePrimary` (lines 20-23):
```tsx
  function addServing() { setFood(f => ({ ...f, servings: [...f.servings, newServing({ isPrimary: false })] })) }
  function makePrimary(id: string) {
    setFood(f => ({ ...f, servings: f.servings.map(s => ({ ...s, isPrimary: s.id === id })) }))
  }
```

Remove the `food.servings.length < 1` guard in `save` (line 27):
```ts
    if (food.servings.length < 1) { setError(t('foodForm.oneServingRequired')); return }
```
The `save` function becomes:
```tsx
  function save() {
    if (!food.name.trim()) { setError(t('foodForm.foodName')); return }
    // calories are always derived from macros (fat×9 + carbs×4 + protein×4);
    // id/source stay as-is — the caller decides where the food lands
    onSave({ ...food, nutrition: { ...food.nutrition, calories: computedCalories(food.nutrition) } })
    onClose()
  }
```

Replace the servings editor block (lines 51-63, the `<div className="card">` containing `food.servings.map(...)` and the add-serving button) with the single-serving row:
```tsx
      <div className="card">
        <strong>{t('foodForm.nutritionFacts')}</strong>
        <div className="muted">{t('foodForm.servingsNote')}</div>
        <div className="row spread" style={{ padding: '8px 0' }}>
          <input data-testid="serving-label" value={food.servings[0].label}
            onChange={e => updateServing(food.servings[0].id, { label: e.target.value })} style={{ flex: 1 }} />
          <NumberInput data-testid="serving-amount" value={food.servings[0].amount}
            onChange={v => updateServing(food.servings[0].id, { amount: v })} style={{ width: 70, textAlign: 'end' }} />
          <input value={food.servings[0].unit} onChange={e => updateServing(food.servings[0].id, { unit: e.target.value })} style={{ width: 50 }} />
        </div>
      </div>
```

Keep the `<NutritionFields .../>` line (64) and the `<IconPicker .../>` line (65) unchanged.

`newServing` is still imported and used by `updateServing`? No — `updateServing` does not call `newServing`. After removing `addServing`, `newServing` is only used by... nothing in this file now. **Remove `newServing` from the import** to satisfy `noUnusedLocals`:
```ts
import { newFood, collapseToPrimaryServing } from '../lib/food'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/FoodForm.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (confirms no unused imports/locals remain).

---

### Task 5: `FoodDetail` — default qty 1, remove serving dropdown

**Files:**
- Modify: `src/components/FoodDetail.tsx:29-150` (qty state, entry, quantity card, remove bottom servings card, drop `servingId`)
- Test: `src/components/FoodDetail.test.tsx` (add test)

**Interfaces:**
- Consumes: `primaryServing` (still used for the static label + entry servingId).
- Produces: `FoodDetail` logs `quantity` = servings (default 1, 2 decimals), no serving `<select>`.

- [ ] **Step 1: Write the failing test in `src/components/FoodDetail.test.tsx`**

Add inside the `describe('FoodDetail', ...)` block:
```tsx
  it('quantity defaults to 1 and the preview scales with servings', () => {
    render(<AppProvider><FoodDetail food={mkFood()} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    const qty = screen.getByTestId('qty-input')
    expect(qty).toHaveValue(1)
    // base calories 130; 1.5 servings → 195
    fireEvent.change(qty, { target: { value: '1.5' } })
    expect(screen.getByTestId('qty-preview-cals')).toHaveTextContent('195')
  })
  it('has no serving dropdown and no bottom servings-list card', () => {
    render(<AppProvider><FoodDetail food={mkFood()} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    // no <select> serving dropdown
    expect(document.querySelector('select')).toBeNull()
    // the static serving label is shown instead
    expect(screen.getByText(/Grams \(100g\)/)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/FoodDetail.test.tsx`
Expected: both FAIL — `qty-input` defaults to `100` (not 1), and a `<select>` dropdown exists.

- [ ] **Step 3: Refactor `src/components/FoodDetail.tsx`**

Change the state and entry (lines 32-38). Remove `servingId` state and default `qty` to 1:
```tsx
  const [showFull, setShowFull] = useState(false)
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(1)

  const n = food.nutrition
  const entry: LogEntry = { id: newId(), foodSnapshot: food, servingId: primaryServing(food).id, quantity: qty }
  const previewCals = Math.round(entryNutrition(entry).calories)
```

Replace the quantity card (lines 64-76):
```tsx
        <div className="card" data-testid="food-detail-quantity">
          <div className="muted">{t('foodForm.quantity')}</div>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <NumberInput testId="qty-input" value={qty} onChange={setQty} style={{ width: 100, padding: 8 }} />
            <span className="muted" style={{ alignSelf: 'center' }}>
              {primaryServing(food).label} ({primaryServing(food).amount}{primaryServing(food).unit})
            </span>
          </div>
          <div className="row spread" style={{ marginTop: 10 }}>
            <span className="muted">{t('foodForm.calories')}</span>
            <strong data-testid="qty-preview-cals">{previewCals} {t('meal.cals', { n: '' }).trim()}</strong>
          </div>
        </div>
```

Remove the bottom servings-list card (lines 129-137, the `<div className="card">` with `foodDetail.servings` and the `food.servings.map(...)` block) entirely.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/FoodDetail.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (`primaryServing` still used; no unused locals).

---

### Task 6: Fix `weekly.test.ts` fixture (encodes old semantics)

**Files:**
- Test: `src/lib/weekly.test.ts:10-25` (`dayWithCalories`)

This test builds entries with `quantity: 100` and a 100g serving expecting `cals × 100/100 = cals`. Under new semantics it's `cals × 100`. Fix the fixture to `quantity: 1` so the test's intent (a day with `cals` total) is preserved.

- [ ] **Step 1: Update the fixture in `src/lib/weekly.test.ts`**

In `dayWithCalories` (line 13), change:
```ts
    quantity: 100,
```
to:
```ts
    quantity: 1,  // 1 serving × cals/serving = cals
```
No other change needed — the serving is `amount: 100` which is now display-only.

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx vitest run src/lib/weekly.test.ts`
Expected: all PASS (it asserts `metric(d) === cals`, and 1 serving × cals = cals).

---

### Task 7: Full suite + type-check green, commit, push

This task lands the coherent change (Tasks 1+3 left the suite red; now everything is green together).

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: ALL tests PASS across all files. If any test still encodes the old `qty/amount` contract and fails, update its fixture to the servings meaning (it's a contract rewrite, same as Tasks 1/3/6) — check `MealCard.test.tsx` and `Dashboard.test.tsx` first. They were scanned and use real components (no raw-quantity fixtures), so they should pass, but verify.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: success (catches anything `tsc` + vitest missed, e.g. unused-export warnings from Vite).

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat(food): quantity means servings; collapse foods to single serving

Reinterpret LogEntry.quantity as number of servings (default 1, 2 decimals)
and collapse every food to its single primary serving at load/import/restore.
entryNutrition factor is now the quantity itself, not quantity/serving.amount.
FoodForm drops add-serving/make-primary; FoodDetail drops the serving dropdown
and the bottom servings list. cc.days is not migrated — legacy entries keep
raw quantities and overcount until deleted (accepted). No schema bump.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
git push
```
Expected: commit + push to main succeed.

---

## Self-Review

**Spec coverage:**
- `entryNutrition` semantic change → Task 1. ✓
- `collapseToPrimaryServing` helper → Task 2. ✓
- AppContext 3 initializers + importFoods + replaceAll → Task 3. ✓
- FoodForm single serving, remove add/primary, collapse initial, drop guard → Task 4. ✓
- FoodDetail default qty 1, 2 decimals, no dropdown, remove bottom card, drop servingId → Task 5. ✓
- MealCard no change → not a task (correct). ✓
- nutrition.test.ts contract rewrites → Task 1. ✓
- food.test.ts collapse test → Task 2. ✓
- FoodForm.test.ts single-serving test → Task 4. ✓
- FoodDetail.test.ts qty-default + no-dropdown tests → Task 5. ✓
- AppContext.test.ts rewrite + collapse-on-load → Task 3. ✓
- weekly.test.ts fixture → Task 6. ✓
- Scan MealCard.test/Dashboard.test → Task 7 Step 1. ✓
- No new i18n keys, no schema bump, no types.ts change → respected throughout. ✓
- "Don't migrate cc.days" → no task touches cc.days; legacy overcount accepted and noted in the commit. ✓

**Placeholder scan:** No TBD/TODO; every step has concrete code or an exact command. ✓

**Type consistency:** `collapseToPrimaryServing(food: Food): Food` defined in Task 2, used in Tasks 3/4 with the same signature. `entryNutrition` signature unchanged (consumers unaffected). `qty-input` testId used in Task 5's test and implementation identically. `serving-label`/`serving-amount` testIds match between Task 4's test and implementation. ✓

No issues found.
