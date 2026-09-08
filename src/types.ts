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

export type WeightTag = 'cheat' | 'strength' | 'cardio' | 'stress' | 'period'

export interface LogEntry {
  id: string
  foodSnapshot: Food
  servingId: string
  quantity: number
}

/** Machine key stamped when the entry came from a preset activity pick
 *  (free-typed names stay unstamped); drives the exercise→day-tag linkage. */
export type ExercisePreset = 'strength' | 'walking' | 'running' | 'swimming'
export interface ExerciseEntry { id: string; name: string; caloriesBurned: number; preset?: ExercisePreset }

export type MealMap = Record<MealKey, LogEntry[]>

export interface DayLog {
  date: string          // "YYYY-MM-DD"
  meals: MealMap
  exercise: ExerciseEntry[]
  weightKg?: number     // morning weigh-in, canonical kg, 0.1 precision; absent = no record
  tags?: WeightTag[]    // preset event labels for the day, 0..n; absent when empty
}

export type Language = 'en' | 'zh' | 'es' | 'fr' | 'ar' | 'ru'

/** Review standard for one macro. carbs/protein/fat are per kg of body weight; fiber is absolute grams. */
export interface MacroRange { min: number; max: number }

export interface Settings {
  dailyBudget: number
  macroTargets: { carbs: number; protein: number; fat: number; fiber: number }
  /** Dashboard four-cell review standard — independent of macroTargets (which
   * still drives the Goals page and the Log page's progress bars). */
  macroRanges: { carbs: MacroRange; protein: MacroRange; fat: MacroRange; fiber: MacroRange }
  language: Language
  goalWeightKg: number | null   // safe-loss corridor endpoint; null = not set
}

export const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snacks']
export const LANGUAGES: Language[] = ['en', 'zh', 'es', 'fr', 'ar', 'ru']
