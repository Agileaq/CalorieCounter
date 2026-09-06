import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Dashboard from './Dashboard'
import { todayKey, weekOf, formatHeader } from '../lib/date'
import { emptyDay } from '../lib/storage'
import type { DayLog } from '../types'

function weighDay(key: string): DayLog {
  return { ...emptyDay(key), weightKg: 80 }
}

beforeEach(() => localStorage.clear())

describe('Dashboard', () => {
  it('renders the three review modules and the version badge', () => {
    localStorage.setItem('cc.days', JSON.stringify({ [todayKey()]: weighDay(todayKey()) }))
    render(<AppProvider><Dashboard /></AppProvider>)
    expect(screen.getByText('Weight Trend')).toBeInTheDocument()
    expect(screen.getByText('Calories')).toBeInTheDocument()
    expect(screen.getByTestId('calorie-week-avg')).toBeInTheDocument()
    expect(screen.getAllByTestId('week-bar')).toHaveLength(7)
    for (const k of ['carbs', 'protein', 'fat', 'fiber']) {
      expect(screen.getByTestId(`macro-cell-${k}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('build-info').textContent).toMatch(/^v/)
  })
  it('no single-day gauges or old stat cards remain', () => {
    render(<AppProvider><Dashboard /></AppProvider>)
    expect(screen.queryByTestId('stat-gauge-value')).toBeNull()
    expect(screen.queryByTestId('stat-bar')).toBeNull()
    expect(screen.queryByTestId('stat-bar-btn')).toBeNull()
  })
  it('clicking a weekly calorie bar switches the selected date', () => {
    localStorage.setItem('cc.days', JSON.stringify({ [todayKey()]: weighDay(todayKey()) }))
    render(<AppProvider><Dashboard /></AppProvider>)
    const header = screen.getByTestId('date-center')
    const today = todayKey()
    expect(header).toHaveTextContent(formatHeader(today, 'en'))
    const target = weekOf(today).find(k => k !== today)!
    fireEvent.click(screen.getAllByLabelText(target)[0])
    expect(header).toHaveTextContent(formatHeader(target, 'en'))
  })
})
