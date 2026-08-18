import { useState } from 'react'
import { MEAL_KEYS } from '../types'
import { DateHeader } from '../components/DateHeader'
import { MealCard } from '../components/MealCard'
import { CalendarModal } from '../components/CalendarModal'

export default function Log() {
  const [cal, setCal] = useState(false)
  return (
    <div className="screen">
      <DateHeader onOpenCalendar={() => setCal(true)} />
      {MEAL_KEYS.map(m => <MealCard key={m} meal={m} />)}
      {cal && <CalendarModal onClose={() => setCal(false)} />}
    </div>
  )
}
