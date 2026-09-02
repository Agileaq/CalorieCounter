import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DayLog, Food, Language, Settings } from '../types'
import {
  loadSettings, saveSettings, loadMyFoods, saveMyFoods, loadDays, saveDays,
  loadFoodOverrides, saveFoodOverrides, getDay, ensureSchema,
} from '../lib/storage'
import { mergeFoods } from '../lib/importExport'
import predefinedRaw from '../data/predefinedFoods.json'
import { collapseToPrimaryServing } from '../lib/food'
import { setLanguage as applyI18nLanguage, applyDir } from '../i18n'
import { AppContext, type AppContextValue } from './useApp'
import { todayKey } from '../lib/date'

const predefined = (predefinedRaw as Food[]).map(collapseToPrimaryServing)

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => { ensureSchema(); return loadSettings() })
  const [myFoods, setMyFoods] = useState<Food[]>(() => loadMyFoods().map(collapseToPrimaryServing))
  const [overrides, setOverrides] = useState<Record<string, Food>>(() =>
    Object.fromEntries(Object.entries(loadFoodOverrides()).map(([k, f]) => [k, collapseToPrimaryServing(f)]))
  )
  const [days, setDays] = useState<Record<string, DayLog>>(() => loadDays())
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey())

  // apply language/dir on mount and whenever it changes
  useEffect(() => { applyI18nLanguage(settings.language); applyDir(settings.language) }, [settings.language])

  const day = getDay(days, selectedDate)

  function persistDays(next: Record<string, DayLog>) { setDays(next); saveDays(next) }
  function persistMyFoods(next: Food[]) { setMyFoods(next); saveMyFoods(next) }
  function persistSettings(next: Settings) { setSettings(next); saveSettings(next) }
  function persistOverrides(next: Record<string, Food>) { setOverrides(next); saveFoodOverrides(next) }

  function mutateDay(fn: (d: DayLog) => DayLog) {
    const current = getDay(days, selectedDate)
    persistDays({ ...days, [selectedDate]: fn(current) })
  }

  const value: AppContextValue = {
    selectedDate, setSelectedDate,
    settings,
    updateSettings: (patch) => persistSettings({ ...settings, ...patch }),
    days, day,
    allFoods: useMemo(() => [...predefined.map(f => overrides[f.id] ?? f), ...myFoods], [myFoods, overrides]),
    myFoods, predefined,
    foodOverrides: overrides,
    addMyFood: (f) => persistMyFoods([...myFoods, f]),
    updateMyFood: (f) => persistMyFoods(myFoods.map(x => x.id === f.id ? f : x)),
    deleteMyFood: (id) => persistMyFoods(myFoods.filter(x => x.id !== id)),
    overrideFood: (f) => persistOverrides({ ...overrides, [f.id]: f }),
    resetOverride: (id) => { const next = { ...overrides }; delete next[id]; persistOverrides(next) },
    addEntry: (meal, entry) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], entry] } })),
    updateEntry: (meal, entry) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].map(e => e.id === entry.id ? entry : e) } })),
    deleteEntry: (meal, id) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].filter(e => e.id !== id) } })),
    clearMeal: (meal) => mutateDay(d => ({ ...d, meals: { ...d.meals, [meal]: [] } })),
    addExercise: (e) => mutateDay(d => ({ ...d, exercise: [...d.exercise, e] })),
    deleteExercise: (id) => mutateDay(d => ({ ...d, exercise: d.exercise.filter(e => e.id !== id) })),
    setLanguage: (lang: Language) => persistSettings({ ...settings, language: lang }),
    importFoods: (foods) => {
      const collapsed = foods.map(collapseToPrimaryServing)
      // custom entries become My Foods; predefined entries become in-place overrides
      persistMyFoods(mergeFoods(myFoods, collapsed.filter(f => f.source === 'custom')))
      const overs = collapsed.filter(f => f.source === 'predefined')
      if (overs.length) {
        const next = { ...overrides }
        for (const f of overs) next[f.id] = f
        persistOverrides(next)
      }
      return foods.length
    },
    replaceAll: (data) => {
      persistDays(data.days)
      persistMyFoods(data.myFoods.map(collapseToPrimaryServing))
      persistSettings(data.settings)
      persistOverrides(Object.fromEntries(Object.entries(data.foodOverrides ?? {}).map(([k, f]) => [k, collapseToPrimaryServing(f)])))
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
