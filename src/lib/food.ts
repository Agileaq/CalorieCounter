import type { Food, Serving, DayLog } from '../types'
import { MEAL_KEYS } from '../types'
import { emptyNutrition } from './nutrition'
import { newId } from './ids'
import { addDays, fromDateKey } from './date'

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

/** Collapse to the primary serving only — the single-serving model keeps the
 *  primary and discards the rest. Nutrition is already expressed for the
 *  primary serving (per the Food type doc), so no rescaling is needed. */
export function collapseToPrimaryServing(food: Food): Food {
  const primary = food.servings.find(s => s.isPrimary) ?? food.servings[0]
  return { ...food, servings: [{ ...primary, isPrimary: true }] }
}

const COUNT_WINDOW_DAYS = 180

/** Classify a serving for display: weight/volume kinds ("每 100g") vs the
 *  count kind ("每份"). Uses the serving's `kind`, not its unit string, so
 *  a count serving whose unit happens to be "g" (e.g. label "serving",
 *  amount 55, unit "g" = "一份 55g") is still treated as a per-serving count.
 *  `amount` kinds without an explicit weight/volume read as "每份". */
export function servingUnitType(s: Serving): 'weight' | 'count' {
  return s.kind === 'weight' || s.kind === 'volume' ? 'weight' : 'count'
}

/**
 * Count how many times each food has been logged over the last COUNT_WINDOW_DAYS
 * days (inclusive of `today - 180`, exclusive of future days), keyed by food id.
 * Derived purely from day logs — no persisted counter — so it rides inside the
 * `days` field of a backup and recomputes on load. Used to rank the All tab by
 * frequency (most-logged first). O(total entries in the window) per render.
 */
export function foodCounts(
  days: Record<string, DayLog>,
  today: string,
  windowDays = COUNT_WINDOW_DAYS,
): Map<string, number> {
  const counts = new Map<string, number>()
  const start = addDays(today, -windowDays)
  const startMs = fromDateKey(start).getTime()
  const endMs = fromDateKey(today).getTime()
  for (const key in days) {
    /* Skip keys we can't parse; keys are "YYYY-MM-DD" but be defensive. */
    const parts = key.split('-').map(Number)
    if (parts.length !== 3 || parts.some(Number.isNaN)) continue
    const ms = fromDateKey(key).getTime()
    if (ms < startMs || ms > endMs) continue
    const day = days[key]
    for (const meal of MEAL_KEYS) {
      for (const e of day.meals[meal]) {
        counts.set(e.foodSnapshot.id, (counts.get(e.foodSnapshot.id) ?? 0) + 1)
      }
    }
  }
  return counts
}
