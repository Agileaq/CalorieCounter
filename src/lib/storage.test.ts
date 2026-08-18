import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, loadMyFoods, saveMyFoods,
  loadDays, saveDays, getDay, emptyDay, ensureSchema,
} from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('returns default settings when empty', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('round-trips settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, dailyBudget: 2012, language: 'zh' })
    expect(loadSettings().dailyBudget).toBe(2012)
    expect(loadSettings().language).toBe('zh')
  })
  it('round-trips my foods', () => {
    const foods = [{ id: 'f1', name: 'X', icon: '🍚', source: 'custom', createdAt: '', servings: [], nutrition: {} } as any]
    saveMyFoods(foods)
    expect(loadMyFoods()).toHaveLength(1)
  })
  it('getDay returns empty day for missing key', () => {
    const d = getDay(loadDays(), '2026-08-18')
    expect(d.date).toBe('2026-08-18')
    expect(d.meals.breakfast).toEqual([])
    expect(d.exercise).toEqual([])
  })
  it('round-trips days', () => {
    const days = { '2026-08-18': emptyDay('2026-08-18') }
    days['2026-08-18'].exercise.push({ id: 'x', name: 'Run', caloriesBurned: 50 })
    saveDays(days)
    expect(loadDays()['2026-08-18'].exercise[0].caloriesBurned).toBe(50)
  })
  it('ensureSchema sets the current version', () => {
    ensureSchema()
    expect(localStorage.getItem('cc.schemaVersion')).toBe('1')
  })
})
