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
