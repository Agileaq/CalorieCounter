import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { MacroMatrix } from './MacroMatrix'
import { emptyDay } from '../lib/storage'
import { todayKey, weekOf } from '../lib/date'
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
  it('macros show a signed remaining: positive default, negative red when over target', () => {
    seedDays([foodDay(today, { carbs: 150, protein: 150 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    // carbs 150 vs 280 → +130; protein 150 vs 120 → −30 (red)
    expect(screen.getByTestId('macro-value-carbs')).toHaveTextContent('+130 / 280g')
    const protein = screen.getByTestId('macro-value-protein')
    expect(protein).toHaveTextContent('−30 / 120g')
    expect(protein).toHaveStyle({ color: 'var(--red)' })
  })
  it('fiber shows plain intake (never a signed remaining), muted when short, green when met', () => {
    seedDays([foodDay(today, { fiber: 12 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const fiber = screen.getByTestId('macro-value-fiber')
    expect(fiber).toHaveTextContent('12 / 30g')
    expect(fiber.textContent).not.toMatch(/^[+−]/)
    expect(fiber).toHaveStyle({ color: 'var(--muted)' })
  })
  it('fiber met turns green', () => {
    seedDays([foodDay(today, { fiber: 32 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const fiber = screen.getByTestId('macro-value-fiber')
    expect(fiber).toHaveTextContent('32 / 30g')
    expect(fiber).toHaveStyle({ color: 'var(--green)' })
  })
  it('selected day without a record shows — / targetg', () => {
    seedDays([foodDay('2026-01-01', { carbs: 100 })]) // some other day, not today
    render(<AppProvider><MacroMatrix /></AppProvider>)
    expect(screen.getByTestId('macro-value-carbs')).toHaveTextContent('— / 280g')
  })
  it('conclusion line: weekly avg over present days incl. selected + hit days', () => {
    const week = weekOf(todayKey())
    const others = week.filter(k => k !== todayKey()).slice(0, 3)
    seedDays([
      ...others.map(k => foodDay(k, { carbs: 100 })),
      foodDay(todayKey(), { carbs: 108 }), // avg (100×3 + 108)/4 = 102, all ≤ 280
    ])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const cell = screen.getByTestId('macro-cell-carbs')
    expect(cell.textContent).toContain('Avg 102/day')
    expect(cell.textContent).toContain('4/7 days on target')
  })
  it('MiniBars color over-target days red (macros) and met days green (fiber)', () => {
    const week = weekOf(todayKey())
    const today = todayKey()
    const other = week.find(k => k !== today)! // robust even when today is Monday
    const otherIdx = week.indexOf(other)
    const todayIdx = week.indexOf(today)
    seedDays([foodDay(other, { carbs: 300, fiber: 32 }), foodDay(today, { carbs: 100, fiber: 10 })])
    render(<AppProvider><MacroMatrix /></AppProvider>)
    const carbBars = screen.getByTestId('macro-minis-carbs').children
    expect((carbBars[todayIdx] as HTMLElement).style.background).toBe('var(--accent)') // 100 ≤ 280 → cell colour
    expect((carbBars[otherIdx] as HTMLElement).style.background).toBe('var(--red)')    // 300 > 280 → red
    const fiberBars = screen.getByTestId('macro-minis-fiber').children
    expect((fiberBars[otherIdx] as HTMLElement).style.background).toBe('var(--green)') // 32 ≥ 30
    expect((fiberBars[todayIdx] as HTMLElement).style.background).toBe('var(--muted)') // 10 < 30
  })
})
