/**
 * Dashboard's 2×2 nutrient review matrix: carbs / protein / fat / fiber.
 * The three macros show a signed remaining ("+22 / 128g", red when negative);
 * fiber is a floor metric and shows plain intake ("12 / 30g") — a signed "+"
 * there would read as surplus. Cells are inline-styled mini-cards (no .card
 * class: its margin-block would fight the grid gap). Narrow-screen defense:
 * MiniBars use gap 2 / max-width 8 / min-width 6 inside minWidth:0 cells.
 */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { weeklyStats, type WeeklyBar } from '../lib/weekly'
import { dayFoodNutrition } from '../lib/nutrition'
import type { DayLog } from '../types'

const nf = (n: number) => Math.round(n).toLocaleString('en-US')

interface CellConfig {
  key: 'carbs' | 'protein' | 'fat' | 'fiber'
  label: string
  color: string
  dir: 'max' | 'min'
  metric: (d: DayLog) => number
  /** per-day MiniBars colour: macros red on over-target days, fiber green met / light short */
  miniColor: (v: number, target: number, color: string) => string
}

const macroMini = (v: number, target: number, color: string) =>
  target > 0 && v > target ? 'var(--red)' : color
const fiberMini = (v: number, target: number, color: string) =>
  target > 0 ? (v >= target ? 'var(--green)' : 'var(--muted)') : color

const CELLS: CellConfig[] = [
  { key: 'carbs', label: 'dashboard.carbs', color: 'var(--accent)', dir: 'max',
    metric: d => dayFoodNutrition(d).carbs.total, miniColor: macroMini },
  { key: 'protein', label: 'dashboard.protein', color: '#5b3df5', dir: 'min',
    metric: d => dayFoodNutrition(d).protein, miniColor: macroMini },
  { key: 'fat', label: 'dashboard.fat', color: '#f5a623', dir: 'max',
    metric: d => dayFoodNutrition(d).fat.total, miniColor: macroMini },
  { key: 'fiber', label: 'dashboard.fiber', color: '#34c0eb', dir: 'min',
    metric: d => dayFoodNutrition(d).carbs.fiber, miniColor: fiberMini },
]

/** 7 axis-less mini bars, per-day state colouring, heights capped by the week max. */
function MiniBars({ bars, target, color, miniColor, testId }: {
  bars: WeeklyBar[]; target: number; color: string; miniColor: CellConfig['miniColor']; testId: string
}) {
  const cellMax = Math.max(1, ...bars.map(b => b.value))
  return (
    <div data-testid={testId} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, minWidth: 0 }}>
      {bars.map(b => (
        <div key={b.date}
          style={{
            flex: 1, minWidth: 6, maxWidth: 8,
            height: b.value > 0 ? Math.max((b.value / cellMax) * 28, 2) : 0,
            background: b.value > 0 ? miniColor(b.value, target, color) : 'transparent',
            borderRadius: 2,
          }} />
      ))}
    </div>
  )
}

function Cell({ cfg, selected }: { cfg: CellConfig; selected: string }) {
  const { t } = useTranslation()
  const { days, settings } = useApp()
  const target = settings.macroTargets[cfg.key]
  const stats = weeklyStats(days, selected, cfg.metric, target, cfg.dir)
  const dayN = days[selected] != null ? cfg.metric(days[selected]) : null

  let value: React.ReactNode
  let valueColor: string | undefined
  if (target <= 0) value = <span>—</span>
  else if (dayN == null) value = <span>— / {nf(target)}g</span>
  else if (cfg.key === 'fiber') {
    valueColor = dayN >= target ? 'var(--green)' : 'var(--muted)'
    value = <>{t('dashboard.remaining', { left: nf(dayN), target: nf(target) })}</>
  } else {
    const left = target - dayN
    valueColor = left < 0 ? 'var(--red)' : 'inherit'
    value = <>{t('dashboard.remaining', { left: (left < 0 ? '−' : '+') + nf(Math.abs(left)), target: nf(target) })}</>
  }

  return (
    <div data-testid={`macro-cell-${cfg.key}`}
      style={{ background: 'var(--card)', borderRadius: 16, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 13 }}>{t(cfg.label)}</strong>
        <span data-testid={`macro-value-${cfg.key}`}
          style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: valueColor }}>
          {value}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        <MiniBars bars={stats.bars} target={target} color={cfg.color} miniColor={cfg.miniColor} testId={`macro-minis-${cfg.key}`} />
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
  const { selectedDate } = useApp()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {CELLS.map(c => <Cell key={c.key} cfg={c} selected={selectedDate} />)}
    </div>
  )
}
