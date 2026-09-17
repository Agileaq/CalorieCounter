import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { NutritionFields } from './NutritionFields'
import { emptyNutrition } from '../lib/nutrition'

describe('NutritionFields', () => {
  it('zero fields blank on focus — typing replaces the 0 instead of appending to it', () => {
    render(<NutritionFields nutrition={emptyNutrition()} onChange={() => {}} />)
    const carbs = screen.getByTestId('nutri-carbs')
    expect(carbs).toHaveValue(0)
    fireEvent.focus(carbs)
    expect(carbs).toHaveValue(null)
  })
  it('blurring an untouched field restores the 0 without committing a change', () => {
    const onChange = vi.fn()
    render(<NutritionFields nutrition={emptyNutrition()} onChange={onChange} />)
    const carbs = screen.getByTestId('nutri-carbs')
    fireEvent.focus(carbs)
    fireEvent.blur(carbs)
    expect(carbs).toHaveValue(0)
    expect(onChange).not.toHaveBeenCalled()
  })
  it('a typed value still commits on each keystroke', () => {
    const onChange = vi.fn()
    render(<NutritionFields nutrition={emptyNutrition()} onChange={onChange} />)
    const protein = screen.getByTestId('nutri-protein')
    fireEvent.focus(protein)
    fireEvent.change(protein, { target: { value: '25' } })
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ protein: 25 }))
  })
})
