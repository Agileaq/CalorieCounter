import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { BudgetGauge } from './BudgetGauge'
import type { DayLog } from '../types'

const day: DayLog = {
  date: '2026-08-18',
  meals: {
    breakfast: [{ id: 'e', servingId: 's', quantity: 100, foodSnapshot: {
      id: 'f', name: 'x', icon: '🍚', source: 'custom', createdAt: '',
      servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: { calories: 782, fat:{total:0,mono:0,poly:0,saturated:0,trans:0}, cholesterol:0, sodium:0, carbs:{total:0,fiber:0,sugar:0}, protein:0, vitamins:{a:0,c:0,b1:0,b2:0,b3:0,b9:0,b6:0,b12:0}, minerals:{calcium:0,iron:0,magnesium:0,phosphorus:0,potassium:0,zinc:0}, caffeine:0 },
    } }],
    lunch: [], dinner: [], snacks: [],
  },
  exercise: [],
}

describe('BudgetGauge', () => {
  it('shows remaining, food consumed, and Under label', () => {
    render(<BudgetGauge budget={2012} day={day} />)
    expect(screen.getByTestId('gauge-remaining').textContent).toBe('1,230')
    expect(screen.getByTestId('gauge-food').textContent).toBe('782')
    expect(screen.getByText(/Under/i)).toBeInTheDocument()
  })
})
