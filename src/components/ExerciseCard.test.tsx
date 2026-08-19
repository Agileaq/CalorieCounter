import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { ExerciseCard } from './ExerciseCard'

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
})
