import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { FoodPicker } from './FoodPicker'
import { MealCard } from './MealCard'
import { todayKey } from '../lib/date'
import { newId } from '../lib/ids'
import { emptyNutrition } from '../lib/nutrition'
import type { DayLog, LogEntry, MealKey } from '../types'
import { MEAL_KEYS } from '../types'

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
  it('the details button opens the food detail (same as tapping the row)', () => {
    const onPick = vi.fn()
    render(<AppProvider><FoodPicker onPick={onPick} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-detail-open')[0])
    expect(screen.getByTestId('food-detail-cals')).toBeInTheDocument()
    expect(screen.getByTestId('food-detail-add')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('food-detail-add'))
    expect(onPick).toHaveBeenCalled()
    expect(onPick.mock.calls[0][0].quantity).toBeGreaterThan(0)
  })
  it('the fast-add ＋ logs qty 1 immediately without opening detail or closing the picker', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<AppProvider><FoodPicker onPick={onPick} onClose={onClose} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    fireEvent.click(screen.getAllByTestId('food-add')[0])
    // logged with quantity 1, picker never closed, no detail sheet opened
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][0].quantity).toBe(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByTestId('food-detail-cals')).not.toBeInTheDocument()
    // the search input is still there → picker still open
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })
  it('fast-add shows a transient "added" toast that dismisses itself', async () => {
    const onPick = vi.fn()
    render(<AppProvider><FoodPicker onPick={onPick} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    await act(async () => { fireEvent.click(screen.getAllByTestId('food-add')[0]) })
    const toast = await screen.findByTestId('fast-add-toast')
    expect(toast.textContent).toMatch(/added/i)
    // the 1200ms dismiss timer fires on its own; wait for the toast to leave
    await screen.findByTestId('fast-add-toast') // still present immediately
    await act(async () => { await new Promise(r => setTimeout(r, 1400)) })
    expect(screen.queryByTestId('fast-add-toast')).not.toBeInTheDocument()
  })
  it('repeated fast-adds keep the picker open and log each one', () => {
    const onPick = vi.fn()
    render(<AppProvider><FoodPicker onPick={onPick} onClose={() => {}} /></AppProvider>)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    const add = screen.getAllByTestId('food-add')[0]
    fireEvent.click(add); fireEvent.click(add); fireEvent.click(add)
    expect(onPick).toHaveBeenCalledTimes(3)
    expect(onPick.mock.calls.every(c => c[0].quantity === 1)).toBe(true)
  })
  it('pulling down the FoodDetail closes it back to the picker, not the picker itself', () => {
    const onClose = vi.fn()
    const { container } = render(<AppProvider><FoodPicker onPick={() => {}} onClose={onClose} /></AppProvider>)
    fireEvent.click(screen.getAllByTestId('food-detail-open')[0])
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

  // — frequency sort on the All tab —
  function myFood(id: string, name: string) {
    return {
      id, name, icon: '🍽️', source: 'custom' as const, createdAt: '',
      servings: [{ id: 's', kind: 'weight' as const, label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: emptyNutrition(),
    }
  }
  function dayWithEntries(meals: Partial<Record<MealKey, LogEntry[]>>): DayLog {
    const m: Record<MealKey, LogEntry[]> = { breakfast: [], lunch: [], dinner: [], snacks: [] }
    for (const k of MEAL_KEYS) m[k] = meals[k] ?? []
    return { date: todayKey(), meals: m, exercise: [] }
  }
  function loggedEntry(foodId: string): LogEntry {
    return { id: newId(), foodSnapshot: myFood(foodId, foodId), servingId: 's', quantity: 1 }
  }

  it('All tab orders by log frequency (most-logged first) and has no letter headers', () => {
    // "Bbbb" logged twice, "Aaaa" never → Bbbb ranks above Aaaa despite the name order
    localStorage.setItem('cc.myFoods', JSON.stringify([myFood('a', 'Aaaa'), myFood('b', 'Bbbb')]))
    localStorage.setItem('cc.days', JSON.stringify({
      [todayKey()]: dayWithEntries({ breakfast: [loggedEntry('b'), loggedEntry('b')] }),
    }))
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    const names = screen.getAllByTestId('food-row').map(r => r.textContent)
    const bIdx = names.findIndex(n => /Bbbb/.test(n))
    const aIdx = names.findIndex(n => /Aaaa/.test(n))
    expect(bIdx).toBeGreaterThanOrEqual(0)
    expect(aIdx).toBeGreaterThanOrEqual(0)
    expect(bIdx).toBeLessThan(aIdx) // more-logged food first
    // All tab is a flat list — no letter group headers (single-letter "muted" divs)
    expect(screen.queryByText('A')).not.toBeInTheDocument()
    expect(screen.queryByText('B')).not.toBeInTheDocument()
  })

  it('My Foods tab still groups by letter', () => {
    localStorage.setItem('cc.myFoods', JSON.stringify([myFood('a', 'Aaaa'), myFood('b', 'Bbbb')]))
    render(<AppProvider><FoodPicker onPick={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.click(screen.getByText(/My Foods/))
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  // Regression: scroll-lock leak across the stacked-sheet "Add" flow.
  // SheetModal locked the page behind it by saving body.style.overflow into
  // a local const and restoring it on unmount. When FoodDetail (its own
  // SheetModal) opened on top of FoodPicker (another SheetModal) and the user
  // tapped ✓ Add, both sheets unmounted in the same render pass via state
  // updates spread across AppContext + FoodPicker + MealCard. The inner
  // sheet had snapshotted prev='hidden' (the outer already locked the body),
  // so its cleanup restored 'hidden' and clobbered the outer's restore to ''.
  // body.overflow stayed 'hidden' forever — page scroll froze across every
  // tab (bottom-nav taps still worked because overflow doesn't block fixed
  // elements), survived iOS backgrounding, and only cleared after killing
  // the app. This drives the real MealCard→FoodPicker→FoodDetail tree so the
  // cross-component state updates that trigger the bug are exercised.
  it('Add from FoodDetail restores body scroll (no leftover overflow:hidden lock)', () => {
    document.body.style.overflow = '' // start clean, like a fresh page
    render(
      <AppProvider>
        <MealCard meal="breakfast" />
      </AppProvider>,
    )
    // open the picker, then the detail sheet via the magnifier
    fireEvent.click(screen.getByText(/add food/i, { exact: false }))
    fireEvent.click(screen.getAllByTestId('food-detail-open')[0])
    expect(document.body.style.overflow).toBe('hidden') // locked while open

    // the reported freeze trigger: tap Add — unmounts detail AND picker
    act(() => { fireEvent.click(screen.getByTestId('food-detail-add')) })

    expect(document.body.style.overflow).toBe('')
  })
})
