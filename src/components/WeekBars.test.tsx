import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { WeekBars } from './WeekBars'

const bars = [
  { date: '2026-08-17', value: 100, isToday: false },
  { date: '2026-08-18', value: 300, isToday: false },
  { date: '2026-08-19', value: 50, isToday: true },
  { date: '2026-08-20', value: 0, isToday: false },
  { date: '2026-08-21', value: 0, isToday: false },
  { date: '2026-08-22', value: 0, isToday: false },
  { date: '2026-08-23', value: 0, isToday: false },
]

describe('WeekBars', () => {
  it('renders 7 bars; fills scale with barHeight (under zone 55px at the 64px default)', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    expect(screen.getAllByTestId('week-bar')).toHaveLength(7)
    const fills = screen.getAllByTestId('week-bar-fill')
    expect(fills).toHaveLength(3)
    expect(fills[0].style.height).toBe('55px')   // at target → divider level
    expect(fills[1].style.height).toBe('55px')   // 3× target → under part capped
    expect(fills[2].style.height).toBe('27.5px') // half target
  })
  it('draws the red over-cap above the divider level for over-target days', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    const overs = screen.getAllByTestId('week-bar-over')
    expect(overs).toHaveLength(1)
    expect(overs[0].style.height).toBe('9px')
    expect(overs[0].style.background).toBe('var(--red)')
  })
  it('renders the full-width dashed budget line layered above the track but below fills', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    const line = screen.getByTestId('week-budget-line')
    expect(line.style.zIndex).toBe('1')
    const fill = screen.getAllByTestId('week-bar-fill')[0]
    expect(Number(fill.style.zIndex)).toBeGreaterThan(Number(line.style.zIndex))
  })
  it('no budget line and week-max-scaled fills when target is 0', () => {
    render(<WeekBars bars={bars} target={0} color="var(--accent)" />)
    expect(screen.queryByTestId('week-budget-line')).toBeNull()
    const fills = screen.getAllByTestId('week-bar-fill')
    expect(fills[1].style.height).toBe('55px') // 300 = week max → full under zone
  })
  it('clicking a bar calls onBarClick with its date; the today label is bold', () => {
    const onBarClick = vi.fn()
    render(<WeekBars bars={bars} target={100} color="var(--accent)" onBarClick={onBarClick} />)
    const btns = screen.getAllByTestId('week-bar-btn')
    expect(btns).toHaveLength(7)
    fireEvent.click(btns[2])
    expect(onBarClick).toHaveBeenCalledWith('2026-08-19')
    expect(btns[2].querySelector('span')).toHaveStyle({ fontWeight: 700 }) // bold lives on the day-label span (StatCard parity)
  })
  it('without onBarClick the buttons are disabled', () => {
    render(<WeekBars bars={bars} target={100} color="var(--accent)" />)
    for (const b of screen.getAllByTestId('week-bar-btn')) expect(b).toBeDisabled()
  })
})
