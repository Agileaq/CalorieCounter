import { describe, it, expect } from 'vitest'
import {
  emptyNutrition, scaleNutrition, entryNutrition, dayFoodNutrition,
  remaining, underOver, primaryServing, computedCalories, distributeBudget,
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
  it('entryNutrition scales by servings count', () => {
    // 130 cal per serving, log 6 servings -> 780
    expect(entryNutrition(entry(food(130), 6)).calories).toBe(780)
  })
  it('entryNutrition works for per-Serving foods', () => {
    // 120 cal per 1 Serving, log 2 servings -> 240
    const f = food(120, 1)
    f.servings[0] = { id: 's1', kind: 'amount', label: 'Serving', amount: 1, unit: 'serving', isPrimary: true }
    expect(entryNutrition(entry(f, 2)).calories).toBe(240)
  })
  it('dayFoodNutrition sums meals', () => {
    expect(dayFoodNutrition(day([entry(food(130), 1), entry(food(130), 1)])).calories).toBe(260)
  })
  it('remaining subtracts food and adds back exercise', () => {
    // budget 2000, food 500, exercise 100 -> 2000 - (500 - 100) = 1600
    expect(remaining(2000, day([entry(food(500), 1)], 100))).toBe(1600)
  })
  it('computedCalories uses fat×9 + carbs×4 + protein×4', () => {
    const n = { ...emptyNutrition(), fat: { ...emptyNutrition().fat, total: 10 }, carbs: { ...emptyNutrition().carbs, total: 20 }, protein: 5 }
    expect(computedCalories(n)).toBe(10 * 9 + 20 * 4 + 5 * 4) // 190
  })
  it('underOver: positive is under, negative is over', () => {
    expect(underOver(2000, day([entry(food(400), 1)]))).toEqual({ kind: 'under', amount: 1600 })
    expect(underOver(300, day([entry(food(400), 1)]))).toEqual({ kind: 'over', amount: 100 })
  })
})

describe('distributeBudget', () => {
  // ratio 3.5:1.5:0.8 (carbs:protein:fat) → calories per unit k = 3.5*4 + 1.5*4 + 0.8*9 = 27.2
  // invariant: |4*carbs + 4*protein + 9*fat - budget| <= 2; budget never mutated.
  const RATIO = { carbs: 3.5, protein: 1.5, fat: 0.8 }

  function recompute(m: { carbs: number; protein: number; fat: number }) {
    return 4 * m.carbs + 4 * m.protein + 9 * m.fat
  }
  // ratio-shape: floor + a ±1g adjustment keeps each macro within < 2g of its
  // ratio-derived float (floor truncates up to ~1g, ±1g adds up to ~1g more).
  // Drift is the hard invariant; shape is a sanity bound on ratio faithfulness.
  function ratioShape(m: { carbs: number; protein: number; fat: number }, budget: number) {
    if (budget <= 0) return // skip shape check for degenerate budgets
    const k = budget / 27.2
    expect(Math.abs(m.carbs - RATIO.carbs * k)).toBeLessThan(2)
    expect(Math.abs(m.protein - RATIO.protein * k)).toBeLessThan(2)
    expect(Math.abs(m.fat - RATIO.fat * k)).toBeLessThan(2)
  }

  it('1500 cal distributes with drift <= 2 and ratio shape', () => {
    const m = distributeBudget(1500)
    expect(Math.abs(recompute(m) - 1500)).toBeLessThanOrEqual(2)
    ratioShape(m, 1500)
  })
  it('2000 cal distributes with drift <= 2 and ratio shape', () => {
    const m = distributeBudget(2000)
    expect(Math.abs(recompute(m) - 2000)).toBeLessThanOrEqual(2)
    ratioShape(m, 2000)
  })
  it('2248 cal distributes with drift <= 2 and ratio shape', () => {
    const m = distributeBudget(2248)
    expect(Math.abs(recompute(m) - 2248)).toBeLessThanOrEqual(2)
    ratioShape(m, 2248)
  })
  it('2275 cal distributes with drift <= 2 and ratio shape', () => {
    const m = distributeBudget(2275)
    expect(Math.abs(recompute(m) - 2275)).toBeLessThanOrEqual(2)
    ratioShape(m, 2275)
  })
  it('budget <= 0 returns all zeros', () => {
    expect(distributeBudget(0)).toEqual({ carbs: 0, protein: 0, fat: 0 })
    expect(distributeBudget(-500)).toEqual({ carbs: 0, protein: 0, fat: 0 })
  })
  it('NaN budget returns all zeros', () => {
    expect(distributeBudget(NaN)).toEqual({ carbs: 0, protein: 0, fat: 0 })
  })
  it('does not mutate the caller budget and returns integers', () => {
    const m = distributeBudget(1800)
    expect(Number.isInteger(m.carbs)).toBe(true)
    expect(Number.isInteger(m.protein)).toBe(true)
    expect(Number.isInteger(m.fat)).toBe(true)
  })
})
