import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Goals from './Goals'

describe('Goals', () => {
  it('edits the daily budget and persists it', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('budget-input'), { target: { value: '2012' } })
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(2012)
  })
  it('edits carbs and fat targets and persists them', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('carbs-target'), { target: { value: '300' } })
    fireEvent.change(screen.getByTestId('fat-target'), { target: { value: '70' } })
    const mt = JSON.parse(localStorage.getItem('cc.settings')!).macroTargets
    expect(mt.carbs).toBe(300)
    expect(mt.fat).toBe(70)
  })
  it('clearing the field shows empty, then typing yields "1" not "01"', () => {
    render(<AppProvider><Goals /></AppProvider>)
    const input = screen.getByTestId('budget-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })   // clear the field
    expect(input).toHaveValue(null)                       // stays empty while editing (no forced "0")
    fireEvent.change(input, { target: { value: '1' } })   // type 1 → "1", not "01"
    expect(input).toHaveValue(1)
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(1)
    fireEvent.blur(input)
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(1)
  })
  it('blurring an empty field normalizes it to 0', () => {
    render(<AppProvider><Goals /></AppProvider>)
    const input = screen.getByTestId('budget-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(input).toHaveValue(0)
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(0)
  })
  it('advice cards derive read-only macros from weight', () => {
    render(<AppProvider><Goals /></AppProvider>)
    // 75kg → cut 3.5/1.5/0.8 → 263/113/60g, calories 2040
    // 75kg → bulk 4/2/1 → 300/150/75g, calories 2475
    const enter = (id: string, v: string) => {
      const el = screen.getByTestId(id)
      fireEvent.focus(el)
      fireEvent.change(el, { target: { value: v } })
    }
    enter('cut-weight', '75')
    enter('bulk-weight', '75')
    // ready values render as "<value><unit>"; unset fields stay "—" (no unit)
    expect(screen.getByText('2040kcal')).toBeInTheDocument()  // cut calories
    expect(screen.getByText('263g')).toBeInTheDocument()     // cut carbs
    expect(screen.getByText('113g')).toBeInTheDocument()    // cut protein
    expect(screen.getByText('60g')).toBeInTheDocument()     // cut fat
    expect(screen.getByText('2475kcal')).toBeInTheDocument() // bulk calories
    expect(screen.getByText('300g')).toBeInTheDocument()    // bulk carbs
    expect(screen.getByText('150g')).toBeInTheDocument()     // bulk protein
  })
  it('the info-tip toggles open and closes on outside click', () => {
    render(<AppProvider><Goals /></AppProvider>)
    const tip = screen.getAllByRole('button', { name: /Fat-loss Advice|Muscle-gain Advice/ })[0]
    // closed initially
    expect(screen.queryByText(/Quota \(daily intake per kg body weight\)/)).toBeNull()
    fireEvent.click(tip)
    expect(screen.getAllByText(/Quota \(daily intake per kg body weight\)/).length).toBeGreaterThan(0)
    // clicking outside the tip closes it
    fireEvent.pointerDown(document.body)
    expect(screen.queryByText(/Quota \(daily intake per kg body weight\)/)).toBeNull()
  })

  // Two-way macro auto-calc. Budget ↔ 3 macros (carbs/protein/fat) by the
  // 3.5:1.5:0.8 ratio; fiber is manual and never affects the budget.
  describe('macro auto-calc', () => {
    it('editing the budget redistributes carbs/protein/fat by 3.5:1.5:0.8 and keeps the budget as typed', () => {
      render(<AppProvider><Goals /></AppProvider>)
      const budget = screen.getByTestId('budget-input')
      fireEvent.focus(budget)
      fireEvent.change(budget, { target: { value: '2275' } })
      const s = JSON.parse(localStorage.getItem('cc.settings')!)
      // budget unchanged as typed
      expect(s.dailyBudget).toBe(2275)
      // macros redistributed by the ratio (±1g, drift <= 2)
      const { carbs, protein, fat } = s.macroTargets
      const recompute = 4 * carbs + 4 * protein + 9 * fat
      expect(Math.abs(recompute - 2275)).toBeLessThanOrEqual(2)
      // fiber preserved (default 30), untouched by a budget edit
      expect(s.macroTargets.fiber).toBe(30)
    })
    it('editing carbs recomputes the budget exactly and leaves protein/fat/fiber alone', () => {
      render(<AppProvider><Goals /></AppProvider>)
      const carbs = screen.getByTestId('carbs-target')
      fireEvent.focus(carbs)
      fireEvent.change(carbs, { target: { value: '300' } })
      const s = JSON.parse(localStorage.getItem('cc.settings')!)
      // budget = 4*carbs + 4*protein + 9*fat, using the new carbs + the other two as-is
      const { protein, fat } = s.macroTargets
      expect(s.dailyBudget).toBe(4 * 300 + 4 * protein + 9 * fat)
      expect(s.macroTargets.carbs).toBe(300)
      // protein/fat/fiber unchanged from defaults (120/72/30)
      expect(s.macroTargets.protein).toBe(120)
      expect(s.macroTargets.fat).toBe(72)
      expect(s.macroTargets.fiber).toBe(30)
    })
    it('editing fiber changes only fiber (no budget or other macro recompute)', () => {
      render(<AppProvider><Goals /></AppProvider>)
      const fiber = screen.getByTestId('fiber-target')
      fireEvent.focus(fiber)
      fireEvent.change(fiber, { target: { value: '45' } })
      const s = JSON.parse(localStorage.getItem('cc.settings')!)
      expect(s.macroTargets.fiber).toBe(45)
      // budget and other macros stay at their defaults
      expect(s.dailyBudget).toBe(2248)
      expect(s.macroTargets.carbs).toBe(280)
      expect(s.macroTargets.protein).toBe(120)
      expect(s.macroTargets.fat).toBe(72)
    })
  })
})
