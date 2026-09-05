import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { DaySummaryCard } from './DaySummaryCard'
import { emptyNutrition } from '../lib/nutrition'
import { todayKey } from '../lib/date'
import type { DayLog, Food } from '../types'

function food(calories: number, carbs: number, protein: number, fat: number): Food {
  const base = emptyNutrition()
  return {
    id: 'f1', name: 'Rice', icon: '🍚', source: 'custom', createdAt: '2026-01-01',
    servings: [{ id: 's1', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
    nutrition: {
      ...base, calories, protein,
      carbs: { ...base.carbs, total: carbs },
      fat: { ...base.fat, total: fat },
    },
  }
}

/** Seed today's log: one food entry + one exercise entry. */
function seedDay(calories: number, carbs: number, protein: number, fat: number, burned: number) {
  const day: DayLog = {
    date: todayKey(),
    meals: {
      breakfast: [{ id: 'e1', foodSnapshot: food(calories, carbs, protein, fat), servingId: 's1', quantity: 1 }],
      lunch: [], dinner: [], snacks: [],
    },
    exercise: [{ id: 'x1', name: 'Running', caloriesBurned: burned }],
  }
  localStorage.setItem('cc.days', JSON.stringify({ [todayKey()]: day }))
}

describe('DaySummaryCard', () => {
  it('shows the fixed daily budget plus food and exercise totals', () => {
    seedDay(500, 140, 60, 30, 200)
    render(<AppProvider><DaySummaryCard /></AppProvider>)
    expect(screen.getByTestId('summary-budget')).toHaveTextContent('Budget: 2,248 kcal to eat')
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByTestId('summary-food')).toHaveTextContent('500')
    expect(screen.getByText('Exercise')).toBeInTheDocument()
    expect(screen.getByTestId('summary-exercise')).toHaveTextContent('200')
  })
  it('ring center shows remaining with Under label; green fill, no red segment', () => {
    seedDay(500, 140, 60, 30, 200)
    render(<AppProvider><DaySummaryCard /></AppProvider>)
    // remaining = 2248 − 500 + 200 = 1948
    expect(screen.getByTestId('summary-gauge-value')).toHaveTextContent('1,948')
    expect(screen.getByText('Under')).toBeInTheDocument()
    const fill = document.querySelector('[data-testid="stat-ring-fill"]')!
    expect(fill.getAttribute('stroke')).toBe('var(--green)')
    expect(document.querySelector('[data-testid="stat-ring-over"]')).toBeNull()
  })
  it('ring shows Over with a red segment when food exceeds the budget', () => {
    seedDay(2500, 350, 60, 30, 0)
    render(<AppProvider><DaySummaryCard /></AppProvider>)
    // remaining = 2248 − 2500 = −252
    expect(screen.getByTestId('summary-gauge-value')).toHaveTextContent('252')
    expect(screen.getByText('Over')).toBeInTheDocument()
    expect(document.querySelector('[data-testid="stat-ring-over"]')).not.toBeNull()
  })
  it('macro bars: name above, grams below, fill proportional to target', () => {
    seedDay(500, 140, 60, 30, 200)
    render(<AppProvider><DaySummaryCard /></AppProvider>)
    const carbs = screen.getByTestId('summary-macro-carbs')
    expect(carbs.children[0]).toHaveTextContent('Carbohydrates') // name above
    expect(carbs.children[2]).toHaveTextContent('140/280g')      // grams below
    expect((carbs.querySelector('[data-testid="summary-macro-fill"]') as HTMLElement).style.width).toBe('50%')

    const protein = screen.getByTestId('summary-macro-protein')
    expect(protein.children[0]).toHaveTextContent('Protein')
    expect(protein.children[2]).toHaveTextContent('60/120g')
    expect((protein.querySelector('[data-testid="summary-macro-fill"]') as HTMLElement).style.width).toBe('50%')

    const fat = screen.getByTestId('summary-macro-fat')
    expect(fat.children[0]).toHaveTextContent('Fat')
    expect(fat.children[2]).toHaveTextContent('30/72g')
    expect(parseFloat((fat.querySelector('[data-testid="summary-macro-fill"]') as HTMLElement).style.width)).toBeCloseTo(41.67, 1)
  })
  it('macro fill is capped at 100% when over target', () => {
    seedDay(2500, 350, 60, 30, 0)
    render(<AppProvider><DaySummaryCard /></AppProvider>)
    const fill = screen.getByTestId('summary-macro-carbs').querySelector('[data-testid="summary-macro-fill"]') as HTMLElement
    expect(fill.style.width).toBe('100%')
    expect(screen.getByTestId('summary-macro-carbs')).toHaveTextContent('350/280g')
  })
})
