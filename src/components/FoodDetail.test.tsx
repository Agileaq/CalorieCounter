import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { FoodDetail } from './FoodDetail'
import type { Food } from '../types'

function mkFood(partial: Partial<Food> = {}): Food {
  return {
    id: 'f1', name: 'Rice', icon: '🍚', source: 'predefined', createdAt: '',
    servings: [{ id: 's1', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
    nutrition: {
      calories: 130, fat: { total: 3.6, mono: 1, poly: 1, saturated: 1.2, trans: 0 },
      cholesterol: 275, sodium: 69, carbs: { total: 3.9, fiber: 1, sugar: 2 }, protein: 20.4,
      vitamins: { a: 0, c: 0, b1: 0, b2: 0, b3: 0, b9: 0, b6: 0, b12: 0 },
      minerals: { calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, zinc: 0 },
      caffeine: 0,
    },
    ...partial,
  }
}

beforeEach(() => localStorage.clear())

describe('FoodDetail', () => {
  it('shows derived calories big plus the macro rows', () => {
    render(<AppProvider><FoodDetail food={mkFood()} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    // fat 3.6×9 + carbs 3.9×4 + protein 20.4×4 = 129.6 → 130
    expect(screen.getByTestId('food-detail-cals')).toHaveTextContent('130')
    expect(screen.getByText('Total Fat')).toBeInTheDocument()
    expect(screen.getByText('3.6g')).toBeInTheDocument()
    expect(screen.getByText('20.4g')).toBeInTheDocument()
  })
  it('the full nutrition label is hidden until expanded', () => {
    render(<AppProvider><FoodDetail food={mkFood()} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    expect(screen.queryByText(/Vitamin B12/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('food-detail-full'))
    expect(screen.getByText(/Vitamin B12/)).toBeInTheDocument()
  })
  it('✓ opens the quantity sheet and confirms an entry', () => {
    const onAdd = vi.fn()
    render(<AppProvider><FoodDetail food={mkFood()} onAdd={onAdd} onClose={() => {}} /></AppProvider>)
    fireEvent.click(screen.getByTestId('food-detail-add'))
    fireEvent.click(screen.getByTestId('qty-confirm'))
    expect(onAdd).toHaveBeenCalled()
  })
  it('editing a predefined food stores an override under the same id and source', () => {
    render(<AppProvider><FoodDetail food={mkFood()} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.click(screen.getByTestId('food-detail-edit'))
    fireEvent.change(screen.getByTestId('food-name'), { target: { value: 'Rice v2' } })
    fireEvent.click(screen.getByTestId('food-save'))
    const overs = JSON.parse(localStorage.getItem('cc.foodOverrides')!)
    expect(overs.f1.name).toBe('Rice v2')
    expect(overs.f1.source).toBe('predefined')
  })
  it('editing a custom food updates My Foods in place', () => {
    localStorage.setItem('cc.myFoods', JSON.stringify([mkFood({ id: 'm1', source: 'custom' })]))
    render(<AppProvider><FoodDetail food={mkFood({ id: 'm1', source: 'custom' })} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.click(screen.getByTestId('food-detail-edit'))
    fireEvent.change(screen.getByTestId('food-name'), { target: { value: 'Mine v2' } })
    fireEvent.click(screen.getByTestId('food-save'))
    const mine = JSON.parse(localStorage.getItem('cc.myFoods')!)
    expect(mine[0].name).toBe('Mine v2')
    expect(localStorage.getItem('cc.foodOverrides')).toBeNull()
  })
  it('predefined foods offer no delete button', () => {
    render(<AppProvider><FoodDetail food={mkFood()} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    expect(screen.queryByTestId('food-detail-delete')).not.toBeInTheDocument()
  })
  it('deleting a custom food asks for confirmation and removes it', () => {
    localStorage.setItem('cc.myFoods', JSON.stringify([mkFood({ id: 'm1', source: 'custom' })]))
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AppProvider><FoodDetail food={mkFood({ id: 'm1', source: 'custom' })} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.click(screen.getByTestId('food-detail-delete'))
    expect(spy).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('cc.myFoods')!)).toHaveLength(0)
    spy.mockRestore()
  })
  it('an overridden predefined food offers reset, which restores the original', () => {
    localStorage.setItem('cc.foodOverrides', JSON.stringify({ f1: mkFood({ name: 'Rice v2' }) }))
    render(<AppProvider><FoodDetail food={mkFood({ name: 'Rice v2' })} onAdd={() => {}} onClose={() => {}} /></AppProvider>)
    fireEvent.click(screen.getByTestId('food-detail-reset'))
    expect(JSON.parse(localStorage.getItem('cc.foodOverrides')!)).toEqual({})
  })
})
