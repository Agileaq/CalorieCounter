import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Log from './Log'

describe('Log', () => {
  it('renders the four meal cards and the exercise card', () => {
    render(<AppProvider><Log /></AppProvider>)
    for (const meal of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
      expect(screen.getByText(new RegExp(meal))).toBeInTheDocument()
    }
    expect(screen.getByTestId('exercise-add')).toBeInTheDocument()
  })
  it('adds an exercise entry', () => {
    render(<AppProvider><Log /></AppProvider>)
    fireEvent.change(screen.getByTestId('exercise-name'), { target: { value: 'Run' } })
    fireEvent.change(screen.getByTestId('exercise-cals'), { target: { value: '120' } })
    fireEvent.click(screen.getByTestId('exercise-add'))
    expect(screen.getByText(/Run/)).toBeInTheDocument()
  })
  it('clearing the exercise calories stays empty, then typing yields "1" not "01"', () => {
    render(<AppProvider><Log /></AppProvider>)
    const input = screen.getByTestId('exercise-cals')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue(null)
    fireEvent.change(input, { target: { value: '1' } })
    expect(input).toHaveValue(1)
    fireEvent.blur(input)
    expect(input).toHaveValue(1)
  })
})
