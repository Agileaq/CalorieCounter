import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
      <StatCard title="Protein" gaugeValue={0} gaugeLabel="Under" pct={0} color="var(--accent)" target={128}
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
      <StatCard title="Fiber" gaugeValue={0} gaugeLabel="Under" pct={0} color="var(--accent)" target={28}
        bottomLeft="0 of 28g" bottomRight="2g avg prior to today" bars={bars} />,
    )
    // all 7 days show a full-height capsule and a divider at the target level
    expect(screen.getAllByTestId('stat-bar')).toHaveLength(7)
    expect(screen.getAllByTestId('stat-bar-divider')).toHaveLength(7)
    // only days with data get a fill (3 of 7)
    expect(screen.getAllByTestId('stat-bar-fill')).toHaveLength(3)
  })
  it('fill reaches the divider exactly at target and enters the over-zone beyond it', () => {
    render(
      <StatCard title="Carbs" gaugeValue={0} gaugeLabel="Under" pct={0} color="var(--accent)" target={100}
        bottomLeft="" bottomRight="" bars={bars} />,
    )
    const fills = screen.getAllByTestId('stat-bar-fill')
    // value 100 = 100% of target → fill stops at the divider (82px of the 96px capsule)
    expect(fills[0].style.height).toBe('82px')
    // value 300 = 300% → fill runs to the top of the capsule (96px)
    expect(fills[1].style.height).toBe('96px')
    // value 50 = 50% → half the under-zone (41px)
    expect(fills[2].style.height).toBe('41px')
  })
  it('still draws the divider on every bar when the target is 0', () => {
    render(
      <StatCard title="Protein" gaugeValue={0} gaugeLabel="Under" pct={0} color="var(--accent)" target={0}
        bottomLeft="0 of 0g" bottomRight="0g avg prior to today" bars={bars} />,
    )
    expect(screen.getAllByTestId('stat-bar-divider')).toHaveLength(7)
    // with no target, fills scale to the week's max up to the divider (UNDER px)
    const fills = screen.getAllByTestId('stat-bar-fill')
    expect(fills[1].style.height).toBe('82px') // 300 = week max → reaches divider
  })
})
