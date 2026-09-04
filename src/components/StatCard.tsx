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
  /** Click a bar's day to switch the selected date. Optional — cards without it render static bars. */
  onBarClick?: (date: string) => void
}

// Mon..Sun — matches the order of WeeklyBar[] from weeklySeries()
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

// Bar geometry: full-height capsule; the fill zone (Under) is the bottom UNDER px,
// the divider sits at the target level, and the top OVER px is over-budget headroom.
const CAP = 96
const UNDER = 82
const OVER = 14

export function StatCard({ title, gaugeValue, gaugeLabel, ratio, color, target, bottomLeft, bottomRight, bars, onBarClick }: Props) {
  const { t } = useTranslation()
  const max = Math.max(1, ...bars.map(b => b.value))
  const nf = (n: number) => Math.round(n).toLocaleString('en-US')
  // with no target set, the ring falls back to scaling against the week's max
  const ringRatio = target > 0 ? ratio : gaugeValue / max

  function fillParts(value: number): { under: number; over: number } {
    if (value <= 0) return { under: 0, over: 0 }
    if (target <= 0) return { under: (value / max) * UNDER, over: 0 } // no target: scale to week max
    const ratio = value / target
    return {
      under: Math.min(ratio, 1) * UNDER,
      over: Math.min(Math.max(ratio - 1, 0), 1) * OVER,
    }
  }

  return (
    <div className="card">
      <div className="row spread">
        <strong>{title}</strong>
        <span className="muted" aria-hidden style={{ fontSize: 18 }}>⋯</span>
      </div>
      <div className="row spread" style={{ gap: 12, marginTop: 8, alignItems: 'center' }}>
        <HalfRing ratio={ringRatio} size={120} color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div data-testid="stat-gauge-value" style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{nf(gaugeValue)}</div>
            <div className="muted" style={{ marginTop: 2 }}>{gaugeLabel}</div>
          </div>
        </HalfRing>
        <div className="row" style={{ flex: 1, gap: 6, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {bars.map((b, i) => (
            <button key={b.date} type="button" data-testid="stat-bar-btn"
              disabled={!onBarClick}
              aria-label={b.date}
              onClick={onBarClick ? () => onBarClick(b.date) : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
                background: 'transparent', border: 'none', padding: 0, margin: 0,
                font: 'inherit', color: 'inherit', textAlign: 'inherit',
                cursor: onBarClick ? 'pointer' : 'default',
              }}>
              <div data-testid="stat-bar" style={{
                position: 'relative', width: '100%', maxWidth: 16, height: CAP,
                margin: '0 auto', background: '#e5e5ea', borderRadius: 5, overflow: 'hidden',
              }}>
                {b.value > 0 && (
                  <div data-testid="stat-bar-fill" style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    height: fillParts(b.value).under,
                    background: b.isToday ? color : '#c7c9d1',
                  }} />
                )}
                {fillParts(b.value).over > 0 && (
                  <div data-testid="stat-bar-over" style={{
                    position: 'absolute', left: 0, right: 0, bottom: UNDER + 1,
                    height: fillParts(b.value).over,
                    background: 'var(--red)',
                  }} />
                )}
                <div data-testid="stat-bar-divider" style={{
                  position: 'absolute', left: 0, right: 0, top: CAP - UNDER - 1, height: 2,
                  background: 'var(--card)',
                }} />              </div>
              <span className="muted" style={{ fontSize: 11, fontWeight: b.isToday ? 700 : 400, color: b.isToday ? 'inherit' : 'var(--muted)' }}>
                {t(`calendar.${DOW[i]}`).slice(0, 2)}
              </span>
            </button>
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
