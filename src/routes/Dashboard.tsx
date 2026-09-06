import { useState } from 'react'
import { DateHeader } from '../components/DateHeader'
import { BuildInfo } from '../components/BuildInfo'
import { CalendarModal } from '../components/CalendarModal'
import { WeightTrendChart } from '../components/WeightTrendChart'
import { CalorieWeekCard } from '../components/CalorieWeekCard'
import { MacroMatrix } from '../components/MacroMatrix'

/** Mid-frequency review board: outcome on top (weight + calorie balance),
 * weekly calories in the middle, the 2×2 nutrient matrix below. Daily
 * monitoring lives on the Log page; long-term config on Goals. */
export default function Dashboard() {
  const [cal, setCal] = useState(false)
  return (
    <div className="screen">
      <div className="header-row">
        <DateHeader onOpenCalendar={() => setCal(true)} />
      </div>
      <WeightTrendChart />
      <CalorieWeekCard />
      <MacroMatrix />
      <BuildInfo />
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
