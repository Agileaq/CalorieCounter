import { useTranslation } from 'react-i18next'
import type { WeeklyBar } from '../lib/weekly'
import { HalfRing } from './HalfRing'

interface Props {
  title: string
  gaugeValue: number
  gaugeLabel: string
  ratio: number
  color: string
  target: number
  bottomLeft: string
  bottomRight: string
  bars: WeeklyBar[]
}

// Mon..Sun — matches the order of WeeklyBar[] from weeklySeries()
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

// Bar geometry: full-height capsule; the fill zone (Under) is the bottom UNDER px,
// the divider sits at the target level, and the top OVER px is over-budget headroom.
const CAP = 96
const UNDER = 82
const OVER = 14

export function StatCard({ title, gaugeValue, gaugeLabel, ratio, color, target, bottomLeft, bottomRight, bars }: Props) {
  const { t } = useTranslation()
  const max = Math.max(1, ...bars.map(b => b.value))
  const nf = (n: number) => Math.round(n).toLocaleString('en-US')

  function fillHeight(value: number): number {
    if (value <= 0) return 0
    if (target <= 0) return (value / max) * UNDER // no target: scale to the week's max, up to the divider
    const ratio = value / target
    return Math.min(ratio, 1) * UNDER + Math.min(Math.max(ratio - 1, 0), 1) * OVER
  }

  return (
    <div className="card">
      <div className="row spread">
        <strong>{title}</strong>
        <span className="muted" aria-hidden style={{ fontSize: 18 }}>⋯</span>
      </div>
      <div className="row spread" style={{ gap: 12, marginTop: 8, alignItems: 'center' }}>
        <HalfRing ratio={ratio} size={120} color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div data-testid="stat-gauge-value" style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{nf(gaugeValue)}</div>
            <div className="muted" style={{ marginTop: 2 }}>{gaugeLabel}</div>
          </div>
        </HalfRing>
        <div className="row" style={{ flex: 1, gap: 6, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {bars.map((b, i) => (
            <div key={b.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div data-testid="stat-bar" style={{
                position: 'relative', width: '100%', maxWidth: 16, height: CAP,
                margin: '0 auto', background: '#e5e5ea', borderRadius: 5, overflow: 'hidden',
              }}>
                {b.value > 0 && (
                  <div data-testid="stat-bar-fill" style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    height: fillHeight(b.value),
                    background: b.isToday ? color : '#c7c9d1',
                  }} />
                )}
                <div data-testid="stat-bar-divider" style={{
                  position: 'absolute', left: 0, right: 0, top: CAP - UNDER - 1, height: 2,
                  background: 'var(--card)',
                }} />              </div>
              <span className="muted" style={{ fontSize: 11, fontWeight: b.isToday ? 700 : 400, color: b.isToday ? 'inherit' : 'var(--muted)' }}>
                {t(`calendar.${DOW[i]}`).slice(0, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="row spread" style={{ marginTop: 8 }}>
        <strong style={{ fontSize: 14 }}>{bottomLeft}</strong>
        <span className="muted" style={{ fontSize: 13 }}>{bottomRight}</span>
      </div>
    </div>
  )
}
