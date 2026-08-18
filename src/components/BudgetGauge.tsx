import { useTranslation } from 'react-i18next'
import type { DayLog } from '../types'
import { dayFoodNutrition, exerciseTotal, underOver } from '../lib/nutrition'
import { CalorieRing } from './CalorieRing'

export function BudgetGauge({ budget, day }: { budget: number; day: DayLog }) {
  const { t } = useTranslation()
  const food = Math.round(dayFoodNutrition(day).calories)
  const exercise = Math.round(exerciseTotal(day))
  const uo = underOver(budget, day)
  const nf = (n: number) => n.toLocaleString('en-US')
  return (
    <div className="card">
      <div className="muted">{t('dashboard.budget', { n: nf(budget) })}</div>
      <div className="row spread" style={{ marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="muted">{t('dashboard.food')}</div>
          <div data-testid="gauge-food" style={{ fontSize: 22, fontWeight: 700 }}>{nf(food)}</div>
        </div>
        <CalorieRing consumed={food} budget={budget} size={110}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div data-testid="gauge-remaining" style={{ fontSize: 26, fontWeight: 800, color: uo.kind === 'under' ? 'var(--green)' : 'var(--red)' }}>
              {nf(uo.amount)}
            </div>
            <div className="muted">{uo.kind === 'under' ? t('dashboard.under') : t('dashboard.over')}</div>
          </div>
        </CalorieRing>
        <div style={{ textAlign: 'center' }}>
          <div className="muted">{t('dashboard.exercise')}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{nf(exercise)}</div>
        </div>
      </div>
    </div>
  )
}
