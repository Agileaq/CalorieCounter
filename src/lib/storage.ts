import type { DayLog, Food, Settings, MealMap, MacroRange } from '../types'
import { migrate, CURRENT_SCHEMA_VERSION } from './migrations'

const K = {
  days: 'cc.days',
  myFoods: 'cc.myFoods',
  settings: 'cc.settings',
  schemaVersion: 'cc.schemaVersion',
  foodOverrides: 'cc.foodOverrides',
  hiddenFoods: 'cc.hiddenFoods',
  customIcons: 'cc.customIcons',
} as const

/** Dashboard review ranges: macros per kg of body weight, fiber absolute grams. */
export const DEFAULT_MACRO_RANGES: Record<'carbs' | 'protein' | 'fat' | 'fiber', MacroRange> = {
  carbs: { min: 2.5, max: 4 },
  protein: { min: 1.0, max: 2.2 },
  fat: { min: 0.5, max: 1.2 },
  fiber: { min: 20, max: 40 },
}

export const DEFAULT_SETTINGS: Settings = {
  dailyBudget: 2248,
  macroTargets: { carbs: 280, protein: 120, fat: 72, fiber: 30 },
  macroRanges: DEFAULT_MACRO_RANGES,
  language: 'en',
  goalWeightKg: null,
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
  // Deep-merge macroTargets so older blobs missing carbs/fat get the defaults,
  // and macroRanges the same way per macro so legacy blobs (and partial edits)
  // never end up with half-defined review ranges.
  const dr = DEFAULT_MACRO_RANGES
  const sr = stored.macroRanges ?? ({} as Partial<Settings['macroRanges']>)
  const range = (k: 'carbs' | 'protein' | 'fat' | 'fiber'): MacroRange => ({ ...dr[k], ...sr[k] })
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    macroTargets: { ...DEFAULT_SETTINGS.macroTargets, ...stored.macroTargets },
    macroRanges: { carbs: range('carbs'), protein: range('protein'), fat: range('fat'), fiber: range('fiber') },
  }
}
export function saveSettings(s: Settings): void { write(K.settings, s) }

export function loadMyFoods(): Food[] { return read<Food[]>(K.myFoods, []) }
export function saveMyFoods(f: Food[]): void { write(K.myFoods, f) }

// Edited copies of built-in (predefined) foods, keyed by predefined id.
// Absent in older installs → empty map, no schema migration needed.
export function loadFoodOverrides(): Record<string, Food> { return read<Record<string, Food>>(K.foodOverrides, {}) }
export function saveFoodOverrides(o: Record<string, Food>): void { write(K.foodOverrides, o) }

// Hidden (user-"deleted") predefined food ids. Mirrors foodOverrides: absent
// in older installs → empty map, no schema migration needed. A predefined food
// can't be removed from the bundled JSON, so "delete" records its id here and
// allFoods filters these ids out.
export function loadHiddenFoods(): Record<string, true> { return read<Record<string, true>>(K.hiddenFoods, {}) }
export function saveHiddenFoods(h: Record<string, true>): void { write(K.hiddenFoods, h) }

// User-added food icons (unicode emoji / glyphs typed into the icon picker's
// "custom" category). Stored as a list of chars so the picker can render a
// "custom" category row. Absent in older installs (or a cleared store) seeds
// a default '😄' so the custom category is never empty on a fresh install.
export function loadCustomIcons(): string[] {
  const stored = read<string[] | null>(K.customIcons, null)
  return stored == null ? ['😄'] : stored
}
export function saveCustomIcons(c: string[]): void { write(K.customIcons, c) }

export function loadDays(): Record<string, DayLog> { return read<Record<string, DayLog>>(K.days, {}) }
export function saveDays(d: Record<string, DayLog>): void { write(K.days, d) }

export function emptyDay(key: string): DayLog {
  const meals: MealMap = { breakfast: [], lunch: [], dinner: [], snacks: [] }
  return { date: key, meals, exercise: [] }
}

/**
 * A day counts as recorded when it has at least one meal or exercise entry.
 * Weigh-ins and event tags are check-in side data, NOT intake records: a day
 * without any explicit entry is "no data" for review sums — never a silently
 * assumed zero-intake fast (missed logging is far more common than fasting).
 */
export function hasExplicitRecords(d: DayLog): boolean {
  return Object.values(d.meals).some(m => m.length > 0) || d.exercise.length > 0
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
