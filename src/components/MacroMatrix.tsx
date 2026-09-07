/**
 * Dashboard's 2×2 nutrient review matrix: carbs / protein / fat / fiber.
 * The three macros show a signed remaining ("+22", red when negative) beside
 * a de-emphasised "/ 128g"; fiber is a floor metric and shows plain intake —
 * a signed "+" there would read as surplus. Cells are inline-styled
 * mini-cards (no .card class: its margin-block would fight the grid gap).
 * Narrow-screen defense: MiniBars use gap 2 / max-width 8 / min-width 6
 * inside minWidth:0 cells.
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

/**
 * 7 axis-less mini bars over always-visible grey track slots (same track+fill
 * layering as WeekBars): per-day state colouring, heights capped by the week
 * max. Empty days keep their slot so the 7-day shape always reads — a single
 * Monday bar must not look like a colour swatch.
 */
function MiniBars({ bars, target, color, miniColor, testId }: {
  bars: WeeklyBar[]; target: number; color: string; miniColor: CellConfig['miniColor']; testId: string
}) {
  const cellMax = Math.max(1, ...bars.map(b => b.value))
  return (
    <div data-testid={testId} style={{ display: 'flex', gap: 2, height: 28, minWidth: 0 }}>
      {bars.map(b => (
        <div key={b.date} style={{
          position: 'relative', flex: 1, minWidth: 6, maxWidth: 8, height: 28,
          background: 'var(--line)', borderRadius: 2, overflow: 'hidden',
        }}>
          {b.value > 0 && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 2,
              height: Math.max((b.value / cellMax) * 28, 2),
              background: miniColor(b.value, target, color),
            }} />
          )}
        </div>
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

  // Value hierarchy: the day's number jumps out (17px bold, state colour),
  // the "/ targetg" part is de-emphasised small and grey — numbers first.
  const num = (text: string, color?: string): React.ReactNode => (
    <span data-testid={`macro-num-${cfg.key}`}
      style={{ fontSize: 17, fontWeight: 700, color: color ?? 'inherit' }}>{text}</span>
  )
  const unit = <span style={{ fontSize: 11, color: 'var(--muted)' }}> / {nf(target)}g</span>

  let value: React.ReactNode
  if (target <= 0) value = num('—', 'var(--muted)')
  else if (dayN == null) value = <>{num('—', 'var(--muted)')}{unit}</>
  else if (cfg.key === 'fiber') {
    value = <>{num(nf(dayN), dayN >= target ? 'var(--green)' : 'var(--muted)')}{unit}</>
  } else {
    const left = target - dayN
    value = <>{num((left < 0 ? '−' : '+') + nf(Math.abs(left)), left < 0 ? 'var(--red)' : undefined)}{unit}</>
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
