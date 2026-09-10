/**
 * Log page's day-summary card: fixed budget top-left, food / calorie ring /
 * exercise row, then carbs-protein-fat-fiber progress bars. Read-only — editing
 * happens in the meal and exercise cards below it.
 */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { HalfRing } from './HalfRing'
import { dayFoodNutrition, exerciseTotal } from '../lib/nutrition'

const MACROS = [
  { key: 'carbs', label: 'dashboard.carbs', color: 'var(--accent)' },
  { key: 'protein', label: 'dashboard.protein', color: '#5b3df5' },
  { key: 'fat', label: 'dashboard.fat', color: '#f5a623' },
  { key: 'fiber', label: 'dashboard.fiber', color: '#34c0eb' },
] as const

/** Exercise-number colour tiers by absolute burn (kcal): first match wins. */
const EX_TIERS = [
  { min: 1000, color: 'var(--red)' },
  { min: 500, color: 'var(--accent)' },
  { min: 200, color: 'var(--green)' },
  { min: 1, color: '#34c0eb' },
] as const
const burnColor = (b: number) => EX_TIERS.find(t => b >= t.min)?.color

/** Food-number colour by budget share: >100% red, >80% approaching (accent), else green. */
const foodColor = (food: number, budget: number) =>
  budget > 0 ? (food > budget ? 'var(--red)' : food / budget > 0.8 ? 'var(--accent)' : 'var(--green)') : undefined

export function DaySummaryCard() {
  const { t } = useTranslation()
  const { day, settings } = useApp()
  const nf = (x: number) => Math.round(x).toLocaleString('en-US')
  const n = dayFoodNutrition(day)
  const food = n.calories
  const burned = exerciseTotal(day)
  const remaining = settings.dailyBudget - (food - burned)

  return (
    <div className="card">
      <div data-testid="summary-budget" style={{ fontSize: 14, fontWeight: 600 }}>
        {t('log.budget', { n: nf(settings.dailyBudget) })}
      </div>
      <div className="row" style={{ justifyContent: 'center', alignItems: 'center', gap: 44, marginTop: 8 }}>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          <div className="muted" style={{ fontSize: 12 }}>{t('dashboard.food')}</div>
          <div data-testid="summary-food" style={{ fontWeight: 700, fontSize: 20, color: foodColor(food, settings.dailyBudget) }}>{nf(food)}</div>
        </div>
        <HalfRing ratio={settings.dailyBudget > 0 ? food / settings.dailyBudget : 0} size={110} color="var(--green)">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div data-testid="summary-gauge-value" style={{ fontSize: 24, fontWeight: 800, color: remaining >= 0 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
              {nf(Math.abs(remaining))}
            </div>
            <div className="muted" style={{ marginTop: 2 }}>
              {remaining >= 0 ? t('dashboard.under') : t('dashboard.over')}
            </div>
          </div>
        </HalfRing>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          <div className="muted" style={{ fontSize: 12 }}>{t('dashboard.exercise')}</div>
          <div data-testid="summary-exercise" style={{ fontWeight: 700, fontSize: 20, color: burnColor(burned) }}>{nf(burned)}</div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 12 }}>
        {MACROS.map(m => {
          const cur = m.key === 'carbs' ? n.carbs.total
            : m.key === 'fiber' ? n.carbs.fiber
            : m.key === 'protein' ? n.protein
            : n.fat.total
          const target = settings.macroTargets[m.key]
          const pct = target > 0 ? Math.min(cur / target, 1) * 100 : 0
          return (
            <div key={m.key} data-testid={`summary-macro-${m.key}`} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, textAlign: 'center' }}>{t(m.label)}</div>
              <div style={{ height: 8, background: '#e5e5ea', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                {cur > 0 && (
                  <div data-testid="summary-macro-fill" style={{ width: `${pct}%`, height: '100%', background: m.color }} />
                )}
              </div>
              <div className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                {t('log.grams', { cur: nf(cur), target: nf(target) })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
