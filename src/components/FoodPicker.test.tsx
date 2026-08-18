import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { FoodPicker } from './FoodPicker'

describe('FoodPicker', () => {
  it('lists predefined foods under All and filters by search', () => {
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    expect(screen.getByText(/Rice/i)).toBeInTheDocument()
  })
  it('adding a food opens the quantity sheet and confirms an entry', () => {
    const onPick = vi.fn()
    render(<AppProvider><FoodPicker onPick={onPick} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-add')[0])
    fireEvent.click(screen.getByTestId('qty-confirm'))
    expect(onPick).toHaveBeenCalled()
    expect(onPick.mock.calls[0][0].quantity).toBeGreaterThan(0)
  })
})
