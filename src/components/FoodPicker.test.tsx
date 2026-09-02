import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { FoodPicker } from './FoodPicker'

beforeEach(() => localStorage.clear())

// flush any leftover ghost-click guard a prior sheet gesture installed
// (SheetModal swallows the click after a gesture dismiss via a setTimeout)
function flushTimers() {
  return act(async () => { await new Promise(r => setTimeout(r, 1)) })
}

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
  it('the ＋ button opens the food detail (same as tapping the row)', () => {
    const onPick = vi.fn()
    render(<AppProvider><FoodPicker onPick={onPick} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-add')[0])
    expect(screen.getByTestId('food-detail-cals')).toBeInTheDocument()
    expect(screen.getByTestId('food-detail-add')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('food-detail-add'))
    expect(onPick).toHaveBeenCalled()
    expect(onPick.mock.calls[0][0].quantity).toBeGreaterThan(0)
  })
  it('pulling down the FoodDetail closes it back to the picker, not the picker itself', () => {
    const onClose = vi.fn()
    const { container } = render(<AppProvider><FoodPicker onPick={() => {}} onClose={onClose} /></AppProvider>)
    fireEvent.click(screen.getAllByTestId('food-add')[0])
    expect(screen.getByTestId('food-detail-cals')).toBeInTheDocument()
    // the FoodDetail sheet is the second .modal in the tree (above the picker)
    const sheets = container.querySelectorAll('.modal')
    const detail = sheets[sheets.length - 1] as HTMLElement
    fireEvent.touchStart(detail, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(detail, { touches: [{ clientY: 200 }] }) // +100px downward
    fireEvent.touchEnd(detail)
    // detail is gone; picker is still open (its close not called)
    expect(screen.queryByTestId('food-detail-cals')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
  it('uses a leftmost left-arrow back button instead of a close ✕', async () => {
    await flushTimers()
    const onClose = vi.fn()
    const { container } = render(<AppProvider><FoodPicker onPick={() => {}} onClose={onClose} /></AppProvider>)
    const header = container.querySelector('.modal .row.spread')! as HTMLElement
    const back = screen.getByRole('button', { name: /back/i })
    expect(back).toHaveTextContent('←')
    // the back arrow is the first child of the header (leftmost), not after the search input
    expect(header.firstElementChild).toBe(back)
    expect(() => screen.getByRole('button', { name: /close/i })).toThrow()
    fireEvent.click(back)
    expect(onClose).toHaveBeenCalled()
  })
})
