import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'
import { newFood } from '../lib/food'
import { entryNutrition } from '../lib/nutrition'

function Probe() {
  const app = useApp()
  return (
    <div>
      <span data-testid="date">{app.selectedDate}</span>
      <span data-testid="foodCount">{app.allFoods.length}</span>
      <span data-testid="dayCals">{Math.round(app.day.meals.breakfast.reduce((s, e) => s + entryNutrition(e).calories, 0))}</span>
      <button onClick={() => app.addMyFood(newFood({ name: 'Test', nutrition: { ...app.allFoods[0].nutrition } }))}>addFood</button>
      <button onClick={() => {
        const f = newFood({ name: 'Rice', nutrition: { ...app.allFoods[0].nutrition, calories: 130 } })
        app.addEntry('breakfast', { id: 'e1', foodSnapshot: f, servingId: f.servings[0].id, quantity: 200 })
      }}>log</button>
    </div>
  )
}

describe('AppContext', () => {
  it('provides predefined foods and logs entries into the selected day', () => {
    render(<AppProvider><Probe /></AppProvider>)
    const before = Number(screen.getByTestId('foodCount').textContent)
    expect(before).toBeGreaterThanOrEqual(15)
    act(() => { screen.getByText('log').click() })
    // 130 cal/100g × 200g = 260
    expect(screen.getByTestId('dayCals').textContent).toBe('260')
  })
  it('addMyFood increases food count and persists', () => {
    render(<AppProvider><Probe /></AppProvider>)
    const before = Number(screen.getByTestId('foodCount').textContent)
    act(() => { screen.getByText('addFood').click() })
    expect(Number(screen.getByTestId('foodCount').textContent)).toBe(before + 1)
    expect(JSON.parse(localStorage.getItem('cc.myFoods')!)).toHaveLength(1)
  })
})
