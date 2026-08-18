import { createContext, useContext } from 'react'
import type { DayLog, ExerciseEntry, Food, Language, LogEntry, MealKey, Settings } from '../types'

export interface AppContextValue {
  selectedDate: string
  setSelectedDate: (key: string) => void
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  days: Record<string, DayLog>
  day: DayLog
  allFoods: Food[]
  myFoods: Food[]
  predefined: Food[]
  addMyFood: (f: Food) => void
  updateMyFood: (f: Food) => void
  deleteMyFood: (id: string) => void
  addEntry: (meal: MealKey, entry: LogEntry) => void
  updateEntry: (meal: MealKey, entry: LogEntry) => void
  deleteEntry: (meal: MealKey, id: string) => void
  clearMeal: (meal: MealKey) => void
  addExercise: (e: ExerciseEntry) => void
  deleteExercise: (id: string) => void
  setLanguage: (lang: Language) => void
  importMyFoods: (foods: Food[]) => number
  replaceAll: (data: { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings }) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
