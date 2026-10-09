import { describe, it, expect } from 'vitest'
import {
  calculateBmi,
  classifyChineseBmi,
  idealWeightRange,
  calculateBmr,
  calculateTdee,
  evaluateBodyComposition,
} from './bmi'

describe('bmi library', () => {
  describe('calculateBmi', () => {
    it('returns null if height or weight is <= 0', () => {
      expect(calculateBmi(0, 70)).toBeNull()
      expect(calculateBmi(175, 0)).toBeNull()
      expect(calculateBmi(-170, 70)).toBeNull()
    })

    it('calculates BMI correctly rounded to 1 decimal place', () => {
      // 70 / (1.75 * 1.75) = 70 / 3.0625 = 22.857... -> 22.9
      expect(calculateBmi(175, 70)).toBe(22.9)
      // 50 / (1.65 * 1.65) = 50 / 2.7225 = 18.365... -> 18.4
      expect(calculateBmi(165, 50)).toBe(18.4)
    })
  })

  describe('classifyChineseBmi', () => {
    it('classifies according to Chinese adult standards', () => {
      // < 18.5: underweight
      expect(classifyChineseBmi(18.4)).toBe('underweight')
      // 18.5 - 23.9: normal
      expect(classifyChineseBmi(18.5)).toBe('normal')
      expect(classifyChineseBmi(23.9)).toBe('normal')
      // 24.0 - 27.9: overweight
      expect(classifyChineseBmi(24.0)).toBe('overweight')
      expect(classifyChineseBmi(27.9)).toBe('overweight')
      // >= 28.0: obese
      expect(classifyChineseBmi(28.0)).toBe('obese')
      expect(classifyChineseBmi(32.5)).toBe('obese')
    })
  })

  describe('idealWeightRange', () => {
    it('returns null for invalid height', () => {
      expect(idealWeightRange(0)).toBeNull()
    })

    it('returns the weight range for BMI 18.5 to 23.9', () => {
      // for 175cm: min = 18.5 * 1.75^2 = 56.656 -> 56.7, max = 23.9 * 1.75^2 = 73.19 -> 73.2
      const range = idealWeightRange(175)
      expect(range).not.toBeNull()
      expect(range?.min).toBe(56.7)
      expect(range?.max).toBe(73.2)
    })
  })

  describe('calculateBmr and calculateTdee', () => {
    it('returns null when height, weight or gender is missing/invalid', () => {
      expect(calculateBmr({ heightCm: 175, weightKg: 70, gender: null })).toBeNull()
      expect(calculateBmr({ heightCm: 0, weightKg: 70, gender: 'male' })).toBeNull()
    })

    it('calculates BMR using Mifflin-St Jeor equation', () => {
      // Male: 10 * 70 + 6.25 * 175 - 5 * 30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 -> 1649
      const maleBmr = calculateBmr({ heightCm: 175, weightKg: 70, gender: 'male' })
      expect(maleBmr).toBe(1649)

      // Female: 10 * 60 + 6.25 * 165 - 5 * 30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320
      const femaleBmr = calculateBmr({ heightCm: 165, weightKg: 60, gender: 'female' })
      expect(femaleBmr).toBe(1320)
    })

    it('calculates sedentary TDEE (BMR * 1.2)', () => {
      expect(calculateTdee(1649)).toBe(1979)
      expect(calculateTdee(null)).toBeNull()
    })
  })

  describe('evaluateBodyComposition', () => {
    it('returns standard BMI assessment when waist and body fat are omitted', () => {
      // 175cm, 78kg -> BMI 25.5 (overweight)
      const res = evaluateBodyComposition({
        bmi: 25.5,
        gender: 'male',
        waistCm: null,
        bodyFatPct: null,
      })
      expect(res.category).toBe('overweight')
      expect(res.isAthleticHighMuscle).toBe(false)
      expect(res.hasWaistRisk).toBe(false)
    })

    it('corrects overweight/obese BMI to athletic/high-muscle when waist is lean', () => {
      // Male with BMI 26.0 (normally overweight) but waist is 80cm (< 85cm)
      const resMale = evaluateBodyComposition({
        bmi: 26.0,
        gender: 'male',
        waistCm: 80,
        bodyFatPct: null,
      })
      expect(resMale.category).toBe('athletic')
      expect(resMale.isAthleticHighMuscle).toBe(true)
      expect(resMale.hasWaistRisk).toBe(false)

      // Female with BMI 25.0 but waist is 74cm (< 80cm)
      const resFemale = evaluateBodyComposition({
        bmi: 25.0,
        gender: 'female',
        waistCm: 74,
        bodyFatPct: null,
      })
      expect(resFemale.category).toBe('athletic')
      expect(resFemale.isAthleticHighMuscle).toBe(true)
      expect(resFemale.hasWaistRisk).toBe(false)
    })

    it('corrects overweight/obese BMI to athletic when body fat is low/athletic', () => {
      // Male with BMI 26.5 and body fat 14% (<= 18%)
      const resMale = evaluateBodyComposition({
        bmi: 26.5,
        gender: 'male',
        waistCm: null,
        bodyFatPct: 14,
      })
      expect(resMale.category).toBe('athletic')
      expect(resMale.isAthleticHighMuscle).toBe(true)

      // Female with BMI 25.2 and body fat 21% (<= 24%)
      const resFemale = evaluateBodyComposition({
        bmi: 25.2,
        gender: 'female',
        waistCm: null,
        bodyFatPct: 21,
      })
      expect(resFemale.category).toBe('athletic')
      expect(resFemale.isAthleticHighMuscle).toBe(true)
    })

    it('identifies waistline risk when waist >= 85cm for male or >= 80cm for female', () => {
      const resMale = evaluateBodyComposition({
        bmi: 26.0,
        gender: 'male',
        waistCm: 88,
        bodyFatPct: null,
      })
      expect(resMale.category).toBe('overweight')
      expect(resMale.isAthleticHighMuscle).toBe(false)
      expect(resMale.hasWaistRisk).toBe(true)

      const resFemale = evaluateBodyComposition({
        bmi: 23.5, // normal BMI but high waist
        gender: 'female',
        waistCm: 83,
        bodyFatPct: null,
      })
      expect(resFemale.hasWaistRisk).toBe(true)
    })
  })
})

