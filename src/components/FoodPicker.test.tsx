import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { FoodPicker } from './FoodPicker'

beforeEach(() => localStorage.clear())

describe('FoodPicker', () => {
  it('lists predefined foods under All and filters by search', () => {
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    expect(screen.getByText(/Rice/i)).toBeInTheDocument()
  })
  it('All includes My Foods', () => {
    const myFood = { id: 'my1', name: 'ZebraCake', icon: '🍰', source: 'custom', createdAt: '',
      servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: { calories: 100 } }
    localStorage.setItem('cc.myFoods', JSON.stringify([myFood]))
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zebra' } })
    expect(screen.getByText(/ZebraCake/)).toBeInTheDocument()
  })
  it('the New My Food button is visible on both tabs', () => {
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    expect(screen.getByTestId('new-food')).toBeInTheDocument() // All tab
    fireEvent.click(screen.getByText(/My Foods/))
    expect(screen.getByTestId('new-food')).toBeInTheDocument() // My Foods tab
  })
  it('has no add-counter next to the search box', () => {
    const { container } = render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    const header = container.querySelector('.modal .row.spread')!
    expect(header.textContent).not.toMatch(/^0/)
  })
  it('tapping a food row opens the detail view', () => {
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-row')[0])
    expect(screen.getByTestId('food-detail-cals')).toBeInTheDocument()
    expect(screen.getByTestId('food-detail-edit')).toBeInTheDocument()
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
