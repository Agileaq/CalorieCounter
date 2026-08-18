import { describe, it, expect } from 'vitest'
import { newId } from './ids'
import { newFood, newServing, cloneAsCustom, DEFAULT_ICON } from './food'

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
})
