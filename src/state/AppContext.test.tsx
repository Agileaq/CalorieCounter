import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'
import { newFood, newServing } from '../lib/food'
import { entryNutrition } from '../lib/nutrition'
import { parseBackup } from '../lib/importExport'

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
        app.addEntry('breakfast', { id: 'e1', foodSnapshot: f, servingId: f.servings[0].id, quantity: 2 })
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
    // 130 cal/serving × 2 servings = 260
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

function OverrideProbe() {
  const app = useApp()
  const rice = app.allFoods.find(f => f.id === 'pre-white-rice')!
  return (
    <div>
      <span data-testid="riceCals">{Math.round(rice.nutrition.calories)}</span>
      <button onClick={() => app.overrideFood({ ...rice, nutrition: { ...rice.nutrition, calories: 999 } })}>override</button>
    </div>
  )
}

describe('AppContext overrides', () => {
  beforeEach(() => localStorage.clear())
  it('overrideFood persists and allFoods reflects it on next load', () => {
    const first = render(<AppProvider><OverrideProbe /></AppProvider>)
    act(() => { screen.getByText('override').click() })
    expect(screen.getByTestId('riceCals').textContent).toBe('999')
    expect(JSON.parse(localStorage.getItem('cc.foodOverrides')!)['pre-white-rice'].nutrition.calories).toBe(999)
    first.unmount()
    // a fresh provider must apply the stored override on startup
    render(<AppProvider><OverrideProbe /></AppProvider>)
    expect(screen.getByTestId('riceCals').textContent).toBe('999')
  })
})

function MultiServingProbe() {
  const app = useApp()
  const first = app.myFoods[0]
  return <span data-testid="myServings">{first ? first.servings.length : 0}</span>
}

describe('AppContext collapse', () => {
  beforeEach(() => localStorage.clear())
  it('collapses myFoods loaded from storage to a single serving', () => {
    const twoServings = newFood({ name: 'Zebra' })
    twoServings.servings = [
      { ...newServing(), id: 'p', label: 'Grams', isPrimary: true },
      { ...newServing(), id: 'o', label: 'Cup', isPrimary: false },
    ]
    localStorage.setItem('cc.myFoods', JSON.stringify([twoServings]))
    render(<AppProvider><MultiServingProbe /></AppProvider>)
    expect(screen.getByTestId('myServings').textContent).toBe('1')
  })
})

function HiddenProbe() {
  const app = useApp()
  return (
    <div>
      <span data-testid="foodCount">{app.allFoods.length}</span>
      <span data-testid="riceInAll">{app.allFoods.some(f => f.id === 'pre-white-rice') ? 'yes' : 'no'}
      </span>
      <span data-testid="riceHidden">{app.hiddenFoods['pre-white-rice'] ? 'yes' : 'no'}
      </span>
      <button onClick={() => app.hideFood('pre-white-rice')}>hide</button>
    </div>
  )
}

describe('AppContext hide', () => {
  beforeEach(() => localStorage.clear())
  it('allFoods excludes ids in cc.hiddenFoods loaded from storage', () => {
    localStorage.setItem('cc.hiddenFoods', JSON.stringify({ 'pre-white-rice': true }))
    render(<AppProvider><HiddenProbe /></AppProvider>)
    // rice is one of the predefined foods; with it hidden, it's absent from allFoods
    expect(screen.getByTestId('riceInAll').textContent).toBe('no')
    expect(screen.getByTestId('riceHidden').textContent).toBe('yes')
  })
  it('hideFood adds the id to hiddenFoods and persists to cc.hiddenFoods', () => {
    const before = render(<AppProvider><HiddenProbe /></AppProvider>)
    const countBefore = Number(screen.getByTestId('foodCount').textContent)
    expect(screen.getByTestId('riceInAll').textContent).toBe('yes')
    act(() => { screen.getByText('hide').click() })
    expect(screen.getByTestId('riceHidden').textContent).toBe('yes')
    expect(screen.getByTestId('riceInAll').textContent).toBe('no')
    expect(Number(screen.getByTestId('foodCount').textContent)).toBe(countBefore - 1)
    expect(JSON.parse(localStorage.getItem('cc.hiddenFoods')!)).toEqual({ 'pre-white-rice': true })
    before.unmount()
    // a fresh provider applies the stored hide on startup
    render(<AppProvider><HiddenProbe /></AppProvider>)
    expect(screen.getByTestId('riceHidden').textContent).toBe('yes')
  })
})

// mergeBackup: importing a backup merges by stable ids instead of overwriting.
function MergeProbe({ backup }: { backup: string }) {
  const app = useApp()
  return (
    <div>
      <span data-testid="dayCount">{Object.keys(app.days).length}</span>
      <span data-testid="entryCount">{app.day.meals.breakfast.length + app.day.meals.lunch.length}</span>
      <span data-testid="myFoodCount">{app.myFoods.length}</span>
      <button onClick={() => app.mergeBackup(parseBackup(backup))}>merge</button>
    </div>
  )
}

describe('AppContext mergeBackup', () => {
  beforeEach(() => localStorage.clear())

  it('merging a backup with an overlapping day dedupes entries by id instead of duplicating', () => {
    // existing state: one day with a breakfast entry 'a'
    localStorage.setItem('cc.days', JSON.stringify({
      '2026-01-01': { date: '2026-01-01', meals: { breakfast: [
        { id: 'a', foodSnapshot: newFood({ name: 'Rice' }), servingId: 's', quantity: 1 },
      ], lunch: [], dinner: [], snacks: [] }, exercise: [] },
    }))
    render(<AppProvider><Probe /></AppProvider>)
    act(() => { screen.getByText('log').click() }) // adds entry 'e1' to selectedDate (today) breakfast
    const todayEntries = screen.getByTestId('dayCals').textContent
    expect(todayEntries).toBe('260') // logged 2 servings of 130cal Rice

    // incoming backup has the SAME 'a' on 2026-01-01 (should not dup) plus a new entry 'c'
    const backup = JSON.stringify({
      kind: 'backup', version: 1,
      days: { '2026-01-01': { date: '2026-01-01', meals: { breakfast: [
        { id: 'a', foodSnapshot: newFood({ name: 'Rice' }), servingId: 's', quantity: 1 },
        { id: 'c', foodSnapshot: newFood({ name: 'Egg' }), servingId: 's', quantity: 1 },
      ], lunch: [], dinner: [], snacks: [] }, exercise: [] } },
      myFoods: [], settings: { dailyBudget: 2248, macroTargets: { carbs: 280, protein: 120, fat: 72, fiber: 30 }, language: 'en' },
    })
    const { unmount } = render(<AppProvider><MergeProbe backup={backup} /></AppProvider>)
    act(() => { screen.getByText('merge').click() })
    // 2026-01-01 breakfast: a + c (the incoming 'a' matched the existing 'a', no dup)
    const stored = JSON.parse(localStorage.getItem('cc.days')!)
    const breakfastIds = stored['2026-01-01'].meals.breakfast.map((e: any) => e.id).sort()
    expect(breakfastIds).toEqual(['a', 'c'])
    unmount()
  })
})
