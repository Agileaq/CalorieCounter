import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CalorieRing } from './CalorieRing'

describe('CalorieRing', () => {
  it('shows only the grey track when nothing is consumed', () => {
    const { container } = render(<CalorieRing consumed={0} budget={100} />)
    expect(container.querySelector('[data-testid="stat-ring-fill"]')).toBeNull()
    expect(container.querySelector('[data-testid="stat-ring-over"]')).toBeNull()
    // grey track path is always present
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
  it('fills green toward the budget when under or at budget', () => {
    const { container: under } = render(<CalorieRing consumed={80} budget={100} />)
    const fill = under.querySelector('[data-testid="stat-ring-fill"]')!
    expect(fill.getAttribute('stroke')).toBe('var(--green)')
    expect(under.querySelector('[data-testid="stat-ring-over"]')).toBeNull()

    const { container: at } = render(<CalorieRing consumed={100} budget={100} />)
    expect(at.querySelector('[data-testid="stat-ring-fill"]')!.getAttribute('stroke')).toBe('var(--green)')
    // exactly at budget → frac == NOTCH (0.8), not strictly over → no red segment
    expect(at.querySelector('[data-testid="stat-ring-over"]')).toBeNull()
  })
  it('adds a red over-segment past the notch when over budget', () => {
    const { container } = render(<CalorieRing consumed={150} budget={100} />)
    const over = container.querySelector('[data-testid="stat-ring-over"]')!
    expect(over.getAttribute('stroke')).toBe('var(--red)')
    // green fill still present underneath
    expect(container.querySelector('[data-testid="stat-ring-fill"]')!.getAttribute('stroke')).toBe('var(--green)')
  })
})
