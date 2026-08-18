import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { DateHeader } from '../components/DateHeader'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { BudgetGauge } from '../components/BudgetGauge'
import { MacroBar } from '../components/MacroBar'
import { BuildInfo } from '../components/BuildInfo'
import { CalendarModal } from '../components/CalendarModal'
import { dayFoodNutrition } from '../lib/nutrition'

export default function Dashboard() {
  const { t } = useTranslation()
  const { day, settings } = useApp()
  const [cal, setCal] = useState(false)
  const n = dayFoodNutrition(day)
  return (
    <div className="screen">
      <div className="row spread">
        <DateHeader onOpenCalendar={() => setCal(true)} />
        <LanguageSwitcher />
      </div>
      <BudgetGauge budget={settings.dailyBudget} day={day} />
      <div className="card row" style={{ gap: 16 }}>
        <MacroBar label={t('dashboard.protein')} current={n.protein} target={settings.macroTargets.protein} />
        <MacroBar label={t('dashboard.fiber')} current={n.carbs.fiber} target={settings.macroTargets.fiber} />
      </div>
      <BuildInfo />
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
