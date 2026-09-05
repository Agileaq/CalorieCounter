/**
 * Log page's day-summary card: fixed budget top-left, food / calorie ring /
 exercise row, then carbs-protein-fat progress bars. Read-only — editing
 happens in the meal and exercise cards below it.
 */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { HalfRing } from './HalfRing'
import { dayFoodNutrition, exerciseTotal } from '../lib/nutrition'

const MACROS = [
  { key: 'carbs', label: 'dashboard.carbs', color: 'var(--accent)' },
  { key: 'protein', label: 'dashboard.protein', color: '#5b3df5' },
  { key: 'fat', label: 'dashboard.fat', color: '#f5a623' },
] as const

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
      <div data-testid="summary-budget" className="muted" style={{ fontSize: 14 }}>
        {t('log.budget', { n: nf(settings.dailyBudget) })}
      </div>
      <div className="row" style={{ justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 8 }}>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          <div className="muted" style={{ fontSize: 12 }}>{t('dashboard.food')}</div>
          <div data-testid="summary-food" style={{ fontWeight: 700, fontSize: 20 }}>{nf(food)}</div>
        </div>
        <HalfRing ratio={settings.dailyBudget > 0 ? food / settings.dailyBudget : 0} size={110} color="var(--green)">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div data-testid="summary-gauge-value" style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>
              {nf(Math.abs(remaining))}
            </div>
            <div className="muted" style={{ marginTop: 2 }}>
              {remaining >= 0 ? t('dashboard.under') : t('dashboard.over')}
            </div>
          </div>
        </HalfRing>
        <div style={{ textAlign: 'center', minWidth: 64 }}>
          <div className="muted" style={{ fontSize: 12 }}>{t('dashboard.exercise')}</div>
          <div data-testid="summary-exercise" style={{ fontWeight: 700, fontSize: 20 }}>{nf(burned)}</div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 20, marginTop: 12 }}>
        {MACROS.map(m => {
          const cur = m.key === 'carbs' ? n.carbs.total : m.key === 'protein' ? n.protein : n.fat.total
          const target = settings.macroTargets[m.key]
          const pct = target > 0 ? Math.min(cur / target, 1) * 100 : 0
          return (
            <div key={m.key} data-testid={`summary-macro-${m.key}`} style={{ width: 90 }}>
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
