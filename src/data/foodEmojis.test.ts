import { describe, it, expect } from 'vitest'
import { FOOD_EMOJI_CATEGORIES, ALL_FOOD_EMOJIS } from './foodEmojis'

describe('foodEmojis', () => {
  it('all categories have unique chars and valid structure', () => {
    const allChars: string[] = []
    for (const cat of FOOD_EMOJI_CATEGORIES) {
      expect(cat.key).toBeTruthy()
      expect(cat.emojis.length).toBeGreaterThan(0)
      for (const entry of cat.emojis) {
        expect(entry.char).toBeTruthy()
        expect(entry.keywords.length).toBeGreaterThan(0)
        allChars.push(entry.char)
      }
    }
    expect(allChars).toEqual(ALL_FOOD_EMOJIS)
    expect(new Set(allChars).size).toBe(allChars.length)
  })

  it('includes categorized new emojis: 🍈 and 🥭 in fruits', () => {
    const fruits = FOOD_EMOJI_CATEGORIES.find(c => c.key === 'fruits')?.emojis.map(e => e.char)
    expect(fruits).toContain('🍈')
    expect(fruits).toContain('🥭')
  })

  it('includes categorized new emojis: 🍠 and 🎃 in vegetables', () => {
    const vegetables = FOOD_EMOJI_CATEGORIES.find(c => c.key === 'vegetables')?.emojis.map(e => e.char)
    expect(vegetables).toContain('🍠')
    expect(vegetables).toContain('🎃')
  })

  it('includes categorized new emoji: 🦀 in protein', () => {
    const protein = FOOD_EMOJI_CATEGORIES.find(c => c.key === 'protein')?.emojis.map(e => e.char)
    expect(protein).toContain('🦀')
  })

  it('includes categorized new emoji: 🏁 in activities', () => {
    const activities = FOOD_EMOJI_CATEGORIES.find(c => c.key === 'activities')?.emojis.map(e => e.char)
    expect(activities).toContain('🏁')
  })

  it('includes categorized new emojis: 😆 and 😁 in mood', () => {
    const mood = FOOD_EMOJI_CATEGORIES.find(c => c.key === 'mood')?.emojis.map(e => e.char)
    expect(mood).toContain('😆')
    expect(mood).toContain('😁')
  })
})
