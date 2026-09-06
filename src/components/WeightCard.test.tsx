import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { WeightCard } from './WeightCard'
import { todayKey } from '../lib/date'

function seedWeight(weightKg: number | null, unit: 'kg' | 'lb' = 'kg', tags?: string[]) {
  const day: any = { date: todayKey(), meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [] }
  if (weightKg != null) day.weightKg = weightKg
  if (tags) day.tags = tags
  localStorage.setItem('cc.days', JSON.stringify({ [todayKey()]: day }))
  localStorage.setItem('cc.settings', JSON.stringify({ weightUnit: unit }))
}

const storedDay = () => JSON.parse(localStorage.getItem('cc.days')!)[todayKey()]
const storedUnit = () => JSON.parse(localStorage.getItem('cc.settings')!).weightUnit

beforeEach(() => localStorage.clear())

describe('WeightCard', () => {
  it('kg input stores kg on the selected day', async () => {
    seedWeight(null)
    render(<AppProvider><WeightCard /></AppProvider>)
    const input = screen.getByTestId('weight-input')
    await userEvent.type(input, '82.5')
    expect(storedDay().weightKg).toBe(82.5)
  })
  it('lb input stores kg rounded to 2 decimals', async () => {
    seedWeight(null, 'lb')
    render(<AppProvider><WeightCard /></AppProvider>)
    await userEvent.type(screen.getByTestId('weight-input'), '181.8')
    expect(storedDay().weightKg).toBeCloseTo(82.46, 2)
  })
  it('input displays the stored weight converted to the active unit', () => {
    seedWeight(82.5, 'lb')
    render(<AppProvider><WeightCard /></AppProvider>)
    expect(screen.getByTestId('weight-input')).toHaveValue(181.9) // round1(82.5 × 2.20462)
  })
  it('unit toggle persists globally via settings', async () => {
    seedWeight(null)
    render(<AppProvider><WeightCard /></AppProvider>)
    await userEvent.click(screen.getByTestId('weight-unit-lb'))
    expect(storedUnit()).toBe('lb')
    await userEvent.click(screen.getByTestId('weight-unit-kg'))
    expect(storedUnit()).toBe('kg')
  })
  it('clearing the input deletes the weight record', async () => {
    seedWeight(82.5)
    render(<AppProvider><WeightCard /></AppProvider>)
    await userEvent.clear(screen.getByTestId('weight-input'))
    expect('weightKg' in storedDay()).toBe(false)
  })
  it('tags multi-toggle and un-toggle, dropping the field when empty', async () => {
    seedWeight(82.5, 'kg', ['cheat'])
    render(<AppProvider><WeightCard /></AppProvider>)
    await userEvent.click(screen.getByTestId('weight-tag-strength'))
    expect(storedDay().tags).toEqual(['cheat', 'strength'])
    await userEvent.click(screen.getByTestId('weight-tag-cheat'))
    expect(storedDay().tags).toEqual(['strength'])
    await userEvent.click(screen.getByTestId('weight-tag-strength'))
    expect('tags' in storedDay()).toBe(false)
  })
  it('Enter commits (blurs) the input', async () => {
    seedWeight(null)
    render(<AppProvider><WeightCard /></AppProvider>)
    const input = screen.getByTestId('weight-input')
    input.focus()
    await userEvent.type(input, '82.5')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).not.toHaveFocus()
    expect(storedDay().weightKg).toBe(82.5)
  })
})
