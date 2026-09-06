import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { WeightCard } from './WeightCard'
import { todayKey } from '../lib/date'

function seedWeight(weightKg: number | null, tags?: string[]) {
  const day: any = { date: todayKey(), meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [] }
  if (weightKg != null) day.weightKg = weightKg
  if (tags) day.tags = tags
  localStorage.setItem('cc.days', JSON.stringify({ [todayKey()]: day }))
}

const storedDay = () => JSON.parse(localStorage.getItem('cc.days')!)[todayKey()]

beforeEach(() => localStorage.clear())

describe('WeightCard', () => {
  it('kg input stores kg on the selected day', async () => {
    seedWeight(null)
    render(<AppProvider><WeightCard /></AppProvider>)
    const input = screen.getByTestId('weight-input')
    await userEvent.type(input, '82.5')
    expect(storedDay().weightKg).toBe(82.5)
  })
  it('input shows the stored weight in kg', () => {
    seedWeight(82.5)
    render(<AppProvider><WeightCard /></AppProvider>)
    expect(screen.getByTestId('weight-input')).toHaveValue(82.5)
  })
  it('clearing the input deletes the weight record', async () => {
    seedWeight(82.5)
    render(<AppProvider><WeightCard /></AppProvider>)
    await userEvent.clear(screen.getByTestId('weight-input'))
    expect('weightKg' in storedDay()).toBe(false)
  })
  it('tags multi-toggle and un-toggle, dropping the field when empty', async () => {
    seedWeight(82.5, ['cheat'])
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
