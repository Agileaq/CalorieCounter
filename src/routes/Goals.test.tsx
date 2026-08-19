import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Goals from './Goals'

describe('Goals', () => {
  it('edits the daily budget and persists it', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('budget-input'), { target: { value: '2012' } })
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(2012)
  })
  it('clearing the field shows empty, then typing yields "1" not "01"', () => {
    render(<AppProvider><Goals /></AppProvider>)
    const input = screen.getByTestId('budget-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })   // clear the field
    expect(input).toHaveValue(null)                       // stays empty while editing (no forced "0")
    fireEvent.change(input, { target: { value: '1' } })   // type 1 → "1", not "01"
    expect(input).toHaveValue(1)
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(1)
    fireEvent.blur(input)
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(1)
  })
  it('blurring an empty field normalizes it to 0', () => {
    render(<AppProvider><Goals /></AppProvider>)
    const input = screen.getByTestId('budget-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(input).toHaveValue(0)
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(0)
  })
  it('clearing the exercise calories stays empty, then typing yields "1" not "01"', () => {
    render(<AppProvider><Goals /></AppProvider>)
    const input = screen.getByTestId('exercise-cals')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue(null)
    fireEvent.change(input, { target: { value: '1' } })
    expect(input).toHaveValue(1)
    fireEvent.blur(input)
    expect(input).toHaveValue(1)
  })
  it('adds an exercise entry', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('exercise-name'), { target: { value: 'Run' } })
    fireEvent.change(screen.getByTestId('exercise-cals'), { target: { value: '120' } })
    fireEvent.click(screen.getByTestId('exercise-add'))
    expect(screen.getByText(/Run/)).toBeInTheDocument()
  })
})
