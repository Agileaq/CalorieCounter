import { describe, it, expect } from 'vitest'
import { derivedTargets } from './macros'

describe('derivedTargets', () => {
  it('splits a 2000 cal budget into 50/20/30 by grams', () => {
    // carbs 50% ÷4, protein 20% ÷4, fat 30% ÷9
    expect(derivedTargets(2000)).toEqual({ carbs: 250, protein: 100, fat: 67 })
  })
  it('rounds to whole grams', () => {
    expect(derivedTargets(1800)).toEqual({ carbs: 225, protein: 90, fat: 60 })
  })
  it('is zero for a zero budget', () => {
    expect(derivedTargets(0)).toEqual({ carbs: 0, protein: 0, fat: 0 })
  })
})
