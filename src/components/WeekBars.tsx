/**
 * Shared Mon–Sun weekly bar primitive, extracted from the old StatCard:
 * capsule track + under-fill + red over-cap + a full-width dashed budget
 * line. Layering (locked): the dashed line (z-index 1) sits above the capsule
 * track but below the fills/over-caps (z-index 2) — the capsules deliberately
 * create no stacking context (position:relative, no z-index/transform), so
 * the line never visually cuts through a bar's fill. The line replaces the
 * old per-bar divider; consumers own ring/gauge and footer rows.
 */
import { useTranslation } from 'react-i18next'
import type { WeeklyBar } from '../lib/weekly'

interface Props {
  bars: WeeklyBar[]
  target: number
  color: string
  /** capsule height in px; the under/over zones scale proportionally (default 64) */
  barHeight?: number
  onBarClick?: (date: string) => void
}

// Mon..Sun — matches WeeklyBar[] order from weeklyStats/weeklySeries
const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function WeekBars({ bars, target, color, barHeight = 64, onBarClick }: Props) {
  const { t } = useTranslation()
  const UNDER = Math.round(barHeight * (82 / 96))
  const OVER = barHeight - UNDER

  function fillParts(value: number): { under: number; over: number } {
    if (value <= 0) return { under: 0, over: 0 }
    if (target <= 0) {
      const max = Math.max(1, ...bars.map(b => b.value))
      return { under: (value / max) * UNDER, over: 0 } // no target: scale to week max
    }
    const ratio = value / target
    return {
      under: Math.min(ratio, 1) * UNDER,
      over: Math.min(Math.max(ratio - 1, 0), 1) * OVER,
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {target > 0 && (
        <div data-testid="week-budget-line" aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, top: OVER - 1, borderTop: '1px dashed var(--muted)', zIndex: 1, pointerEvents: 'none' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        {bars.map((b, i) => (
          <button key={b.date} type="button" data-testid="week-bar-btn"
            disabled={!onBarClick}
            aria-label={b.date}
            onClick={onBarClick ? () => onBarClick(b.date) : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
              background: 'transparent', border: 'none', padding: 0, margin: 0,
              font: 'inherit', color: 'inherit', textAlign: 'inherit',
              cursor: onBarClick ? 'pointer' : 'default',
            }}>
            <div data-testid="week-bar" style={{
              position: 'relative', width: '100%', maxWidth: 16, height: barHeight,
              margin: '0 auto', background: '#e5e5ea', borderRadius: 5, overflow: 'hidden',
            }}>
              {b.value > 0 && (
                <div data-testid="week-bar-fill" style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  height: fillParts(b.value).under, background: color, zIndex: 2,
                }} />
              )}
              {fillParts(b.value).over > 0 && (
                <div data-testid="week-bar-over" style={{
                  position: 'absolute', left: 0, right: 0, bottom: UNDER + 1,
                  height: fillParts(b.value).over, background: 'var(--red)', zIndex: 2,
                }} />
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: b.isToday ? 700 : 400, color: b.isToday ? 'inherit' : 'var(--muted)' }}>
              {t(`calendar.${DOW[i]}`).slice(0, 2)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
