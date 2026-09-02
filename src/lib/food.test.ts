import { describe, it, expect } from 'vitest'
import { newId } from './ids'
import { newFood, newServing, cloneAsCustom, DEFAULT_ICON, collapseToPrimaryServing, foodCounts } from './food'
import { addDays, todayKey } from './date'
import type { DayLog, LogEntry, MealKey } from '../types'
import { MEAL_KEYS } from '../types'

describe('food factory', () => {
  it('newId returns unique strings', () => {
    expect(newId()).not.toBe(newId())
  })
  it('newServing defaults to primary 100g', () => {
    const s = newServing()
    expect(s.isPrimary).toBe(true)
    expect(s.amount).toBe(100)
    expect(s.unit).toBe('g')
  })
  it('newFood is a blank custom food', () => {
    const f = newFood()
    expect(f.source).toBe('custom')
    expect(f.icon).toBe(DEFAULT_ICON)
    expect(f.servings).toHaveLength(1)
    expect(f.servings[0].isPrimary).toBe(true)
    expect(f.nutrition.calories).toBe(0)
    expect(f.createdAt).not.toBe('')
  })
  it('cloneAsCustom makes a custom copy with a new id', () => {
    const pre = { ...newFood(), id: 'orig', name: 'Rice', source: 'predefined' as const }
    const c = cloneAsCustom(pre)
    expect(c.id).not.toBe('orig')
    expect(c.source).toBe('custom')
    expect(c.name).toBe('Rice')
    // deep clone: mutating clone does not touch original
    c.servings[0].amount = 999
    expect(pre.servings[0].amount).toBe(100)
  })
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
})

// minimal day/entry builders for foodCounts tests (date isn't read by foodCounts)
function entry(foodId: string, qty = 1): LogEntry {
  return {
    id: newId(),
    foodSnapshot: { ...newFood(), id: foodId, name: foodId },
    servingId: 's', quantity: qty,
  }
}
function dayWith(meals: Partial<Record<MealKey, LogEntry[]>> = {}): DayLog {
  const m = { breakfast: [], lunch: [], dinner: [], snacks: [] } as Record<MealKey, LogEntry[]>
  for (const k of MEAL_KEYS) m[k] = meals[k] ?? []
  return { date: '', meals: m, exercise: [] }
}

describe('foodCounts', () => {
  it('counts entries per food id across all meals within the window', () => {
    const today = todayKey()
    const days: Record<string, DayLog> = {
      [today]: dayWith({
        breakfast: [entry('rice'), entry('rice'), entry('egg')],
        lunch: [entry('rice')],
        snacks: [entry('egg')],
      }),
      [addDays(today, -1)]: dayWith({ dinner: [entry('rice'), entry('fish')] }),
    }
    const counts = foodCounts(days, today)
    expect(counts.get('rice')).toBe(4) // 3 today + 1 yesterday
    expect(counts.get('egg')).toBe(2)
    expect(counts.get('fish')).toBe(1)
  })

  it('ignores entries older than the 180-day window', () => {
    const today = todayKey()
    const days: Record<string, DayLog> = {
      [addDays(today, -180)]: dayWith({ breakfast: [entry('old')] }),
      [addDays(today, -181)]: dayWith({ breakfast: [entry('ancient')] }),
      [today]: dayWith({ breakfast: [entry('fresh')] }),
    }
    const counts = foodCounts(days, today)
    expect(counts.get('fresh')).toBe(1)
    // -180 is exactly on the boundary → included; -181 is outside → excluded
    expect(counts.get('old')).toBe(1)
    expect(counts.has('ancient')).toBe(false)
  })

  it('ignores future days and returns an empty map for no logs', () => {
    const today = todayKey()
    const days: Record<string, DayLog> = {
      [addDays(today, 1)]: dayWith({ breakfast: [entry('future')] }),
    }
    const counts = foodCounts(days, today)
    expect(counts.size).toBe(0)
  })
})
