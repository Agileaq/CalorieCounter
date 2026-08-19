import { describe, it, expect } from 'vitest'
import { exportFoods, parseFoodsImport, mergeFoods, exportBackup, parseBackup } from './importExport'
import type { Food } from '../types'

function f(name: string, brand?: string): Food {
  return { id: name, name, brand, icon: '🍚', source: 'predefined', createdAt: '',
    servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
    nutrition: { calories: 1 } as any }
}

describe('importExport', () => {
  it('exportFoods → parseFoodsImport round-trips names', () => {
    const out = parseFoodsImport(exportFoods([f('Rice'), f('Bread')]))
    expect(out.map(x => x.name)).toEqual(['Rice', 'Bread'])
  })
  it('imported foods keep their source and get new ids', () => {
    const out = parseFoodsImport(exportFoods([f('Rice'), { ...f('Mine'), source: 'custom' }]))
    expect(out[0].source).toBe('predefined') // built-ins land as overrides
    expect(out[1].source).toBe('custom')     // customs land as My Foods
    expect(out[0].id).not.toBe('Rice')
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
})
