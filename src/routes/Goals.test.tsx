import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Goals from './Goals'

describe('Goals', () => {
  it('edits the daily budget and persists it', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('budget-input'), { target: { value: '2012' } })
    expect(JSON.parse(localStorage.getItem('cc.settings')!).dailyBudget).toBe(2012)
  })
  it('goal weight input stores kg and clears to null', () => {
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('goal-weight'), { target: { value: '80' } })
    expect(JSON.parse(localStorage.getItem('cc.settings')!).goalWeightKg).toBe(80)
  })
  it('clearing the goal weight stores null', () => {
    localStorage.setItem('cc.settings', JSON.stringify({ goalWeightKg: 80 }))
    render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('goal-weight'), { target: { value: '' } })
    fireEvent.blur(screen.getByTestId('goal-weight'))
    expect(JSON.parse(localStorage.getItem('cc.settings')!).goalWeightKg).toBeNull()
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
    // 75kg → cut carbs 2.5–3.5 / 1.5 / 0.8 → 188–263g carbs, calories 1740–2040kcal
    // 75kg → bulk 4/2/1 → 300/150/75g, calories 2475kcal
    const enter = (id: string, v: string) => {
      const el = screen.getByTestId(id)
      fireEvent.focus(el)
      fireEvent.change(el, { target: { value: v } })
    }
    enter('cut-weight', '75')
    enter('bulk-weight', '75')
    // ready values render as "<value><unit>"; unset fields stay "—" (no unit)
    expect(screen.getByText('1740–2040kcal')).toBeInTheDocument()  // cut calories range
    expect(screen.getByText('188–263g')).toBeInTheDocument()      // cut carbs range
    expect(screen.getByText('113g')).toBeInTheDocument()         // cut protein
    expect(screen.getByText('60g')).toBeInTheDocument()          // cut fat
    expect(screen.getByText('2475kcal')).toBeInTheDocument()     // bulk calories
    expect(screen.getByText('300g')).toBeInTheDocument()         // bulk carbs
    expect(screen.getByText('150g')).toBeInTheDocument()         // bulk protein
  })
  it('advice readouts render advice-item and advice-label for each metric', () => {
    const { container } = render(<AppProvider><Goals /></AppProvider>)
    const readouts = container.querySelectorAll('.advice-readout')
    expect(readouts).toHaveLength(2)
    for (const readout of readouts) {
      const items = readout.querySelectorAll('.advice-item')
      expect(items).toHaveLength(4)
      const labels = readout.querySelectorAll('.advice-label')
      expect(labels).toHaveLength(4)
    }
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
  it('no longer renders the weight trend chart (it moved to the dashboard)', () => {
    render(<AppProvider><Goals /></AppProvider>)
    expect(screen.queryByText('Weight Trend')).toBeNull()
    expect(screen.queryByTestId('weight-trend-svg')).toBeNull()
    expect(screen.getByTestId('budget-input')).toBeInTheDocument()
  })
  it('offers settings export/import buttons in the data card', () => {
    render(<AppProvider><Goals /></AppProvider>)
    expect(screen.getByTestId('export-settings')).toBeInTheDocument()
    expect(screen.getByTestId('import-settings')).toBeInTheDocument()
  })
  it('importing a hand-edited settings file replaces the stored blob', async () => {
    // stored legacy value 1.2 — the import must override it wholesale
    localStorage.setItem('cc.settings', JSON.stringify({ macroRanges: { protein: { min: 1.2, max: 2.2 } } }))
    render(<AppProvider><Goals /></AppProvider>)
    const input = screen.getByTestId('import-settings').querySelector('input')!
    const file = new File(
      [JSON.stringify({ macroRanges: { protein: { min: 1.0, max: 2.2 } } })],
      'settings.json', { type: 'application/json' },
    )
    await userEvent.upload(input, file)
    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('cc.settings')!)
      expect(s.macroRanges.protein).toEqual({ min: 1.0, max: 2.2 }) // overridden
    })
    const s = JSON.parse(localStorage.getItem('cc.settings')!)
    expect(s.macroRanges.carbs).toEqual({ min: 2.5, max: 4 }) // backfilled
    expect(s.dailyBudget).toBe(2248) // default kept
  })
  it('importing a malformed settings file shows the error message and stores nothing', async () => {
    localStorage.setItem('cc.settings', JSON.stringify({ macroRanges: { protein: { min: 1.2, max: 2.2 } } }))
    render(<AppProvider><Goals /></AppProvider>)
    const input = screen.getByTestId('import-settings').querySelector('input')!
    await userEvent.upload(input, new File(['nope'], 'settings.json', { type: 'application/json' }))
    await waitFor(() => expect(screen.getByText(/Import failed/)).toBeInTheDocument())
    const s = JSON.parse(localStorage.getItem('cc.settings')!)
    expect(s.macroRanges.protein.min).toBe(1.2) // untouched by the failed import
  })

  // Two-way macro auto-calc. Budget ↔ 3 macros (carbs/protein/fat) by the
  // 3.5:1.5:0.8 ratio; fiber is manual and never affects the budget.
  it('advice-card weight blanks a zero on focus (same clear-on-focus as food detail)', () => {
    render(<AppProvider><Goals /></AppProvider>)
    const w = screen.getByTestId('cut-weight')
    expect(w).toHaveValue(0)
    fireEvent.focus(w)
    expect(w).toHaveValue(null)
    fireEvent.blur(w)
    expect(w).toHaveValue(0)
  })
  it('advice-card weights survive a page switch, persisted like the macro targets', () => {
    const first = render(<AppProvider><Goals /></AppProvider>)
    fireEvent.change(screen.getByTestId('cut-weight'), { target: { value: '70' } })
    fireEvent.change(screen.getByTestId('bulk-weight'), { target: { value: '72' } })
    const stored = JSON.parse(localStorage.getItem('cc.settings')!)
    expect(stored.adviceCutWeightKg).toBe(70)
    expect(stored.adviceBulkWeightKg).toBe(72)
    // leave the page (unmount) and come back — values must survive
    first.unmount()
    render(<AppProvider><Goals /></AppProvider>)
    expect(screen.getByTestId('cut-weight')).toHaveValue(70)
    expect(screen.getByTestId('bulk-weight')).toHaveValue(72)
  })
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

  describe('body profile and scientific BMI recommendations', () => {
    it('allows entering height and gender and persists them', () => {
      render(<AppProvider><Goals /></AppProvider>)
      const heightInput = screen.getByTestId('height-input')
      fireEvent.change(heightInput, { target: { value: '175' } })
      expect(JSON.parse(localStorage.getItem('cc.settings')!).heightCm).toBe(175)

      const maleBtn = screen.getByTestId('gender-male')
      fireEvent.click(maleBtn)
      expect(JSON.parse(localStorage.getItem('cc.settings')!).gender).toBe('male')

      const femaleBtn = screen.getByTestId('gender-female')
      fireEvent.click(femaleBtn)
      expect(JSON.parse(localStorage.getItem('cc.settings')!).gender).toBe('female')
    })

    it('populates current weight from weigh-ins and allows editing it', () => {
      // Day log with a recorded weight
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('cc.days', JSON.stringify({
        [today]: { date: today, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], weightKg: 70 },
      }))

      render(<AppProvider><Goals /></AppProvider>)
      const weightInput = screen.getByTestId('current-weight-input')
      expect(weightInput).toHaveValue(70)

      // Editing current weight updates today's weigh-in
      fireEvent.change(weightInput, { target: { value: '72' } })
      expect(weightInput).toHaveValue(72)
      const storedDays = JSON.parse(localStorage.getItem('cc.days')!)
      expect(storedDays[today].weightKg).toBe(72)
    })

    it('displays BMI, category badge, and ideal weight tooltip when height and weight are provided', () => {
      localStorage.setItem('cc.settings', JSON.stringify({ heightCm: 175, gender: 'male' }))
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('cc.days', JSON.stringify({
        [today]: { date: today, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], weightKg: 70 },
      }))

      render(<AppProvider><Goals /></AppProvider>)
      // 70 / (1.75^2) = 22.9 (normal)
      expect(screen.getByTestId('bmi-value')).toHaveTextContent('22.9')
      expect(screen.getByTestId('bmi-badge')).toBeInTheDocument()
      // BMI info tip containing ideal weight range
      const bmiTipBtn = screen.getByTestId('bmi-info-tip')
      expect(bmiTipBtn).toBeInTheDocument()
      fireEvent.click(bmiTipBtn)
      expect(screen.getByTestId('bmi-tip-content')).toHaveTextContent(/56.7 – 73.2 kg/)

      // BMR for male 175cm 70kg age 30 = 1649 kcal
      expect(screen.getByTestId('bmr-value')).toHaveTextContent('1649 kcal')
    })

    it('displays waist measurement guidance tooltip next to waist input label', () => {
      render(<AppProvider><Goals /></AppProvider>)
      const waistTipBtn = screen.getByTestId('waist-info-tip')
      expect(waistTipBtn).toBeInTheDocument()
      fireEvent.click(waistTipBtn)
      expect(screen.getByTestId('waist-tip-content')).toBeInTheDocument()
    })

    it('provides quick button to apply ideal weight upper bound or recommended target weight', () => {
      localStorage.setItem('cc.settings', JSON.stringify({ heightCm: 175, gender: 'male', goalWeightKg: null }))
      const today = new Date().toISOString().slice(0, 10)
      // 85kg -> BMI 27.8 (overweight)
      localStorage.setItem('cc.days', JSON.stringify({
        [today]: { date: today, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], weightKg: 85 },
      }))

      render(<AppProvider><Goals /></AppProvider>)
      const applyBtn = screen.getByTestId('apply-ideal-weight-btn')
      expect(applyBtn).toBeInTheDocument()
      fireEvent.click(applyBtn)

      // The goal weight input should now be updated to 73.2 kg (ideal max)
      const s = JSON.parse(localStorage.getItem('cc.settings')!)
      expect(s.goalWeightKg).toBe(73.2)
      expect(screen.getByTestId('goal-weight')).toHaveValue(73.2)
    })

    it('allows entering waistline and body fat percentage and persists them', () => {
      render(<AppProvider><Goals /></AppProvider>)
      const waistInput = screen.getByTestId('waist-input')
      fireEvent.change(waistInput, { target: { value: '82' } })
      expect(JSON.parse(localStorage.getItem('cc.settings')!).waistCm).toBe(82)

      const bodyFatInput = screen.getByTestId('body-fat-input')
      fireEvent.change(bodyFatInput, { target: { value: '15' } })
      expect(JSON.parse(localStorage.getItem('cc.settings')!).bodyFatPct).toBe(15)
    })

    it('corrects overweight BMI to athletic / high muscle when waist is lean or body fat is low', () => {
      // 175cm, 82kg (BMI 26.8, normally overweight), male with waist 81cm (< 85cm)
      localStorage.setItem('cc.settings', JSON.stringify({ heightCm: 175, gender: 'male', waistCm: 81 }))
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('cc.days', JSON.stringify({
        [today]: { date: today, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], weightKg: 82 },
      }))

      render(<AppProvider><Goals /></AppProvider>)
      expect(screen.getByTestId('bmi-value')).toHaveTextContent('26.8')
      const badge = screen.getByTestId('bmi-badge')
      expect(badge).toHaveClass('athletic')
      expect(screen.getByTestId('athletic-note')).toBeInTheDocument()
    })
  })
})

