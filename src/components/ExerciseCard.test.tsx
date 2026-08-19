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
  it('offers the four localized presets in the dropdown', () => {
    render(<AppProvider><ExerciseCard /></AppProvider>)
    const options = screen.getByTestId('exercise-name').getAttribute('list')!
    const list = document.getElementById(options)!
    const values = Array.from(list.querySelectorAll('option')).map(o => o.getAttribute('value'))
    expect(values).toEqual(['Strength training', 'Walking', 'Running', 'Swimming'])
  })
  it('can add a custom-typed exercise name', () => {
    render(<AppProvider><ExerciseCard /></AppProvider>)
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
