import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { MacroMatrix } from './MacroMatrix'
import { emptyDay } from '../lib/storage'
import { todayKey, weekOf, addDays } from '../lib/date'
import type { DayLog } from '../types'

function foodDay(key: string, macros: { calories?: number; carbs?: number; protein?: number; fat?: number; fiber?: number }): DayLog {
  const d = emptyDay(key)
  d.meals.breakfast.push({
    id: 'e' + key, servingId: 's', quantity: 1,
    foodSnapshot: {
      id: 'f', name: 'x', icon: '🍽️', source: 'custom', createdAt: key,
      servings: [{ id: 's', kind: 'weight', label: 'g', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: {
        calories: macros.calories ?? 0,
        fat: { total: macros.fat ?? 0, mono: 0, poly: 0, saturated: 0, trans: 0 },
        cholesterol: 0, sodium: 0,
        carbs: { total: macros.carbs ?? 0, fiber: macros.fiber ?? 0, sugar: 0 },
        protein: macros.protein ?? 0,
        vitamins: { a: 0, c: 0, b1: 0, b2: 0, b3: 0, b9: 0, b6: 0, b12: 0 },
        minerals: { calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, zinc: 0 },
        caffeine: 0,
      },
    },
  })
  return d
}

function seedDays(list: DayLog[]) {
  localStorage.setItem('cc.days', JSON.stringify(Object.fromEntries(list.map(d => [d.date, d]))))
}

beforeEach(() => localStorage.clear())

describe('MacroMatrix', () => {
  const today = todayKey()
  it('renders the four cells in order: carbs, protein, fat, fiber', () => {
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const cells = screen.getAllByTestId(/^macro-cell-/).map(c => c.dataset.testid)
    expect(cells).toEqual(['macro-cell-carbs', 'macro-cell-protein', 'macro-cell-fat', 'macro-cell-fiber'])
  })
  it('cells show intake over the weight-scaled range (80kg base): tri-state colors', () => {
    // no weigh-ins, no goal → 80kg base: carbs 200–320, protein 96–176, fat 40–96, fiber 20–40
    seedDays([foodDay(today, { carbs: 150, protein: 150, fat: 40, fiber: 12 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    // carbs 150 < 200 → short (muted)
    const carbsNum = screen.getByTestId('macro-num-carbs')
    expect(carbsNum).toHaveTextContent('150')
    expect(carbsNum).toHaveStyle({ color: 'var(--muted)', fontWeight: 700 })
    expect(screen.getByTestId('macro-value-carbs')).toHaveTextContent('150 / 200–320g')
    // protein 150 within 96–176 → inherits the text colour
    const proteinNum = screen.getByTestId('macro-num-protein')
    expect(proteinNum).toHaveTextContent('150')
    expect(proteinNum.style.color).toBe('inherit')
    expect(proteinNum).toHaveStyle({ fontWeight: 700 })
    expect(screen.getByTestId('macro-value-protein')).toHaveTextContent('150 / 96–176g')
    // fat 40 sits exactly on the range floor → within
    expect(screen.getByTestId('macro-num-fat')).toHaveTextContent('40')
    expect(screen.getByTestId('macro-value-fat')).toHaveTextContent('40 / 40–96g')
    // fiber 12 < 20 → short (muted)
    const fiberNum = screen.getByTestId('macro-num-fiber')
    expect(fiberNum).toHaveTextContent('12')
    expect(fiberNum.textContent).not.toMatch(/^[+−]/)
    expect(fiberNum).toHaveStyle({ color: 'var(--muted)', fontWeight: 700 }) // same rhythm as the macro numbers
    expect(screen.getByTestId('macro-value-fiber')).toHaveTextContent('12 / 20–40g')
  })
  it('over-max turns red at the 80kg base, and weigh-ins rescale the ruler', () => {
    seedDays([foodDay(today, { carbs: 350 })]) // 350 > 320 → red
    render(<AppProvider><MacroMatrix /></AppProvider>)
    expect(screen.getByTestId('macro-num-carbs')).toHaveStyle({ color: 'var(--red)' })
  })
  it('a heavier weigh-in widens the range: the same intake reads as within', () => {
    const yesterday = addDays(today, -1)
    const weighIn = { ...emptyDay(yesterday), weightKg: 91.6 } // weigh-in-only day: ruler, not data
    seedDays([foodDay(today, { carbs: 350 }), weighIn]) // 91.6kg → carbs 229–366
    render(<AppProvider><MacroMatrix /></AppProvider>)
    expect(screen.getByTestId('macro-num-carbs').style.color).toBe('inherit') // within → text colour
    expect(screen.getByTestId('macro-value-carbs')).toHaveTextContent('350 / 229–366g')
  })
  it('fiber met turns green', () => {
    seedDays([foodDay(today, { fiber: 32 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const fiberNum = screen.getByTestId('macro-num-fiber')
    expect(fiberNum).toHaveTextContent('32')
    expect(fiberNum).toHaveStyle({ color: 'var(--green)' })
    expect(screen.getByTestId('macro-value-fiber')).toHaveTextContent('32 / 20–40g')
  })
  it('selected day without a record shows — over the range', () => {
    seedDays([foodDay('2026-01-01', { carbs: 100 })]) // some other day, not today
    render(<AppProvider><MacroMatrix /></AppProvider>)
    expect(screen.getByTestId('macro-value-carbs')).toHaveTextContent('— / 200–320g')
  })
  it('conclusion line: weekly avg over present days incl. selected + hit days', () => {
    const week = weekOf(todayKey())
    const others = week.filter(k => k !== todayKey()).slice(0, 3)
    seedDays([
      ...others.map(k => foodDay(k, { carbs: 250 })),
      foodDay(todayKey(), { carbs: 270 }), // avg (250×3 + 270)/4 = 255, all within 200–320
    ])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const cell = screen.getByTestId('macro-cell-carbs')
    expect(cell.textContent).toContain('Avg 255/day')
    expect(cell.textContent).toContain('4/7 days on target')
  })
  it('MiniBars: 7 full-height track slots always render; over-target days red (macros), met days green (fiber)', () => {
    const week = weekOf(todayKey())
    const today = todayKey()
    const d1 = week.find(k => k !== today)! // robust even when today is Monday
    const d2 = week.find(k => k !== today && k !== d1)!
    const i1 = week.indexOf(d1)
    const i2 = week.indexOf(d2)
    const todayIdx = week.indexOf(today)
    const emptyIdx = week.findIndex(k => k !== today && k !== d1 && k !== d2)
    seedDays([
      foodDay(d1, { carbs: 350, fiber: 45 }),   // over max → red
      foodDay(d2, { carbs: 100, fiber: 10 }),   // short → muted
      foodDay(today, { carbs: 250, fiber: 25 }), // within → cell colour / green
    ])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const carbTracks = screen.getByTestId('macro-minis-carbs').children
    expect(carbTracks).toHaveLength(7)
    // empty days keep a visible grey slot so the 7-day shape always reads
    expect((carbTracks[emptyIdx] as HTMLElement).style.height).toBe('28px')
    expect((carbTracks[emptyIdx] as HTMLElement).style.background).toBe('var(--line)')
    // recorded days stack a coloured fill inside the slot
    expect(((carbTracks[i1] as HTMLElement).firstElementChild as HTMLElement).style.background).toBe('var(--red)')     // 350 > 320
    expect(((carbTracks[i2] as HTMLElement).firstElementChild as HTMLElement).style.background).toBe('var(--muted)')   // 100 < 200
    expect(((carbTracks[todayIdx] as HTMLElement).firstElementChild as HTMLElement).style.background).toBe('var(--accent)') // 250 within
    const fiberTracks = screen.getByTestId('macro-minis-fiber').children
    expect(((fiberTracks[i1] as HTMLElement).firstElementChild as HTMLElement).style.background).toBe('var(--red)')    // 45 > 40
    expect(((fiberTracks[i2] as HTMLElement).firstElementChild as HTMLElement).style.background).toBe('var(--muted)')  // 10 < 20
    expect(((fiberTracks[todayIdx] as HTMLElement).firstElementChild as HTMLElement).style.background).toBe('var(--green)') // 25 within
  })
})
