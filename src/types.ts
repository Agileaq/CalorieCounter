export type ServingKind = 'weight' | 'volume' | 'amount'

export interface Serving {
  id: string
  kind: ServingKind
  label: string      // "Grams", "Serving", "mL"
  amount: number     // e.g. 100
  unit: string       // "g", "mL", "item"
  isPrimary: boolean
}

export interface FatBreakdown { total: number; mono: number; poly: number; saturated: number; trans: number }
export interface CarbBreakdown { total: number; fiber: number; sugar: number }
export interface Vitamins { a: number; c: number; b1: number; b2: number; b3: number; b9: number; b6: number; b12: number }
export interface Minerals { calcium: number; iron: number; magnesium: number; phosphorus: number; potassium: number; zinc: number }

export interface Nutrition {
  calories: number
  fat: FatBreakdown
  cholesterol: number
  sodium: number
  carbs: CarbBreakdown
  protein: number
  vitamins: Vitamins
  minerals: Minerals
  caffeine: number
}

export type FoodSource = 'predefined' | 'custom'

export interface Food {
  id: string
  name: string
  brand?: string
  icon: string          // native emoji, default "🍽️"
  servings: Serving[]   // >=1, exactly one isPrimary
  nutrition: Nutrition  // expressed for the primary serving
  source: FoodSource
  createdAt: string     // ISO
}

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export interface LogEntry {
  id: string
  foodSnapshot: Food
  servingId: string
  quantity: number
}

export interface ExerciseEntry { id: string; name: string; caloriesBurned: number }

export type MealMap = Record<MealKey, LogEntry[]>

export interface DayLog {
  date: string          // "YYYY-MM-DD"
  meals: MealMap
  exercise: ExerciseEntry[]
}

export type Language = 'en' | 'zh' | 'es' | 'fr' | 'ar' | 'ru'

export interface Settings {
  dailyBudget: number
  macroTargets: { protein: number; fiber: number }
  language: Language
}

export const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snacks']
export const LANGUAGES: Language[] = ['en', 'zh', 'es', 'fr', 'ar', 'ru']
