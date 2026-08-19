import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { StatCard } from './StatCard'

const bars = [
  { date: '2026-08-17', value: 100, isToday: false },
  { date: '2026-08-18', value: 300, isToday: false },
  { date: '2026-08-19', value: 500, isToday: true },
  { date: '2026-08-20', value: 0, isToday: false },
  { date: '2026-08-21', value: 0, isToday: false },
  { date: '2026-08-22', value: 0, isToday: false },
  { date: '2026-08-23', value: 0, isToday: false },
]

describe('StatCard', () => {
  it('renders title, gauge value/label, bottom texts and 7 bars', () => {
    render(
      <StatCard title="Protein" gaugeValue={0} gaugeLabel="Under" pct={0} color="var(--accent)"
        bottomLeft="0 of 128g" bottomRight="37g avg prior to today" bars={bars} />,
    )
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByTestId('stat-gauge-value')).toHaveTextContent('0')
    expect(screen.getByText('Under')).toBeInTheDocument()
    expect(screen.getByText('0 of 128g')).toBeInTheDocument()
    expect(screen.getByText('37g avg prior to today')).toBeInTheDocument()
    expect(screen.getAllByTestId('stat-bar')).toHaveLength(7)
  })
})
