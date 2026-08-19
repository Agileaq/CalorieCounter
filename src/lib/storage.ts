import type { DayLog, Food, Settings, MealMap } from '../types'
import { migrate, CURRENT_SCHEMA_VERSION } from './migrations'

const K = {
  days: 'cc.days',
  myFoods: 'cc.myFoods',
  settings: 'cc.settings',
  schemaVersion: 'cc.schemaVersion',
  foodOverrides: 'cc.foodOverrides',
} as const

export const DEFAULT_SETTINGS: Settings = {
  dailyBudget: 2000,
  macroTargets: { carbs: 212, protein: 160, fat: 64, fiber: 28 },
  language: 'en',
}

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (raw == null) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadSettings(): Settings {
  const stored = read<Partial<Settings>>(K.settings, {})
  // Deep-merge macroTargets so older blobs missing carbs/fat get the defaults.
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    macroTargets: { ...DEFAULT_SETTINGS.macroTargets, ...stored.macroTargets },
  }
}
export function saveSettings(s: Settings): void { write(K.settings, s) }

export function loadMyFoods(): Food[] { return read<Food[]>(K.myFoods, []) }
export function saveMyFoods(f: Food[]): void { write(K.myFoods, f) }

// Edited copies of built-in (predefined) foods, keyed by predefined id.
// Absent in older installs → empty map, no schema migration needed.
export function loadFoodOverrides(): Record<string, Food> { return read<Record<string, Food>>(K.foodOverrides, {}) }
export function saveFoodOverrides(o: Record<string, Food>): void { write(K.foodOverrides, o) }

export function loadDays(): Record<string, DayLog> { return read<Record<string, DayLog>>(K.days, {}) }
export function saveDays(d: Record<string, DayLog>): void { write(K.days, d) }

export function emptyDay(key: string): DayLog {
  const meals: MealMap = { breakfast: [], lunch: [], dinner: [], snacks: [] }
  return { date: key, meals, exercise: [] }
}

export function getDay(days: Record<string, DayLog>, key: string): DayLog {
  return days[key] ?? emptyDay(key)
}

export function ensureSchema(): void {
  const stored = Number(localStorage.getItem(K.schemaVersion) ?? CURRENT_SCHEMA_VERSION)
  for (const key of [K.days, K.myFoods, K.settings]) {
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      const data = JSON.parse(raw)
      const migrated = migrate({ version: stored, data })
      localStorage.setItem(key, JSON.stringify(migrated.data))
    } catch { /* leave malformed blob; loaders fall back to defaults */ }
  }
  localStorage.setItem(K.schemaVersion, String(CURRENT_SCHEMA_VERSION))
}
