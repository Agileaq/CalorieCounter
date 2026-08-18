import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { CalendarModal } from './CalendarModal'

describe('CalendarModal', () => {
  it('shows a month grid and selecting a day closes it', () => {
    const onClose = vi.fn()
    render(<AppProvider><CalendarModal onClose={onClose} /></AppProvider>)
    // day cells are buttons labeled with the day number
    const anyDay = screen.getAllByTestId('cal-day')[10]
    fireEvent.click(anyDay)
    expect(onClose).toHaveBeenCalled()
  })
  it('renders weekly under/over badges', () => {
    render(<AppProvider><CalendarModal onClose={() => {}} /></AppProvider>)
    expect(screen.getAllByTestId('week-badge').length).toBeGreaterThanOrEqual(4)
  })
})
