import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { DateHeader } from '../components/DateHeader'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { StatCard } from '../components/StatCard'
import { BuildInfo } from '../components/BuildInfo'
import { CalendarModal } from '../components/CalendarModal'
import { dayFoodNutrition, exerciseTotal } from '../lib/nutrition'
import { weeklySeries } from '../lib/weekly'
import type { DayLog } from '../types'

export default function Dashboard() {
  const { t } = useTranslation()
  const { day, days, selectedDate, settings } = useApp()
  const [cal, setCal] = useState(false)
  const n = dayFoodNutrition(day)
  const mt = settings.macroTargets
  const nf = (x: number) => Math.round(x).toLocaleString('en-US')

  // shared: build a macro card from a nutrition selector + target
  function macroCard(title: string, metric: (d: DayLog) => number, current: number, target: number, color: string) {
    const s = weeklySeries(days, selectedDate, metric)
    const under = target - current
    return (
      <StatCard key={title} title={title}
        gaugeValue={current} gaugeLabel={under >= 0 ? t('dashboard.under') : t('dashboard.over')}
        pct={target > 0 ? current / target : 0} color={color} target={target}
        bottomLeft={t('dashboard.of', { cur: nf(current), target: nf(target) })}
        bottomRight={t('dashboard.avgPrior', { n: nf(s.avgPrior) })}
        bars={s.bars} />
    )
  }

  // Calories card: gauge shows remaining (budget − food + exercise), like the old BudgetGauge.
  const calSeries = weeklySeries(days, selectedDate, d => dayFoodNutrition(d).calories)
  const food = n.calories
  const remaining = settings.dailyBudget - (food - exerciseTotal(day))

  return (
    <div className="screen">
      <div className="row spread">
        <DateHeader onOpenCalendar={() => setCal(true)} />
        <LanguageSwitcher />
      </div>

      <StatCard title={t('dashboard.calories')}
        gaugeValue={Math.abs(remaining)} gaugeLabel={remaining >= 0 ? t('dashboard.under') : t('dashboard.over')}
        pct={settings.dailyBudget > 0 ? food / settings.dailyBudget : 0}
        color={remaining >= 0 ? 'var(--green)' : 'var(--red)'}
        target={settings.dailyBudget}
        bottomLeft={t('dashboard.ofCals', { cur: nf(food), target: nf(settings.dailyBudget) })}
        bottomRight={t('dashboard.avgPrior', { n: nf(calSeries.avgPrior) })}
        bars={calSeries.bars} />

      {macroCard(t('dashboard.carbs'), d => dayFoodNutrition(d).carbs.total, n.carbs.total, mt.carbs, 'var(--accent)')}
      {macroCard(t('dashboard.protein'), d => dayFoodNutrition(d).protein, n.protein, mt.protein, '#5b3df5')}
      {macroCard(t('dashboard.fat'), d => dayFoodNutrition(d).fat.total, n.fat.total, mt.fat, '#f5a623')}
      {macroCard(t('dashboard.fiber'), d => dayFoodNutrition(d).carbs.fiber, n.carbs.fiber, mt.fiber, '#34c0eb')}

      <BuildInfo />
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
