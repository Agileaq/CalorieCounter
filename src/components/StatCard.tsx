import { useTranslation } from 'react-i18next'
import type { WeeklyBar } from '../lib/weekly'
import { HalfRing } from './HalfRing'

interface Props {
  title: string
  gaugeValue: number
  gaugeLabel: string
  pct: number
  color: string
  bottomLeft: string
  bottomRight: string
  bars: WeeklyBar[]
}

// Mon..Sun — matches the order of WeeklyBar[] from weeklySeries()
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function StatCard({ title, gaugeValue, gaugeLabel, pct, color, bottomLeft, bottomRight, bars }: Props) {
  const { t } = useTranslation()
  const max = Math.max(1, ...bars.map(b => b.value))
  const nf = (n: number) => Math.round(n).toLocaleString('en-US')
  return (
    <div className="card">
      <div className="row spread">
        <strong>{title}</strong>
        <span className="muted" aria-hidden style={{ fontSize: 18 }}>⋯</span>
      </div>
      <div className="row spread" style={{ gap: 12, marginTop: 8, alignItems: 'center' }}>
        <HalfRing pct={pct} size={120} color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div data-testid="stat-gauge-value" style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{nf(gaugeValue)}</div>
            <div className="muted" style={{ marginTop: 2 }}>{gaugeLabel}</div>
          </div>
        </HalfRing>
        <div className="row" style={{ flex: 1, gap: 6, height: 120, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {bars.map((b, i) => (
            <div key={b.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ height: 96, width: '100%', maxWidth: 16, display: 'flex', alignItems: 'flex-end', margin: '0 auto' }}>
                <div data-testid="stat-bar" style={{
                  width: '100%',
                  height: `${Math.max(b.value > 0 ? 6 : 0, (b.value / max) * 96)}px`,
                  minHeight: 4,
                  background: b.value > 0 ? (b.isToday ? color : '#d8d8dd') : '#eeeef0',
                  borderRadius: 4,
                }} />
              </div>
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
