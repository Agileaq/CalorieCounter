import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { StatCard } from './StatCard'

const bars = [
  { date: '2026-08-17', value: 100, isToday: false },
  { date: '2026-08-18', value: 300, isToday: false },
  { date: '2026-08-19', value: 50, isToday: true },
  { date: '2026-08-20', value: 0, isToday: false },
  { date: '2026-08-21', value: 0, isToday: false },
  { date: '2026-08-22', value: 0, isToday: false },
  { date: '2026-08-23', value: 0, isToday: false },
]

describe('StatCard', () => {
  it('renders title, gauge value/label, bottom texts and 7 bars', () => {
    render(
      <StatCard title="Protein" gaugeValue={0} gaugeLabel="Under" ratio={0} color="var(--accent)" target={128}
        bottomLeft="0 of 128g" bottomRight="37g avg prior to today" bars={bars} />,
    )
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByTestId('stat-gauge-value')).toHaveTextContent('0')
    expect(screen.getByText('Under')).toBeInTheDocument()
    expect(screen.getByText('0 of 128g')).toBeInTheDocument()
    expect(screen.getByText('37g avg prior to today')).toBeInTheDocument()
    expect(screen.getAllByTestId('stat-bar')).toHaveLength(7)
  })
  it('draws a grey track and target divider for every day, even empty ones', () => {
    render(
      <StatCard title="Fiber" gaugeValue={0} gaugeLabel="Under" ratio={0} color="var(--accent)" target={28}
        bottomLeft="0 of 28g" bottomRight="2g avg prior to today" bars={bars} />,
    )
    expect(screen.getAllByTestId('stat-bar')).toHaveLength(7)
    expect(screen.getAllByTestId('stat-bar-divider')).toHaveLength(7)
    expect(screen.getAllByTestId('stat-bar-fill')).toHaveLength(3)
  })
  it('fill reaches the divider exactly at target and enters the over-zone beyond it', () => {
    render(
      <StatCard title="Carbs" gaugeValue={0} gaugeLabel="Under" ratio={0} color="var(--accent)" target={100}
        bottomLeft="" bottomRight="" bars={bars} />,
    )
    const fills = screen.getAllByTestId('stat-bar-fill')
    expect(fills[0].style.height).toBe('82px') // 100 = target → stops at divider
    expect(fills[1].style.height).toBe('82px') // 300 = 3x target → under part capped at divider
    expect(fills[2].style.height).toBe('41px') // 50 = half target
    // the over-target part renders red above the divider
    const overs = screen.getAllByTestId('stat-bar-over')
    expect(overs).toHaveLength(1)
    expect(overs[0].style.height).toBe('14px')
    expect(overs[0].style.background).toBe('var(--red)')
  })
  it('every bar uses the card colour below the divider, regardless of day', () => {
    // bars: [0]=100 at target (not today), [1]=300 over target (not today),
    // [2]=50 under target (today). All under-zones take the card colour; only the
    // over-target cap is red. The selected day is distinguished by its bold label,
    // not by bar colour.
    render(
      <StatCard title="Carbs" gaugeValue={0} gaugeLabel="Under" ratio={0} color="var(--accent)" target={100}
        bottomLeft="" bottomRight="" bars={bars} />,
    )
    const fills = screen.getAllByTestId('stat-bar-fill')
    expect(fills[0].style.background).toBe('var(--accent)') // at-target, not today → card colour
    expect(fills[1].style.background).toBe('var(--accent)') // over-target, not today → card colour
    expect(fills[2].style.background).toBe('var(--accent)') // today → card colour
    // over-target cap still red
    const overs = screen.getAllByTestId('stat-bar-over')
    expect(overs).toHaveLength(1)
    expect(overs[0].style.background).toBe('var(--red)')
  })
  it('the ring shows a target notch at 80% of the sweep', () => {
    render(
      <StatCard title="Protein" gaugeValue={50} gaugeLabel="Under" ratio={0.5} color="var(--accent)" target={100}
        bottomLeft="" bottomRight="" bars={bars} />,
    )
    expect(screen.getByTestId('stat-ring-notch')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-ring-over')).not.toBeInTheDocument()
  })
  it('the ring draws a red over-segment past the notch when over target', () => {
    render(
      <StatCard title="Protein" gaugeValue={150} gaugeLabel="Over" ratio={1.5} color="var(--accent)" target={100}
        bottomLeft="" bottomRight="" bars={bars} />,
    )
    const over = screen.getByTestId('stat-ring-over')
    expect(over.getAttribute('stroke')).toBe('var(--red)')
  })
  it('still draws the divider on every bar when the target is 0', () => {
    render(
      <StatCard title="Protein" gaugeValue={0} gaugeLabel="Under" ratio={0} color="var(--accent)" target={0}
        bottomLeft="0 of 0g" bottomRight="0g avg prior to today" bars={bars} />,
    )
    expect(screen.getAllByTestId('stat-bar-divider')).toHaveLength(7)
    const fills = screen.getAllByTestId('stat-bar-fill')
    expect(fills[1].style.height).toBe('82px') // 300 = week max → reaches divider
  })
  it('with a 0 target the ring still fills, scaled to the week max', () => {
    render(
      <StatCard title="Protein" gaugeValue={300} gaugeLabel="Under" ratio={0} color="var(--accent)" target={0}
        bottomLeft="300 of 0g" bottomRight="" bars={bars} />,
    )
    // gaugeValue 300 = week max → ratio 1 → fill stops at the notch (80%)
    expect(screen.getByTestId('stat-ring-fill')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-ring-over')).not.toBeInTheDocument()
  })
  it('clicking a bar calls onBarClick with that bar\'s date', () => {
    const onBarClick = vi.fn()
    render(
      <StatCard title="Protein" gaugeValue={0} gaugeLabel="Under" ratio={0} color="var(--accent)" target={100}
        bottomLeft="" bottomRight="" bars={bars} onBarClick={onBarClick} />,
    )
    const btns = screen.getAllByTestId('stat-bar-btn')
    expect(btns).toHaveLength(7)
    fireEvent.click(btns[2]) // bars[2].date === '2026-08-19'
    expect(onBarClick).toHaveBeenCalledWith('2026-08-19')
  })
})
