import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { MealCard } from './MealCard'

describe('MealCard', () => {
  it('adds a food via the picker and shows it with calories', () => {
    render(<AppProvider><MealCard meal="breakfast" /></AppProvider>)
    fireEvent.click(screen.getByText(/Add Food/i))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-detail-open')[0])
    fireEvent.click(screen.getByTestId('food-detail-add'))
    // entry now visible in the card
    expect(screen.getByTestId('meal-total').textContent).toMatch(/\d/)
    expect(screen.getAllByText(/Rice/i).length).toBeGreaterThan(0)
  })
})
