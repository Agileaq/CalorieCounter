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

  it('clicking an entry opens an editor where quantity can be changed and saved', () => {
    render(<AppProvider><MealCard meal="breakfast" /></AppProvider>)
    // log an entry first
    fireEvent.click(screen.getByText(/Add Food/i))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-detail-open')[0])
    fireEvent.click(screen.getByTestId('food-detail-add'))

    // open the per-entry editor by clicking the entry row
    fireEvent.click(screen.getByTestId('entry-edit'))
    // entry-edit mode shows Save and seeds quantity with the logged value (1)
    const qty = screen.getByTestId('qty-input')
    expect(qty).toHaveValue(1)
    // before edit, subtitle shows the single-template serving line for Rice
    // (predefined White Rice: label Grams, amount 100, unit g; test i18n = en)
    expect(screen.getByTestId('entry-subtitle')).toHaveTextContent('1 serving · 100 g · Grams')
    // bump to 2.5 and save
    fireEvent.change(qty, { target: { value: '2.5' } })
    fireEvent.click(screen.getByTestId('food-detail-save-entry'))
    // editor closes
    expect(screen.queryByTestId('food-detail-save-entry')).not.toBeInTheDocument()
    // the row now reflects the new quantity in the subtitle
    expect(screen.getByTestId('entry-subtitle')).toHaveTextContent('2.5 serving · 250 g · Grams')
  })
})
