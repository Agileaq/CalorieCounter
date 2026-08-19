import { describe, it, expect } from 'vitest'
import {
  emptyNutrition, scaleNutrition, entryNutrition, dayFoodNutrition,
  remaining, underOver, primaryServing, computedCalories,
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
  it('computedCalories uses fat×9 + carbs×4 + protein×4', () => {
    const n = { ...emptyNutrition(), fat: { ...emptyNutrition().fat, total: 10 }, carbs: { ...emptyNutrition().carbs, total: 20 }, protein: 5 }
    expect(computedCalories(n)).toBe(10 * 9 + 20 * 4 + 5 * 4) // 190
  })
  it('underOver: positive is under, negative is over', () => {
    expect(underOver(2000, day([entry(food(400), 100)]))).toEqual({ kind: 'under', amount: 1600 })
    expect(underOver(300, day([entry(food(400), 100)]))).toEqual({ kind: 'over', amount: 100 })
  })
})
