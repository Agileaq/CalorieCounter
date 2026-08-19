import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  it('renders the five stat cards and a version badge', () => {
    render(<AppProvider><Dashboard /></AppProvider>)
    for (const title of ['Calories', 'Carbohydrates', 'Protein', 'Fat', 'Fiber']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    // one half-ring gauge value per card
    expect(screen.getAllByTestId('stat-gauge-value')).toHaveLength(5)
    // 5 cards × 7 weekday bars
    expect(screen.getAllByTestId('stat-bar')).toHaveLength(35)
    expect(screen.getByTestId('build-info').textContent).toMatch(/^v/)
  })
})
