import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { DateHeader } from './DateHeader'

describe('DateHeader', () => {
  it('renders a formatted date and fires onOpenCalendar', () => {
    const onOpen = vi.fn()
    render(<AppProvider><DateHeader onOpenCalendar={onOpen} /></AppProvider>)
    fireEvent.click(screen.getByTestId('date-center'))
    expect(onOpen).toHaveBeenCalled()
  })
  it('prev/next buttons change the date', () => {
    render(<AppProvider><DateHeader onOpenCalendar={() => {}} /></AppProvider>)
    const label = screen.getByTestId('date-center').textContent
    fireEvent.click(screen.getByTestId('date-next'))
    expect(screen.getByTestId('date-center').textContent).not.toBe(label)
  })
})
