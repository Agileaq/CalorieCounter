/** Dashboard's weekly calorie module: full-width Mon–Sun bars against the
 * daily budget (dashed line, red over-caps) with the week's logged-days
 * average in the title row. Bars switch the selected date on tap. */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { WeekBars } from './WeekBars'
import { weeklyStats } from '../lib/weekly'
import { dayFoodNutrition } from '../lib/nutrition'

const nf = (n: number) => Math.round(n).toLocaleString('en-US')

export function CalorieWeekCard() {
  const { t } = useTranslation()
  const { days, settings, selectedDate, setSelectedDate } = useApp()
  const stats = weeklyStats(days, selectedDate, d => dayFoodNutrition(d).calories, settings.dailyBudget, 'max')
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>{t('dashboard.calories')}</strong>
        <span className="muted" data-testid="calorie-week-avg" style={{ fontSize: 13 }}>
          {t('dashboard.weekAvg', { n: stats.avg == null ? '—' : nf(stats.avg) })} kcal
        </span>
      </div>
      <div style={{ marginTop: 8 }}>
        <WeekBars bars={stats.bars} target={settings.dailyBudget} color="var(--green)" onBarClick={setSelectedDate} />
      </div>
    </div>
  )
}
