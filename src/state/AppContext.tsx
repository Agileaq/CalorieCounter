import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DayLog, Food, Language, Settings } from '../types'
import {
  loadSettings, saveSettings, loadMyFoods, saveMyFoods, loadDays, saveDays,
  getDay, ensureSchema,
} from '../lib/storage'
import { mergeFoods } from '../lib/importExport'
import predefinedRaw from '../data/predefinedFoods.json'
import { setLanguage as applyI18nLanguage, applyDir } from '../i18n'
import { AppContext, type AppContextValue } from './useApp'
import { todayKey } from '../lib/date'

const predefined = predefinedRaw as Food[]

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => { ensureSchema(); return loadSettings() })
  const [myFoods, setMyFoods] = useState<Food[]>(() => loadMyFoods())
  const [days, setDays] = useState<Record<string, DayLog>>(() => loadDays())
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey())

  // apply language/dir on mount and whenever it changes
  useEffect(() => { applyI18nLanguage(settings.language); applyDir(settings.language) }, [settings.language])

  const day = getDay(days, selectedDate)

  function persistDays(next: Record<string, DayLog>) { setDays(next); saveDays(next) }
  function persistMyFoods(next: Food[]) { setMyFoods(next); saveMyFoods(next) }
  function persistSettings(next: Settings) { setSettings(next); saveSettings(next) }

  function mutateDay(fn: (d: DayLog) => DayLog) {
    const current = getDay(days, selectedDate)
    persistDays({ ...days, [selectedDate]: fn(current) })
  }

  const value: AppContextValue = {
    selectedDate, setSelectedDate,
    settings,
    updateSettings: (patch) => persistSettings({ ...settings, ...patch }),
    days, day,
    allFoods: useMemo(() => [...predefined, ...myFoods], [myFoods]),
    myFoods, predefined,
    addMyFood: (f) => persistMyFoods([...myFoods, f]),
    updateMyFood: (f) => persistMyFoods(myFoods.map(x => x.id === f.id ? f : x)),
    deleteMyFood: (id) => persistMyFoods(myFoods.filter(x => x.id !== id)),
    addEntry: (meal, entry) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], entry] } })),
    updateEntry: (meal, entry) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].map(e => e.id === entry.id ? entry : e) } })),
    deleteEntry: (meal, id) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].filter(e => e.id !== id) } })),
    clearMeal: (meal) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: [] } })),
    addExercise: (e) => mutateDay(d => ({ ...d, exercise: [...d.exercise, e] })),
    deleteExercise: (id) => mutateDay(d => ({ ...d, exercise: d.exercise.filter(e => e.id !== id) })),
    setLanguage: (lang: Language) => persistSettings({ ...settings, language: lang }),
    importMyFoods: (foods) => { const merged = mergeFoods(myFoods, foods); persistMyFoods(merged); return foods.length },
    replaceAll: (data) => { persistDays(data.days); persistMyFoods(data.myFoods); persistSettings(data.settings) },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
