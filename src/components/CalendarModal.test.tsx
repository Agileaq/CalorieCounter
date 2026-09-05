import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { CalendarModal } from './CalendarModal'
import { useApp } from '../state/useApp'
import { todayKey } from '../lib/date'

function SelectedProbe({ into }: { into: { current: string } }) {
  const { selectedDate } = useApp()
  into.current = selectedDate
  return null
}

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
  it('the Today button selects the system current date but keeps the calendar open', () => {
    const ref = { current: '' }
    render(
      <AppProvider>
        <SelectedProbe into={ref} />
        <CalendarModal onClose={() => {}} />
      </AppProvider>,
    )
    // move the selection off today by picking an arbitrary grid day
    fireEvent.click(screen.getAllByTestId('cal-day')[0])
    // it may or may not equal today; regardless, Today must (re)select todayKey
    fireEvent.click(screen.getByText(/today/i))
    expect(ref.current).toBe(todayKey())
    // calendar stays open (the grid is still mounted)
    expect(screen.getAllByTestId('cal-day').length).toBeGreaterThan(0)
  })
})
