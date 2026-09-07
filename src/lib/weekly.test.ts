import { describe, it, expect } from 'vitest'
import type { DayLog } from '../types'
import { weeklyStats } from './weekly'
import { emptyDay } from './storage'
import { dayFoodNutrition } from './nutrition'

// build a DayLog whose total calories equal `cals` via a single fake entry
function dayWithCalories(key: string, cals: number): DayLog {
  const d = emptyDay(key)
  d.meals.breakfast.push({
    id: 'e' + key,
    servingId: 's',
    quantity: 1,  // 1 serving × cals/serving = cals
    foodSnapshot: {
      id: 'f', name: 'x', icon: '🍽️', source: 'custom', createdAt: key,
      servings: [{ id: 's', kind: 'weight', label: 'g', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: {
        calories: cals, fat: { total: 0, mono: 0, poly: 0, saturated: 0, trans: 0 },
        cholesterol: 0, sodium: 0, carbs: { total: 0, fiber: 0, sugar: 0 }, protein: 0,
        vitamins: { a: 0, c: 0, b1: 0, b2: 0, b3: 0, b9: 0, b6: 0, b12: 0 },
        minerals: { calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, zinc: 0 }, caffeine: 0,
      },
    },
  })
  return d
}

const metric = (d: DayLog) => dayFoodNutrition(d).calories

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
  it('returns 7 Mon..Sun bars', () => {
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
  it('a weigh-in-only day is no data: excluded from avg', () => {
    const weighOnly = { ...emptyDay('2026-08-17'), weightKg: 80 }
    const days = {
      '2026-08-17': weighOnly, // opened for the weigh-in, nothing recorded → skipped
      '2026-08-19': dayWithCalories('2026-08-19', 800),
    }
    expect(weeklyStats(days, '2026-08-19', metric, 0, 'max').avg).toBe(800)
  })
  it('an exercise-only day counts as a real 0 in avg', () => {
    const exercised = emptyDay('2026-08-17')
    exercised.exercise.push({ id: 'x', name: 'Run', caloriesBurned: 0 })
    const days = {
      '2026-08-17': exercised, // explicit record → real zero-intake day
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
