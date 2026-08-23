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
  it('edits carbs and fat targets and persists them', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('carbs-target'), { target: { value: '300' } })
    fireEvent.change(screen.getByTestId('fat-target'), { target: { value: '70' } })
    const mt = JSON.parse(localStorage.getItem('cc.settings')!).macroTargets
    expect(mt.carbs).toBe(300)
    expect(mt.fat).toBe(70)
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
  it('advice cards derive read-only macros from weight', () => {
    render(<AppProvider><Goals /></AppProvider>)
    // 75kg → cut 3.5/1.5/0.8 → 263/113/60g, calories 2040
    // 75kg → bulk 4/2/1 → 300/150/75g, calories 2475
    const enter = (id: string, v: string) => {
      const el = screen.getByTestId(id)
      fireEvent.focus(el)
      fireEvent.change(el, { target: { value: v } })
    }
    enter('cut-weight', '75')
    enter('bulk-weight', '75')
    // unique computed values (avoid the weight "75" itself, shown in the input)
    expect(screen.getByText('2040')).toBeInTheDocument()   // cut calories
    expect(screen.getByText('263')).toBeInTheDocument()    // cut carbs
    expect(screen.getByText('113')).toBeInTheDocument()    // cut protein
    expect(screen.getByText('60')).toBeInTheDocument()     // cut fat
    expect(screen.getByText('2475')).toBeInTheDocument()   // bulk calories
    expect(screen.getByText('300')).toBeInTheDocument()     // bulk carbs
    expect(screen.getByText('150')).toBeInTheDocument()    // bulk protein
  })
})
