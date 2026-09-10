import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { ExerciseCard } from './ExerciseCard'
import { useApp } from '../state/useApp'

function TagProbe() {
  const { day } = useApp()
  return <span data-testid="probe-tags">{JSON.stringify(day.tags ?? null)}</span>
}

describe('ExerciseCard', () => {
  it('defaults the name to the localized "Strength training" preset', () => {
    render(<AppProvider><ExerciseCard /></AppProvider>)
    expect(screen.getByTestId('exercise-name')).toHaveValue('Strength training')
  })
  it('opening the dropdown always shows all four presets, even when the field is non-empty', () => {
    render(<AppProvider><ExerciseCard /></AppProvider>)
    // the field already holds the default "Strength training" — not empty —
    // yet the dropdown must still offer every preset, unfiltered.
    fireEvent.click(screen.getByTestId('exercise-name-toggle'))
    const options = screen.getAllByTestId('exercise-preset').map(b => b.textContent)
    expect(options).toEqual(['Strength training', 'Walking', 'Running', 'Swimming'])
  })
  it('selecting a preset fills the field; typing a custom name still works', () => {
    render(<AppProvider><ExerciseCard /></AppProvider>)
    fireEvent.click(screen.getByTestId('exercise-name-toggle'))
    fireEvent.click(screen.getAllByTestId('exercise-preset')[2]) // Running
    expect(screen.getByTestId('exercise-name')).toHaveValue('Running')

    // a custom-typed name is still allowed
    const name = screen.getByTestId('exercise-name')
    fireEvent.change(name, { target: { value: 'Yoga' } })
    const cals = screen.getByTestId('exercise-cals')
    fireEvent.focus(cals)
    fireEvent.change(cals, { target: { value: '90' } })
    fireEvent.click(screen.getByTestId('exercise-add'))
    expect(screen.getByText(/Yoga/)).toBeInTheDocument()
    // after adding, the field resets to the default preset
    expect(screen.getByTestId('exercise-name')).toHaveValue('Strength training')
  })
  it('the entry ✕ matches the food-item ✕ (icon-btn 28×28/14px) and removes the entry', () => {
    render(<AppProvider><ExerciseCard /></AppProvider>)
    const cals = screen.getByTestId('exercise-cals')
    fireEvent.focus(cals)
    fireEvent.change(cals, { target: { value: '90' } })
    fireEvent.click(screen.getByTestId('exercise-add'))
    const x = screen.getByLabelText(/Remove entry|删除条目/i)
    expect(x.className).toBe('icon-btn')
    expect(x.style.width).toBe('28px')
    expect(x.style.height).toBe('28px')
    expect(x.style.fontSize).toBe('14px')
    fireEvent.click(x)
    expect(screen.queryByText(/90/)).not.toBeInTheDocument()
  })

  describe('exercise-tag linkage', () => {
    function mount() {
      return render(<AppProvider><ExerciseCard /><TagProbe /></AppProvider>)
    }
    it('adding the default strength preset lights the strength tag', () => {
      mount()
      fireEvent.click(screen.getByTestId('exercise-add'))
      expect(screen.getByTestId('probe-tags').textContent).toBe('["strength"]')
    })
    it('adding the swimming preset lights the cardio tag', () => {
      mount()
      fireEvent.click(screen.getByTestId('exercise-name-toggle'))
      fireEvent.click(screen.getAllByTestId('exercise-preset')[3]) // Swimming
      fireEvent.click(screen.getByTestId('exercise-add'))
      expect(screen.getByTestId('probe-tags').textContent).toBe('["cardio"]')
    })
    it('typing a custom name clears the preset stamp — no tag', () => {
      mount()
      const name = screen.getByTestId('exercise-name')
      fireEvent.change(name, { target: { value: 'Yoga' } })
      fireEvent.click(screen.getByTestId('exercise-add'))
      expect(screen.getByTestId('probe-tags').textContent).toBe('null')
    })
  })
})
