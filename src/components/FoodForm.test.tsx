import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { FoodForm } from './FoodForm'

describe('FoodForm', () => {
  it('requires a name and calories before saving', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('food-save'))
    expect(onSave).not.toHaveBeenCalled() // name empty
  })
  it('saves a new custom food with calories derived from macros', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('food-name'), { target: { value: 'Salad' } })
    fireEvent.change(screen.getByTestId('nutri-fat'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('nutri-carbs'), { target: { value: '20' } })
    fireEvent.change(screen.getByTestId('nutri-protein'), { target: { value: '5' } })
    fireEvent.click(screen.getByTestId('food-save'))
    expect(onSave).toHaveBeenCalled()
    const saved = onSave.mock.calls[0][0]
    expect(saved.name).toBe('Salad')
    expect(saved.nutrition.calories).toBe(190) // 10×9 + 20×4 + 5×4
    expect(saved.source).toBe('custom')
  })
  it('shows the derived calories live and they are not editable', () => {
    render(<FoodForm onSave={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('nutri-protein'), { target: { value: '10' } })
    expect(screen.getByTestId('nutri-calories')).toHaveTextContent('40') // 10×4
    // the calories display is a read-only span, not an input
    expect(screen.getByTestId('nutri-calories').tagName).not.toBe('INPUT')
  })
  it('editing a predefined food keeps its id and source — the caller routes it', () => {
    const onSave = vi.fn()
    const pre = { id: 'pre-x', name: 'Rice', icon: '🍚', source: 'predefined' as const, createdAt: '',
      servings: [{ id: 's', kind: 'weight' as const, label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: { calories: 130, fat:{total:0,mono:0,poly:0,saturated:0,trans:0}, cholesterol: 0, sodium: 0, carbs:{total:0,fiber:0,sugar:0}, protein: 0, vitamins:{a:0,c:0,b1:0,b2:0,b3:0,b9:0,b6:0,b12:0}, minerals:{calcium:0,iron:0,magnesium:0,phosphorus:0,potassium:0,zinc:0}, caffeine: 0 } }
    render(<FoodForm initial={pre} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('food-save'))
    const saved = onSave.mock.calls[0][0]
    expect(saved.id).toBe('pre-x')
    expect(saved.source).toBe('predefined')
  })
  it('uses a left-arrow back button instead of a close ✕', () => {
    const onClose = vi.fn()
    render(<FoodForm onSave={() => {}} onClose={onClose} />)
    const back = screen.getByRole('button', { name: /back/i })
    expect(back).toHaveTextContent('←')
    fireEvent.click(back)
    expect(onClose).toHaveBeenCalled()
  })
  it('renders a single serving row and no add-serving or make-primary controls', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    // exactly one label input and one amount input for the serving
    expect(screen.getByTestId('serving-label')).toBeInTheDocument()
    expect(screen.getByTestId('serving-amount')).toBeInTheDocument()
    // no add-serving button
    expect(() => screen.getByText(/add serving/i)).toThrow()
    // no primary radio (no radio named "primary")
    expect(document.querySelector('input[name="primary"]')).toBeNull()
  })
  it('saves the edited serving label/amount/unit on the single serving', () => {
    const onSave = vi.fn()
    render(<FoodForm onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('food-name'), { target: { value: 'Oats' } })
    fireEvent.change(screen.getByTestId('serving-label'), { target: { value: 'Bowl' } })
    fireEvent.change(screen.getByTestId('serving-amount'), { target: { value: '40' } })
    fireEvent.click(screen.getByTestId('food-save'))
    const saved = onSave.mock.calls[0][0]
    expect(saved.servings).toHaveLength(1)
    expect(saved.servings[0].label).toBe('Bowl')
    expect(saved.servings[0].amount).toBe(40)
    expect(saved.servings[0].isPrimary).toBe(true)
  })
  it('starts a new food with an empty serving row (label/amount/unit) and shows hint placeholders', () => {
    render(<FoodForm onSave={() => {}} onClose={() => {}} />)
    const label = screen.getByTestId('serving-label') as HTMLInputElement
    const amount = screen.getByTestId('serving-amount') as HTMLInputElement
    const unit = screen.getByTestId('serving-unit') as HTMLInputElement
    expect(label.value).toBe('')
    expect(label.placeholder).toBe('label')
    // amount persists as 0 but renders empty so the placeholder shows through
    expect(amount.value).toBe('')
    expect(amount.placeholder).toBe('amount')
    expect(unit.value).toBe('')
    expect(unit.placeholder).toBe('unit')
  })
  it('editing an existing food keeps its prefilled serving label/amount/unit', () => {
    const pre = { id: 'pre-x', name: 'Rice', icon: '🍚', source: 'predefined' as const, createdAt: '',
      servings: [{ id: 's', kind: 'weight' as const, label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
      nutrition: { calories: 130, fat:{total:0,mono:0,poly:0,saturated:0,trans:0}, cholesterol: 0, sodium: 0, carbs:{total:0,fiber:0,sugar:0}, protein: 0, vitamins:{a:0,c:0,b1:0,b2:0,b3:0,b9:0,b6:0,b12:0}, minerals:{calcium:0,iron:0,magnesium:0,phosphorus:0,potassium:0,zinc:0}, caffeine: 0 } }
    render(<FoodForm initial={pre} onSave={() => {}} onClose={() => {}} />)
    const label = screen.getByTestId('serving-label') as HTMLInputElement
    const amount = screen.getByTestId('serving-amount') as HTMLInputElement
    expect(label.value).toBe('Grams')
    expect(amount.value).toBe('100')
  })
})
