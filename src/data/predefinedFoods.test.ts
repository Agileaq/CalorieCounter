import { describe, it, expect } from 'vitest'
import foods from './predefinedFoods.json'
import type { Food } from '../types'

describe('predefinedFoods', () => {
  it('has at least 15 foods', () => {
    expect((foods as Food[]).length).toBeGreaterThanOrEqual(15)
  })
  it('every food is well-formed', () => {
    for (const f of foods as Food[]) {
      expect(f.source).toBe('predefined')
      expect(f.id).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(f.servings.length).toBeGreaterThanOrEqual(1)
      expect(f.servings.filter(s => s.isPrimary)).toHaveLength(1)
      expect(typeof f.nutrition.calories).toBe('number')
      expect(f.nutrition.fat).toBeDefined()
      expect(f.nutrition.carbs).toBeDefined()
      expect(f.nutrition.vitamins).toBeDefined()
      expect(f.nutrition.minerals).toBeDefined()
    }
  })
  it('ids are unique', () => {
    const ids = (foods as Food[]).map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
