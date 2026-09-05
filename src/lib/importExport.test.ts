import { describe, it, expect } from 'vitest'
import { exportFoods, parseFoodsImport, mergeFoods, exportBackup, parseBackup, mergeBackup } from './importExport'
import type { BackupData } from './importExport'
import type { Food, DayLog, LogEntry, MealKey } from '../types'
import { MEAL_KEYS } from '../types'

function f(name: string, brand?: string): Food {
  return { id: name, name, brand, icon: '🍚', source: 'predefined', createdAt: '',
    servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
    nutrition: { calories: 1 } as any }
}

function entry(id: string, foodId = 'fx'): LogEntry {
  return { id, foodSnapshot: f(foodId), servingId: 's', quantity: 1 }
}
function emptyMeals() {
  const m: Record<MealKey, LogEntry[]> = { breakfast: [], lunch: [], dinner: [], snacks: [] }
  return m
}
function day(date: string, meals: Partial<Record<MealKey, LogEntry[]>> = {}, exercise: DayLog['exercise'] = []): DayLog {
  const m = emptyMeals()
  for (const k of MEAL_KEYS) m[k] = meals[k] ?? []
  return { date, meals: m, exercise }
}
const SET = { dailyBudget: 2000, macroTargets: { carbs: 1, protein: 1, fat: 1, fiber: 1 }, language: 'en' as const }

describe('importExport', () => {
  it('exportFoods → parseFoodsImport round-trips names', () => {
    const out = parseFoodsImport(exportFoods([f('Rice'), f('Bread')]))
    expect(out.map(x => x.name)).toEqual(['Rice', 'Bread'])
  })
  it('imported foods keep their source and keep their original ids', () => {
    const out = parseFoodsImport(exportFoods([f('Rice'), { ...f('Mine'), source: 'custom' }]))
    expect(out[0].source).toBe('predefined') // built-ins land as overrides
    expect(out[1].source).toBe('custom')     // customs land as My Foods
    // ids are preserved so predefined overrides can match their predefined food
    // by id on re-import; custom foods still dedupe by name|brand via mergeFoods.
    expect(out[0].id).toBe('Rice')
    expect(out[1].id).toBe('Mine')
  })
  it('accepts a bare array too', () => {
    expect(parseFoodsImport(JSON.stringify([f('Rice')]))).toHaveLength(1)
  })
  it('throws on malformed foods input', () => {
    expect(() => parseFoodsImport('not json')).toThrow('Invalid foods file')
    expect(() => parseFoodsImport('{"nope":1}')).toThrow('Invalid foods file')
  })
  it('mergeFoods dedupes by name+brand case-insensitively', () => {
    const merged = mergeFoods([f('Rice')], [f('rice'), f('Bread')])
    expect(merged.map(x => x.name.toLowerCase()).sort()).toEqual(['bread', 'rice'])
  })
  it('backup round-trips', () => {
    const data = { days: {}, myFoods: [f('Rice')], settings: { dailyBudget: 2012, macroTargets: { carbs: 1, protein: 1, fat: 1, fiber: 1 }, language: 'en' as const } }
    const parsed = parseBackup(exportBackup(data))
    expect(parsed.settings.dailyBudget).toBe(2012)
    expect(parsed.myFoods).toHaveLength(1)
  })
  it('backup round-trips food overrides', () => {
    const data = {
      days: {}, myFoods: [], foodOverrides: { 'pre-x': f('Edited Rice') },
      settings: { dailyBudget: 2000, macroTargets: { carbs: 1, protein: 1, fat: 1, fiber: 1 }, language: 'en' as const },
    }
    const parsed = parseBackup(exportBackup(data))
    expect(parsed.foodOverrides?.['pre-x'].name).toBe('Edited Rice')
  })
  it('throws on malformed backup', () => {
    expect(() => parseBackup('nope')).toThrow('Invalid backup file')
  })

  // — mergeBackup: union by stable ids so re-importing the same export doesn't dup —
  function backup(partial: Partial<BackupData>): BackupData {
    return { days: {}, myFoods: [], settings: SET, ...partial }
  }

  it('mergeBackup unions days by date and dedupes entries by id (incoming wins)', () => {
    const ex = backup({ days: { '2026-01-01': day('2026-01-01', { breakfast: [entry('a'), entry('b')] }) } })
    const inc = backup({ days: {
      '2026-01-01': day('2026-01-01', { breakfast: [entry('b'), entry('c')] }), // overlap on 'b'
      '2026-01-02': day('2026-01-02', { lunch: [entry('d')] }),                  // new day
    } })
    const merged = mergeBackup(ex, inc)
    // breakfast: a (ex only) + b (incoming wins) + c (inc only) = 3, no dup
    expect(merged.days['2026-01-01'].meals.breakfast.map(e => e.id).sort()).toEqual(['a', 'b', 'c'])
    // new day carried over
    expect(merged.days['2026-01-02'].meals.lunch.map(e => e.id)).toEqual(['d'])
  })

  it('mergeBackup unions exercise by id', () => {
    const ex = backup({ days: { '2026-01-01': day('2026-01-01', {}, [
      { id: 'x', name: 'Run', caloriesBurned: 100 }, { id: 'y', name: 'Walk', caloriesBurned: 50 },
    ]) } })
    const inc = backup({ days: { '2026-01-01': day('2026-01-01', {}, [
      { id: 'y', name: 'Walk-updated', caloriesBurned: 60 }, { id: 'z', name: 'Swim', caloriesBurned: 200 },
    ]) } })
    const merged = mergeBackup(ex, inc)
    const ex2 = merged.days['2026-01-01'].exercise
    expect(ex2.map(e => e.id).sort()).toEqual(['x', 'y', 'z'])
    expect(ex2.find(e => e.id === 'y')!.name).toBe('Walk-updated') // incoming wins
  })

  it('mergeBackup unions myFoods by id, with name|brand fallback', () => {
    const mine = (id: string, name: string): Food => ({ ...f(name), id, source: 'custom' })
    const ex = backup({ myFoods: [mine('a', 'Rice'), mine('b', 'Bread')] })
    // 'b' re-imported (same id → overwrite with Bread-updated);
    // 'rice2' has a different id but the SAME name|brand as existing 'Rice' →
    // name|brand fallback collapses it onto the existing 'Rice' entry (incoming wins),
    // instead of leaving a duplicate "Rice";
    // 'c' is a brand-new id+name → appended.
    const inc = backup({ myFoods: [mine('b', 'Bread-updated'), mine('rice2', 'Rice'), mine('c', 'Egg')] })
    const merged = mergeBackup(ex, inc)
    expect(merged.myFoods.length).toBe(3) // a/Rice (collapsed via name|brand), b, c
    const byName = Object.fromEntries(merged.myFoods.map(x => [x.name, x]))
    expect(byName['Bread-updated']).toBeDefined()       // incoming 'b' overwrote
    expect(byName['Rice']).toBeDefined()                // collapsed, not duplicated
    expect(byName['Egg']).toBeDefined()                // appended
    // the name|brand fallback keeps a single Rice (incoming's id 'rice2')
    expect(merged.myFoods.filter(x => x.name === 'Rice').map(x => x.id)).toEqual(['rice2'])
  })

  it('mergeBackup shallow-merges overrides and hidden, incoming wins', () => {
    const ex = backup({ foodOverrides: { 'pre-1': f('Old Rice') }, hiddenFoods: { 'pre-2': true } })
    const inc = backup({ foodOverrides: { 'pre-1': f('New Rice'), 'pre-3': f('New Egg') }, hiddenFoods: { 'pre-4': true } })
    const merged = mergeBackup(ex, inc)
    expect(merged.foodOverrides?.['pre-1'].name).toBe('New Rice') // incoming overwrote
    expect(merged.foodOverrides?.['pre-3'].name).toBe('New Egg')  // incoming added
    expect(merged.hiddenFoods).toEqual({ 'pre-2': true, 'pre-4': true })
  })

  it('mergeBackup takes incoming settings', () => {
    const ex = backup({ settings: { dailyBudget: 1000, macroTargets: { carbs: 1, protein: 1, fat: 1, fiber: 1 }, language: 'en' } })
    const inc = backup({ settings: { dailyBudget: 2500, macroTargets: { carbs: 9, protein: 8, fat: 7, fiber: 6 }, language: 'zh' as const } })
    const merged = mergeBackup(ex, inc)
    expect(merged.settings.dailyBudget).toBe(2500)
    expect(merged.settings.language).toBe('zh')
  })
  it('mergeBackup unions customIcons, de-duped, order preserved', () => {
    const ex = backup({ customIcons: ['🥥', '🥑'] })
    const inc = backup({ customIcons: ['🥑', '🌶️'] })
    const merged = mergeBackup(ex, inc)
    expect(merged.customIcons).toEqual(['🥥', '🥑', '🌶️'])
  })
})
