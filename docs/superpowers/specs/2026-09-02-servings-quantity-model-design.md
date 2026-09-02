# Servings / Quantity Model Refactor — Design

Date: 2026-09-02
Topic: A — servings/quantity model (one of three independent topics)

## Goal

Reinterpret `LogEntry.quantity` as **number of servings** (default 1, supports 2 decimals) instead of raw units (e.g. 200 for 200 g), and collapse every food to a **single serving**. A food's nutrition is expressed for that one serving; logging "1.5" means 1.5× the nutrition. Removes the multi-serving concept from the UI (add-serving, make-primary) and the serving dropdown from the detail page.

## Decisions locked (from brainstorming)

1. **No migration of `cc.days`.** Existing log entries keep their raw `quantity` (e.g. 200). Under the new semantics these read as "200 servings" and overcount calories until the user deletes/re-logs them. Accepted as the cost of not migrating.
2. **Collapse to primary serving at load** (runtime, no schema bump). Foods with 2+ servings in storage are normalized to their single primary serving on app load and on import/restore.
3. **Free-form quantity input, 2 decimals, default 1.** No steppers, no quick-select chips.

## Architecture & data model

**Single semantic change in production logic** — `entryNutrition` in `src/lib/nutrition.ts`:

```ts
export function entryNutrition(entry: LogEntry): Nutrition {
  return scaleNutrition(entry.foodSnapshot.nutrition, entry.quantity)
}
```

Previously `factor = entry.quantity / primaryServing(foodSnapshot).amount`. Now `factor = entry.quantity` (servings). `primaryServing().amount` is no longer used in the factor — only for the display label ("Grams (100g)").

`Food.servings` stays `Serving[]` (single-element array). No type change, no storage-format change, no schema version bump. This keeps `cc.days` / `cc.myFoods` / `cc.foodOverrides` / `predefinedFoods.json` / import-export structurally compatible.

`computedCalories`, `scaleNutrition`, `sumNutrition`, `mealNutrition`, `dayFoodNutrition`, `remaining`, `underOver` are unchanged — they build on `entryNutrition`.

## Runtime collapse

New helper in `src/lib/food.ts`:

```ts
/** Collapse to the primary serving only — the single-serving model keeps the
 *  primary and discards the rest. Nutrition is already expressed for the
 *  primary serving (per the Food type doc), so no rescaling is needed. */
export function collapseToPrimaryServing(food: Food): Food {
  const primary = food.servings.find(s => s.isPrimary) ?? food.servings[0]
  return { ...food, servings: [{ ...primary, isPrimary: true }] }
}
```

Applied in `AppContext.tsx`:
- `const predefined = (predefinedRaw as Food[]).map(collapseToPrimaryServing)`
- `useState<Food[]>(() => loadMyFoods().map(collapseToPrimaryServing))`
- `useState<Record<string, Food>>(() => Object.fromEntries(Object.entries(loadFoodOverrides()).map(([k, f]) => [k, collapseToPrimaryServing(f)])))`
- `importFoods(foods)`: collapse incoming foods before persisting.
- `replaceAll(data)`: collapse `data.myFoods` and `data.foodOverrides` values before persisting, so memory state is single-serving without a reload.

Write paths (`addMyFood`, `updateMyFood`, `overrideFood`) need no collapse — `FoodForm` already saves a single serving.

`cc.days` is not touched. Old entries keep raw `quantity` and multi-serving `foodSnapshot.servings`, but:
- `entryNutrition` ignores `servingId` and `serving.amount` — computes `nutrition × quantity`.
- `MealCard` reads `primaryServing(e.foodSnapshot)` for `ps.label` — still returns the primary on a multi-serving snapshot. Display is fine; the `quantity` number just looks wrong (200 Grams). Accepted.

## FoodForm (new/edit food)

Single serving row; remove `addServing` and `makePrimary`. `updateServing` stays (edits the single serving's label/amount/unit).

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

The `food.servings.length < 1` save guard is removed (unreachable — `newFood()`/`initial` guarantee one serving after collapse). `useState` initializer also collapses `initial`:

```ts
const [food, setFood] = useState<Food>(() => {
  const base = initial ? JSON.parse(JSON.stringify(initial)) : newFood()
  return collapseToPrimaryServing(base)
})
```

No new i18n keys. `newServing()` already returns one `isPrimary: true` serving. TestIds added: `serving-label`, `serving-amount`.

## FoodDetail

Quantity defaults to **1**, free-form 2 decimals, serving dropdown removed (only one serving). Remove the bottom servings-list card (now redundant — the static label at the quantity row shows it).

```tsx
const [qty, setQty] = useState(1)
// servingId state removed; entry uses food.servings[0].id (or primaryServing(food).id)
const entry: LogEntry = { id: newId(), foodSnapshot: food, servingId: primaryServing(food).id, quantity: qty }
```

Quantity card:

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

`NumberInput` already supports decimals via `parseFloat`; no component change. `food-detail-add`/`-edit`/`-full`/`-delete`/`-reset`/`-close` and `qty-input` testIds unchanged.

## MealCard (no change)

`MealCard.tsx:34` keeps `{e.quantity} {ps.label}` → new entries show e.g. "1.5 Grams"; old entries show "200 Grams" (overcount accepted).

## Tests (TDD: RED first)

**Contract rewrites** (old `quantity / amount` semantics → new servings semantics) in `src/lib/nutrition.test.ts`:
- `entryNutrition scales by quantity/primary amount (per-100g)` → rename to "scales by servings count"; `entry(food(130), 6).calories === 780` (6 servings × 130).
- `dayFoodNutrition sums meals` → `entry(food(130), 1)` each, 260 total.
- `remaining subtracts food and adds back exercise` → `entry(food(500), 1)` → 500, remaining 1600.
- `underOver` → `entry(food(400), 1)` both cases.
- `entryNutrition works for per-Serving foods` → already matches new semantics (amount=1), unchanged.
- `scaleNutrition multiplies leaves`, `primaryServing picks the primary`, `emptyNutrition`, `computedCalories` → unchanged.

These are legitimate RED→GREEN: change the assertion to the new contract, watch it fail against the current `entryNutrition` (which still divides by amount), then change `entryNutrition` to `scaleNutrition(n, quantity)`.

**New tests:**
- `food.test.ts`: `collapseToPrimaryServing` — 2-serving food collapses to single primary serving, `isPrimary: true`, other serving discarded, nutrition untouched.
- `FoodForm.test.tsx`: renders one serving row, no "add serving" button, no `★` primary radio; editing `serving-label`/`serving-amount` updates the saved food's single serving.
- `FoodDetail.test.tsx`: `qty-input` defaults to `1`; change to `1.5` → preview cals = 1.5× base; no serving `<select>` (no `aria-label={serving}` dropdown); bottom servings-list card gone.
- `AppContext.test.tsx`: `myFoods`/`overrides` loaded from storage with 2 servings collapse to 1 on load.

**Scan + update** any other test that encodes the old `qty/amount` factor — candidates: `AppContext.test.tsx`, `weekly.test.ts`, `MealCard.test.tsx`, `Dashboard.test.tsx`. Update fixtures to the new servings meaning where they pass raw quantities through `entryNutrition`.

## Out of scope

- Per-serving nutrition (each serving maintains its own macros) — separate design if needed later (YAGNI now).
- Topics B (Goals macro auto-calc) and C (delete predefined foods) — separate designs.
- Migrating `cc.days` to fix legacy entries — explicitly declined.
