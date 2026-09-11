/**
 * Dashboard's 2×2 nutrient review matrix: carbs / protein / fat / fiber.
 * The review standard is a RANGE from settings.macroRanges — macros scaled by
 * the ruler weight (resolveReviewWeightKg: latest weigh-in → goal → 80kg),
 * fiber absolute grams. Each cell shows the day's intake over "min–maxg":
 * red over max, muted under min, cell colour (macros) or green (fiber) within.
 * Cells are inline-styled mini-cards (no .card class: its margin-block would
 * fight the grid gap). Narrow-screen defense: MiniBars use gap 2 / max-width 8
 * / min-width 6 inside minWidth:0 cells.
 */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { weeklyStats, type WeeklyBar } from '../lib/weekly'
import { dayFoodNutrition } from '../lib/nutrition'
import { resolveReviewWeightKg } from '../lib/weight'
import type { DayLog, MacroRange } from '../types'

const nf = (n: number) => Math.round(n).toLocaleString('en-US')

interface CellConfig {
  key: 'carbs' | 'protein' | 'fat' | 'fiber'
  label: string
  /** fill/number colour while the value sits inside the range (fiber is blue, not green) */
  withinColor: string
  metric: (d: DayLog) => number
}

const CELLS: CellConfig[] = [
  { key: 'carbs', label: 'dashboard.carbs', withinColor: 'var(--accent)',
    metric: d => dayFoodNutrition(d).carbs.total },
  { key: 'protein', label: 'dashboard.protein', withinColor: '#5b3df5',
    metric: d => dayFoodNutrition(d).protein },
  { key: 'fat', label: 'dashboard.fat', withinColor: '#f5a623',
    metric: d => dayFoodNutrition(d).fat.total },
  { key: 'fiber', label: 'dashboard.fiber', withinColor: '#34c0eb',
    metric: d => dayFoodNutrition(d).carbs.fiber },
]

/**
 * 7 axis-less mini bars over always-visible grey track slots (same track+fill
 * layering as WeekBars): tri-state range colouring, heights capped by the week
 * max. Empty days keep their slot so the 7-day shape always reads. Bars are
 * tappable and switch the selected date (two-way with the trend chart and the
 * weekly calorie card). Narrow-screen defense: MiniBars use gap 4 / max-width
 * 10.4 / min-width 7.8 inside minWidth:0 cells.
 */
function MiniBars({ bars, range, withinColor, testId, onPick }: {
  bars: WeeklyBar[]; range: MacroRange; withinColor: string; testId: string
  onPick?: (date: string) => void
}) {
  const cellMax = Math.max(1, ...bars.map(b => b.value))
  const fill = (v: number) => (v > range.max ? 'var(--red)' : v < range.min ? 'var(--muted)' : withinColor)
  return (
    <div data-testid={testId} style={{ display: 'flex', gap: 4, height: 28, minWidth: 0 }}>
      {bars.map(b => (
        <button key={b.date} type="button" aria-label={b.date}
          disabled={!onPick} onClick={onPick ? () => onPick(b.date) : undefined}
          style={{
            position: 'relative', flex: 1, minWidth: 7.8, maxWidth: 10.4, height: 28,
            background: 'var(--line)', borderRadius: 2, overflow: 'hidden',
            border: 'none', padding: 0, margin: 0, font: 'inherit',
            cursor: onPick ? 'pointer' : 'default',
          }}>
          {b.value > 0 && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 2,
              height: Math.max((b.value / cellMax) * 28, 2),
              background: fill(b.value),
            }} />
          )}
        </button>
      ))}
    </div>
  )
}

function Cell({ cfg, selected, kg }: { cfg: CellConfig; selected: string; kg: number }) {
  const { t } = useTranslation()
  const { days, settings, setSelectedDate } = useApp()
  const perKg = settings.macroRanges[cfg.key]
  // macros scale with the ruler weight; fiber's range is already absolute
  const range: MacroRange = cfg.key === 'fiber' ? perKg : { min: kg * perKg.min, max: kg * perKg.max }
  const stats = weeklyStats(days, selected, cfg.metric, 0, 'max', range)
  const dayN = days[selected] != null ? cfg.metric(days[selected]) : null

  // Value hierarchy: the day's intake jumps out (17px bold, tri-state colour),
  // the "/ min–maxg" part is de-emphasised small and grey — numbers first.
  const num = (text: string, color?: string): React.ReactNode => (
    <span data-testid={`macro-num-${cfg.key}`}
      style={{ fontSize: 17, fontWeight: 700, color: color ?? 'inherit' }}>{text}</span>
  )
  const unit = <span style={{ fontSize: 11, color: 'var(--muted)' }}> / {nf(range.min)}–{nf(range.max)}g</span>
  const stateColor = (v: number) => (v > range.max ? 'var(--red)' : v < range.min ? 'var(--muted)' : undefined)

  let value: React.ReactNode
  if (dayN == null) value = <>{num('—', 'var(--muted)')}{unit}</>
  else {
    // number: inherit (macros) / blue (fiber) inside the range; minibars use the cell colour
    const color = stateColor(dayN) ?? (cfg.key === 'fiber' ? '#34c0eb' : undefined)
    value = <>{num(nf(dayN), color)}{unit}</>
  }

  return (
    <div data-testid={`macro-cell-${cfg.key}`}
      style={{ background: 'var(--card)', borderRadius: 16, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t(cfg.label)}</span>
        <span data-testid={`macro-value-${cfg.key}`}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        <MiniBars bars={stats.bars} range={range} withinColor={cfg.withinColor} testId={`macro-minis-${cfg.key}`} onPick={setSelectedDate} />
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        {t('dashboard.weekAvg', { n: stats.avg == null ? '—' : nf(stats.avg) })}
        {' · '}
        {t('dashboard.hit', { n: stats.hitDays == null ? '—' : stats.hitDays })}
      </div>
    </div>
  )
}

export function MacroMatrix() {
  const { selectedDate, days, settings } = useApp()
  const kg = resolveReviewWeightKg(days, settings.goalWeightKg)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {CELLS.map(c => <Cell key={c.key} cfg={c} selected={selectedDate} kg={kg} />)}
    </div>
  )
}
