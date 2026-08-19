import { describe, it, expect } from 'vitest'
import { derivedTargets } from './macros'

describe('derivedTargets', () => {
  it('derives protein and fat from the 80kg reference weight (1.8/0.8 g per kg)', () => {
    // protein 80×1.8=144g, fat 80×0.8=64g; for 2000 cal the remainder is carbs:
    // (2000 − 144×4 − 64×9) ÷ 4 = 848 ÷ 4 = 212g
    expect(derivedTargets(2000)).toEqual({ carbs: 212, protein: 144, fat: 64 })
  })
  it('gives carbs whatever calories the budget leaves after protein+fat', () => {
    // (1800 − 576 − 576) ÷ 4 = 162g
    expect(derivedTargets(1800)).toEqual({ carbs: 162, protein: 144, fat: 64 })
  })
  it('clamps carbs at 0 when the budget cannot cover protein+fat', () => {
    expect(derivedTargets(0)).toEqual({ carbs: 0, protein: 144, fat: 64 })
  })
})
