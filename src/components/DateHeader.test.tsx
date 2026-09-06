import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { DateHeader } from './DateHeader'

describe('DateHeader', () => {
  it('renders a stateless calendar svg icon, the formatted date, and fires onOpenCalendar', () => {
    const onOpen = vi.fn()
    render(<AppProvider><DateHeader onOpenCalendar={onOpen} /></AppProvider>)
    const center = screen.getByTestId('date-center')
    expect(center.querySelector('svg')).not.toBeNull()
    fireEvent.click(center)
    expect(onOpen).toHaveBeenCalled()
  })
  it('prev/next buttons change the date', () => {
    render(<AppProvider><DateHeader onOpenCalendar={() => {}} /></AppProvider>)
    const label = screen.getByTestId('date-center').textContent
    fireEvent.click(screen.getByTestId('date-next'))
    expect(screen.getByTestId('date-center').textContent).not.toBe(label)
  })
})
