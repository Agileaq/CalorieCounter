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
  it('adds an exercise entry', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('exercise-name'), { target: { value: 'Run' } })
    fireEvent.change(screen.getByTestId('exercise-cals'), { target: { value: '120' } })
    fireEvent.click(screen.getByTestId('exercise-add'))
    expect(screen.getByText(/Run/)).toBeInTheDocument()
  })
})
