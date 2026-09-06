import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { WeightTrendChart } from './WeightTrendChart'
import { addDays, todayKey, weekOf, daysBetween } from '../lib/date'
import { TAG_COLORS } from '../lib/weight'
import { emptyNutrition } from '../lib/nutrition'
import type { DayLog } from '../types'

const today = todayKey()
const W = 360, PAD_L = 36, PAD_R = 6

function weighDay(date: string, kg: number, tags?: string[], calories = 0, burned = 0): DayLog {
  const base = emptyNutrition()
  return {
    date,
    meals: {
      breakfast: calories
        ? [{
            id: 'e1', servingId: 's', quantity: 1,
            foodSnapshot: {
              id: 'f1', name: 'Rice', icon: '🍚', source: 'custom', createdAt: '',
              servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
              nutrition: { ...base, calories },
            },
          }]
        : [],
      lunch: [], dinner: [], snacks: [],
    },
    exercise: burned ? [{ id: 'x1', name: 'Run', caloriesBurned: burned }] : [],
    weightKg: kg,
    ...(tags ? { tags: tags as any } : {}),
  }
}

function seedDays(list: DayLog[], settings: Record<string, unknown> = {}) {
  localStorage.setItem('cc.days', JSON.stringify(Object.fromEntries(list.map(d => [d.date, d]))))
  localStorage.setItem('cc.settings', JSON.stringify(settings))
}

const threeWeighIns = () => [
  weighDay(addDays(today, -10), 80),
  weighDay(addDays(today, -9), 79.5),
  weighDay(addDays(today, -8), 79),
  weighDay(today, 78.9),
]

beforeEach(() => localStorage.clear())

describe('WeightTrendChart', () => {
  it('shows the empty hint without any weigh-ins', () => {
    seedDays([])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByText(/Log/)).toBeInTheDocument()
    expect(screen.queryByTestId('weight-trend-svg')).toBeNull()
  })
  it('single weigh-in: dot only, no trend line, warm-up hint', () => {
    seedDays([weighDay(addDays(today, -2), 80)])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByTestId(`trend-dot-${addDays(today, -2)}`)).toBeInTheDocument()
    expect(screen.queryByTestId('trend-line')).toBeNull()
    expect(screen.getByText('Log a few more days to reveal the 7-day average.')).toBeInTheDocument()
  })
  it('renders one dot per weigh-in and the trend line at ≥3 weigh-ins', () => {
    seedDays(threeWeighIns())
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    for (const d of [-10, -9, -8, 0].map(o => addDays(today, o))) {
      expect(screen.getByTestId(`trend-dot-${d}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('trend-line')).toBeInTheDocument()
  })
  it('corridor renders below-goal rails; hints otherwise', () => {
    seedDays(threeWeighIns(), { goalWeightKg: 78 })
    const { unmount } = render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByTestId('corridor-rail-slow')).toBeInTheDocument()
    expect(screen.getByTestId('corridor-rail-fast')).toBeInTheDocument()
    expect(screen.getByTestId('corridor-fill')).toBeInTheDocument()
    unmount()
    localStorage.setItem('cc.settings', JSON.stringify({}))
    const { unmount: u2 } = render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.queryByTestId('corridor-rail-slow')).toBeNull()
    u2()
  })
  it('range switch filters dots (30d hides a 60-day-old weigh-in)', async () => {
    const old = addDays(today, -60)
    seedDays([...threeWeighIns(), weighDay(old, 82)])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByTestId(`trend-dot-${old}`)).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('range-30'))
    expect(screen.queryByTestId(`trend-dot-${old}`)).toBeNull()
    await userEvent.click(screen.getByTestId('range-all'))
    expect(screen.getByTestId(`trend-dot-${old}`)).toBeInTheDocument()
  })
  it('event lane: single tag = colored dot, multiple tags = "+" marker', () => {
    const d1 = addDays(today, -8)
    const d2 = addDays(today, -9)
    seedDays([
      weighDay(d1, 79, ['cheat']),
      weighDay(d2, 79.5, ['cheat', 'strength']),
      weighDay(addDays(today, -10), 80),
      weighDay(today, 78.9),
    ])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByTestId(`event-dot-${d1}`)).toHaveAttribute('fill', TAG_COLORS.cheat)
    expect(screen.getByTestId(`event-multi-${d2}`)).toBeInTheDocument()
  })
  it('readout defaults to the latest in-range weigh-in and updates on tap', () => {
    seedDays(threeWeighIns())
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    const readout = screen.getByTestId('trend-readout')
    expect(readout.textContent).toContain('78.9')
    // tap the column of the weigh-in 8 days ago (index 8 of 10): x = PAD_L + 8/10 × innerW
    const svg = screen.getByTestId('weight-trend-svg')
    const total = daysBetween(addDays(today, -10), today)
    fireEvent(svg, new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: PAD_L + (8 / total) * (W - PAD_L - PAD_R),
      clientY: 100,
    }))
    expect(readout.textContent).toContain('79')
  })
  it('deficit bars render for existing day keys, green when under budget', () => {
    const d = addDays(today, -8)
    seedDays([weighDay(d, 79, undefined, 500, 200), ...threeWeighIns().slice(0, 3)])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByTestId(`deficit-bar-${d}`)).toHaveAttribute('fill', 'var(--green)')
  })
  it('rate bars cover exactly the completed week span', () => {
    const ws = addDays(weekOf(today)[0], -7) // last completed week's Monday
    seedDays([
      weighDay(ws, 80),
      weighDay(addDays(ws, 6), 79),
      weighDay(today, 78.9),
    ])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    const bar = screen.getByTestId(`rate-bar-${ws}`)
    const total = daysBetween(ws, today)
    expect(parseFloat(bar.getAttribute('width')!)).toBeCloseTo((7 / total) * (W - PAD_L - PAD_R), 0)
    expect(screen.queryByTestId(`rate-bar-${weekOf(today)[0]}`)).toBeNull() // current week in progress
  })
})
