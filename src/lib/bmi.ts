export type ChineseBmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese'

export interface BmrParams {
  heightCm: number
  weightKg: number
  gender: 'male' | 'female' | null
  age?: number
}

/**
 * Calculate Body Mass Index (BMI): weight (kg) / [height (m)]^2
 * Returns value rounded to 1 decimal place, or null if inputs are invalid.
 */
export function calculateBmi(heightCm: number, weightKg: number): number | null {
  if (heightCm <= 0 || weightKg <= 0) return null
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  return Math.round(bmi * 10) / 10
}

/**
 * Classify BMI according to the Working Group on Obesity in China (WGOC) standards:
 * - < 18.5: underweight
 * - 18.5 - 23.9: normal
 * - 24.0 - 27.9: overweight
 * - >= 28.0: obese
 */
export function classifyChineseBmi(bmi: number): ChineseBmiCategory {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 24.0) return 'normal'
  if (bmi < 28.0) return 'overweight'
  return 'obese'
}

/**
 * Returns ideal weight range [min, max] in kg for Chinese adult standard (BMI 18.5 to 23.9)
 * rounded to 1 decimal place.
 */
export function idealWeightRange(heightCm: number): { min: number; max: number } | null {
  if (heightCm <= 0) return null
  const heightM = heightCm / 100
  const h2 = heightM * heightM
  return {
    min: Math.round(18.5 * h2 * 10) / 10,
    max: Math.round(23.9 * h2 * 10) / 10,
  }
}

/**
 * Mifflin-St Jeor Equation for Basal Metabolic Rate (BMR):
 * - Men: 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
 * - Women: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
 * Defaults to age 30 if not provided.
 */
export function calculateBmr({ heightCm, weightKg, gender, age = 30 }: BmrParams): number | null {
  if (heightCm <= 0 || weightKg <= 0 || !gender) return null
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  const bmr = gender === 'male' ? base + 5 : base - 161
  return Math.round(bmr)
}

/**
 * Sedentary Total Daily Energy Expenditure (TDEE) multiplier (1.2 * BMR)
 */
export function calculateTdee(bmr: number | null): number | null {
  if (bmr == null || bmr <= 0) return null
  return Math.round(bmr * 1.2)
}

export type BodyCompositionCategory = ChineseBmiCategory | 'athletic'

export interface BodyCompositionInput {
  bmi: number
  gender?: 'male' | 'female' | null
  waistCm?: number | null
  bodyFatPct?: number | null
}

export interface BodyCompositionResult {
  category: BodyCompositionCategory
  isAthleticHighMuscle: boolean
  hasWaistRisk: boolean
}

/**
 * Evaluates body composition taking athletic muscle mass into account.
 * When BMI is overweight or obese, but waistline is lean (< 85cm male, < 80cm female)
 * or body fat percentage is low (<= 18% male, <= 24% female), classifies as 'athletic'
 * instead of falsely categorizing as overweight/obese.
 */
export function evaluateBodyComposition({
  bmi,
  gender,
  waistCm,
  bodyFatPct,
}: BodyCompositionInput): BodyCompositionResult {
  const baseCategory = classifyChineseBmi(bmi)
  const isHighBmi = baseCategory === 'overweight' || baseCategory === 'obese'

  // Central adiposity risk based on Chinese adult guidelines:
  // Male >= 85cm, Female >= 80cm
  const hasWaistRisk = typeof waistCm === 'number' && waistCm > 0
    ? (gender === 'female' ? waistCm >= 80 : waistCm >= 85)
    : false

  const hasLeanWaist = typeof waistCm === 'number' && waistCm > 0
    ? (gender === 'female' ? waistCm < 80 : waistCm < 85)
    : false

  // Athletic body fat levels:
  // Male <= 18%, Female <= 24%
  const hasAthleticFat = typeof bodyFatPct === 'number' && bodyFatPct > 0
    ? (gender === 'female' ? bodyFatPct <= 24 : bodyFatPct <= 18)
    : false

  const isAthleticHighMuscle = isHighBmi && (hasLeanWaist || hasAthleticFat)

  return {
    category: isAthleticHighMuscle ? 'athletic' : baseCategory,
    isAthleticHighMuscle,
    hasWaistRisk,
  }
}

