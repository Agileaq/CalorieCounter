import { useState } from 'react'
import { MEAL_KEYS } from '../types'
import { DateHeader } from '../components/DateHeader'
import { MealCard } from '../components/MealCard'
import { ExerciseCard } from '../components/ExerciseCard'
import { CalendarModal } from '../components/CalendarModal'
import { DaySummaryCard } from '../components/DaySummaryCard'

export default function Log() {
  const [cal, setCal] = useState(false)
  return (
    <div className="screen">
      <div className="header-row">
        <DateHeader onOpenCalendar={() => setCal(true)} />
      </div>
      <DaySummaryCard />
      {MEAL_KEYS.map(m => <MealCard key={m} meal={m} />)}
      <ExerciseCard />
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
