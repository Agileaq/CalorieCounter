import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { useApp } from '../state/useApp'
import { WeightTrendChart } from './WeightTrendChart'
import { addDays, fromDateKey, todayKey, daysBetween, weekOf } from '../lib/date'
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

// same M/D formatting the component uses for readout dates
const fmt = (k: string) => Intl.DateTimeFormat('en', { month: 'numeric', day: 'numeric' }).format(fromDateKey(k))

function DateFlipper({ to }: { to: string }) {
  const { setSelectedDate } = useApp()
  return <button type="button" data-testid="flip-date" onClick={() => setSelectedDate(to)}>flip</button>
}

beforeEach(() => localStorage.clear())

describe('WeightTrendChart', () => {
  it('shows the empty hint without any weigh-ins', () => {
    seedDays([])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByText(/Log/)).toBeInTheDocument()
    expect(screen.queryByTestId('weight-trend-svg')).toBeNull()
  })
  it('header labels the selected week (Mon–Sun) before the range switcher and follows date flips', () => {
    seedDays(threeWeighIns(), { dailyBudget: 2000 })
    render(<AppProvider><WeightTrendChart /><DateFlipper to={addDays(today, -14)} /></AppProvider>)
    // default selectedDate = today → this week, same weekOf() the week card uses
    const w = weekOf(today)
    expect(screen.getByTestId('trend-week').textContent).toBe(`${fmt(w[0])} – ${fmt(w[6])}`)
    // flipping the date (calendar/DateHeader) re-labels the trend header
    fireEvent.click(screen.getByTestId('flip-date'))
    const w2 = weekOf(addDays(today, -14))
    expect(screen.getByTestId('trend-week').textContent).toBe(`${fmt(w2[0])} – ${fmt(w2[6])}`)
  })
  it('single weigh-in: dot only, no trend line, warm-up hint', () => {
    seedDays([weighDay(addDays(today, -2), 80)])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByTestId(`trend-dot-${addDays(today, -2)}`)).toBeInTheDocument()
    expect(screen.queryByTestId('trend-line')).toBeNull()
    expect(screen.getByText('Log a few more days to reveal the 7-day average.')).toBeInTheDocument()
  })
  it('single weigh-in with a goal: no corridor either — it unlocks with the SMA at ≥3', () => {
    seedDays([weighDay(addDays(today, -2), 80)], { goalWeightKg: 78 })
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.queryByTestId('corridor-rail-slow')).toBeNull()
    expect(screen.queryByTestId('corridor-fill')).toBeNull()
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
  it('readout defaults to the selected date and updates on tap', () => {
    seedDays(threeWeighIns())
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    const readout = screen.getByTestId('trend-readout')
    expect(readout.textContent).toContain('78.9')
    // tap the weigh-in 8 days ago (series index 2 of 10): x = PAD_L + 2/10 × innerW
    const svg = screen.getByTestId('weight-trend-svg')
    const total = daysBetween(addDays(today, -10), today)
    fireEvent(svg, new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: PAD_L + (2 / total) * (W - PAD_L - PAD_R),
      clientY: 100,
    }))
    expect(readout.textContent).toContain('79.0')
    // the tapped column is crosshair-ed and its weigh-in dot highlighted
    expect(screen.getByTestId(`trend-dot-${addDays(today, -8)}`)).toHaveAttribute('fill', 'var(--accent)')
  })
  it('readout defaults to the selected date (carry-forward kg), not the latest weigh-in', () => {
    // last weigh-in 3 days ago; the header's selected date (today) wins → the
    // readout anchors on today with the carried-forward kg, not on 9/(today−3)
    seedDays([weighDay(addDays(today, -3), 79)])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    const readout = screen.getByTestId('trend-readout')
    expect(readout.textContent).toContain(fmt(today))
    expect(readout.textContent).toContain('79.0')
    expect(readout.textContent).not.toContain(fmt(addDays(today, -3)))
  })
  it('switching the selected date re-syncs the focus after a tap', () => {
    seedDays(threeWeighIns())
    render(<AppProvider><DateFlipper to={addDays(today, -2)} /><WeightTrendChart /></AppProvider>)
    const readout = screen.getByTestId('trend-readout')
    // tap the today−8 column (series index 2)
    const svg = screen.getByTestId('weight-trend-svg')
    const total = daysBetween(addDays(today, -10), today)
    fireEvent(svg, new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: PAD_L + (2 / total) * (W - PAD_L - PAD_R),
      clientY: 100,
    }))
    expect(readout.textContent).toContain(fmt(addDays(today, -8)))
    // header navigation resets the tap override → focus lands on the new date
    fireEvent.click(screen.getByTestId('flip-date'))
    expect(readout.textContent).toContain(fmt(addDays(today, -2)))
    expect(readout.textContent).not.toContain(fmt(addDays(today, -8)))
  })
  it('deficit bars render for recorded day keys, green when under budget', () => {
    const d = addDays(today, -5) // distinct from the threeWeighIns dates (−10/−9/−8)
    seedDays([weighDay(d, 79, undefined, 500, 200), ...threeWeighIns().slice(0, 3)])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.getByTestId(`deficit-bar-${d}`)).toHaveAttribute('fill', 'var(--green)')
  })
  it('verdict row: sums recorded days of the calendar week containing the selected date, with the trend direction', () => {
    // weigh-in-only days are no data and never count; the week's food day is
    // the only recorded day → 3000 − 2248 = +752 (robust to any run weekday)
    const monday = weekOf(today)[0]
    seedDays([...threeWeighIns(), weighDay(monday, 79.1, undefined, 3000)], { goalWeightKg: 78 })
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    const verdict = screen.getByTestId('trend-verdict')
    expect(verdict.textContent).toContain('+752')
    expect(verdict.textContent).toContain('weight down')
  })
  it('verdict degrades to the deficit-only template when the trend direction is unavailable', () => {
    // weigh-ins only within the last 3 days → no trend 7 days before today → dir null
    const week = weekOf(today)
    const rec = week.find(k => k !== today && k !== addDays(today, -1) && k !== addDays(today, -2))!
    seedDays([
      weighDay(addDays(today, -2), 79), weighDay(addDays(today, -1), 78.8), weighDay(today, 78.6),
      weighDay(rec, 79.2, undefined, 4248), // recorded → +2000 (pre-logging a later week day is fine)
    ])
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    const verdict = screen.getByTestId('trend-verdict')
    expect(verdict.textContent).toContain('+2,000')
    expect(verdict.textContent).not.toContain('weight')
  })
  it('no verdict row below 3 weigh-ins (deficit sub-chart hidden)', () => {
    seedDays([weighDay(today, 80)], { goalWeightKg: 78 })
    render(<AppProvider><WeightTrendChart /></AppProvider>)
    expect(screen.queryByTestId('trend-verdict')).toBeNull()
  })
})
