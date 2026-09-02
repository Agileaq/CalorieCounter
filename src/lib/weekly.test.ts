import { describe, it, expect } from 'vitest'
import type { DayLog } from '../types'
import { weeklySeries } from './weekly'
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

describe('weeklySeries', () => {
  // Week of Wed 2026-08-19 is Mon 2026-08-17 .. Sun 2026-08-23
  it('returns 7 bars Mon..Sun with the selected day flagged today', () => {
    const days: Record<string, DayLog> = {}
    const s = weeklySeries(days, '2026-08-19', metric)
    expect(s.bars).toHaveLength(7)
    expect(s.bars[0].date).toBe('2026-08-17')
    expect(s.bars[6].date).toBe('2026-08-23')
    expect(s.bars.filter(b => b.isToday).map(b => b.date)).toEqual(['2026-08-19'])
  })
  it('reads each day value via the metric', () => {
    const days = {
      '2026-08-17': dayWithCalories('2026-08-17', 100),
      '2026-08-18': dayWithCalories('2026-08-18', 300),
      '2026-08-19': dayWithCalories('2026-08-19', 500),
    }
    const s = weeklySeries(days, '2026-08-19', metric)
    expect(s.bars.find(b => b.date === '2026-08-18')!.value).toBe(300)
    expect(s.bars.find(b => b.date === '2026-08-19')!.value).toBe(500)
    expect(s.bars.find(b => b.date === '2026-08-20')!.value).toBe(0)
  })
  it('avgPrior averages only days before today that have data', () => {
    const days = {
      '2026-08-17': dayWithCalories('2026-08-17', 100),
      '2026-08-18': dayWithCalories('2026-08-18', 300),
      '2026-08-19': dayWithCalories('2026-08-19', 999), // today excluded
    }
    // (100 + 300) / 2 = 200
    expect(weeklySeries(days, '2026-08-19', metric).avgPrior).toBe(200)
  })
  it('avgPrior is 0 when no prior days have data', () => {
    const days = { '2026-08-19': dayWithCalories('2026-08-19', 999) }
    expect(weeklySeries(days, '2026-08-19', metric).avgPrior).toBe(0)
  })
})
