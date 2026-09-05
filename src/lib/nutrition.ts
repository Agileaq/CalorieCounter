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

/**
 * One-line subtitle describing a logged serving the way the meal log shows it:
 * "{count} 份 · {total} {unit} · {label}" (or the no-label variant that drops
 * the trailing " · {label}"). Shared by MealCard (per entry) and FoodPicker
 * (per food, quantity 1) so both surfaces read identically.
 *
 * `t` is kept as a narrow callable so this pure-data module doesn't import
 * react-i18next; callers pass their hook's `t`. `total` is rounded to one
 * decimal to shed JS float tails (1.1×100 = 110.00000000000001).
 *
 * When `perServingCals` is provided (FoodPicker), a trailing " · {cal} kcal"
 * segment is appended so each food row also shows one serving's calories —
 * the meal log omits this because it already shows calories on the right.
 * The calorie segment always uses the no-label form so a blank label doesn't
 * collapse the spacing ("... · 100 g · 130 kcal", never "... · 130 kcal").
 */
export function servingSubtitle(
  t: (key: string, opts?: Record<string, unknown>) => string,
  quantity: number,
  ps: Serving,
  perServingCals?: number,
): string {
  const total = Math.round(quantity * ps.amount * 10) / 10
  const label = ps.label.trim()
  const base = label
    ? t('meal.entrySubtitle', { count: quantity, total, unit: ps.unit, label })
    : t('meal.entrySubtitleNoLabel', { count: quantity, total, unit: ps.unit })
  if (perServingCals === undefined) return base
  return `${base} · ${t('meal.cals', { n: Math.round(perServingCals) })}`
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
  // quantity is the number of servings; the food's nutrition is expressed
  // for its (single, primary) serving, so the factor is the quantity itself.
  return scaleNutrition(entry.foodSnapshot.nutrition, entry.quantity)
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

/** Calories derived from macros: fat 9 cal/g, carbs 4 cal/g, protein 4 cal/g. */
export function computedCalories(n: Nutrition): number {
  return Math.round(n.fat.total * 9 + n.carbs.total * 4 + n.protein * 4)
}

export function remaining(budget: number, day: DayLog): number {
  return budget - (dayFoodNutrition(day).calories - exerciseTotal(day))
}

export function underOver(budget: number, day: DayLog): { kind: 'under' | 'over'; amount: number } {
  const r = remaining(budget, day)
  return r >= 0 ? { kind: 'under', amount: r } : { kind: 'over', amount: -r }
}

/**
 * Distribute a calorie budget across macros by the fixed ratio 3.5:1.5:0.8
 * (carbs:protein:fat). One ratio unit = 3.5*4 + 1.5*4 + 0.8*9 = 27.2 cal.
 *
 * The budget is immutable — the macros absorb all integer-rounding drift. We
 * floor the raw ratio values, then brute-force a ±1g adjustment (each macro in
 * {-1, 0, +1}, weights 4/4/9 cal per g; 3^3 = 27 combos) to minimize
 * |4c + 4p + 9f − budget|. Constraining to ±1g keeps every macro within 1g of
 * its ratio-derived float, so the macro ratio stays faithful and the budget
 * matches recomputed calories within ≤ 2 cal (gcd(4,9) = 1 makes any residue
 * mod 1 reachable within two single-gram moves). Tie-break: fewest moves, then
 * highest sum of fractional remainders among touched macros, then prefer +
 * over −, then carbs > protein > fat. Degenerate inputs (≤ 0 or non-finite)
 * → 0/0/0.
 */
export function distributeBudget(calories: number): { carbs: number; protein: number; fat: number } {
  if (!Number.isFinite(calories) || calories <= 0) return { carbs: 0, protein: 0, fat: 0 }
  const RATIO = { carbs: 3.5, protein: 1.5, fat: 0.8 }
  const k = calories / 27.2
  const raw = { carbs: RATIO.carbs * k, protein: RATIO.protein * k, fat: RATIO.fat * k }
  const base = { carbs: Math.floor(raw.carbs), protein: Math.floor(raw.protein), fat: Math.floor(raw.fat) }
  const rem = {
    carbs: raw.carbs - base.carbs,
    protein: raw.protein - base.protein,
    fat: raw.fat - base.fat,
  }
  const recompute = (c: number, p: number, f: number) => 4 * c + 4 * p + 9 * f
  // tie-break rank (lower wins): |drift|, fewest moves, highest remainder-sum
  // among touched macros (negated), prefer + over − (signPref: +=0, 0=1, −=2),
  // then carbs > protein > fat (lexicographic on the adjustments themselves).
  const sp = (a: number) => (a > 0 ? 0 : a < 0 ? 2 : 1)
  type Key = [number, number, number, number, number, number, number, number, number]
  const rank = (drift: number, dc: number, dp: number, df: number): Key => {
    const moves = (dc !== 0 ? 1 : 0) + (dp !== 0 ? 1 : 0) + (df !== 0 ? 1 : 0)
    let remSum = 0
    if (dc !== 0) remSum += rem.carbs
    if (dp !== 0) remSum += rem.protein
    if (df !== 0) remSum += rem.fat
    return [drift, moves, -remSum, sp(dc), sp(dp), sp(df), dc, dp, df]
  }
  const lt = (a: Key, b: Key) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
    return false
  }
  let best = { ...base }
  let bestKey: Key = rank(Math.abs(recompute(base.carbs, base.protein, base.fat) - calories), 0, 0, 0)
  for (const dc of [-1, 0, 1]) {
    for (const dp of [-1, 0, 1]) {
      for (const df of [-1, 0, 1]) {
        const c = base.carbs + dc, p = base.protein + dp, f = base.fat + df
        if (c < 0 || p < 0 || f < 0) continue // macros can't go negative
        const key = rank(Math.abs(recompute(c, p, f) - calories), dc, dp, df)
        if (lt(key, bestKey)) {
          best = { carbs: c, protein: p, fat: f }
          bestKey = key
        }
      }
    }
  }
  return best
}
