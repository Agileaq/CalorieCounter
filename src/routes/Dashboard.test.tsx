import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Dashboard from './Dashboard'
import { todayKey, weekOf, formatHeader } from '../lib/date'

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
  it('clicking a weekly bar switches the selected date', () => {
    render(<AppProvider><Dashboard /></AppProvider>)
    const today = todayKey()
    const header = screen.getByTestId('date-center')
    // header initially reflects today
    expect(header).toHaveTextContent(formatHeader(today, 'en'))
    // pick a different day in the same week and click its bar
    // (5 cards × 7 bars share each date's aria-label; click the first match)
    const target = weekOf(today).find(k => k !== today)!
    fireEvent.click(screen.getAllByLabelText(target)[0])
    // header now reflects the clicked date
    expect(header).toHaveTextContent(formatHeader(target, 'en'))
    // the today bar (the previous selected date) should no longer read as selected
    // — its gauge value comes from a different day now; assert header changed at minimum
    expect(header).not.toHaveTextContent(formatHeader(today, 'en'))
  })
})
