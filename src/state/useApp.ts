import { createContext, useContext } from 'react'
import type { DayLog, ExerciseEntry, Food, Language, LogEntry, MealKey, Settings } from '../types'
import type { BackupData } from '../lib/importExport'

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
  foodOverrides: Record<string, Food>
  hiddenFoods: Record<string, true>
  addMyFood: (f: Food) => void
  updateMyFood: (f: Food) => void
  deleteMyFood: (id: string) => void
  overrideFood: (f: Food) => void
  resetOverride: (id: string) => void
  hideFood: (id: string) => void
  addEntry: (meal: MealKey, entry: LogEntry) => void
  updateEntry: (meal: MealKey, entry: LogEntry) => void
  deleteEntry: (meal: MealKey, id: string) => void
  clearMeal: (meal: MealKey) => void
  addExercise: (e: ExerciseEntry) => void
  deleteExercise: (id: string) => void
  setLanguage: (lang: Language) => void
  importFoods: (foods: Food[]) => number
  replaceAll: (data: BackupData) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
