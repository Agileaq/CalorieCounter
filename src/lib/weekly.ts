import type { DayLog } from '../types'
import { emptyDay } from './storage'
import { weekOf } from './date'

export interface WeeklyBar { date: string; value: number; isToday: boolean }
export interface WeeklySeries { bars: WeeklyBar[]; avgPrior: number }

/**
 * Build the Mon..Sun series for the week containing `selected`, reading each day's
 * value through `metric`. `avgPrior` is the mean of days strictly before `selected`
 * in that week that have logged data (days with no data are excluded, not counted as 0).
 */
export function weeklySeries(
  days: Record<string, DayLog>,
  selected: string,
  metric: (d: DayLog) => number,
): WeeklySeries {
  const week = weekOf(selected)
  const bars: WeeklyBar[] = week.map(date => ({
    date,
    value: metric(days[date] ?? emptyDay(date)),
    isToday: date === selected,
  }))
  const prior = week.filter(date => date < selected && days[date] !== undefined)
  const priorValues = prior.map(date => metric(days[date]))
  const avgPrior = priorValues.length
    ? priorValues.reduce((a, b) => a + b, 0) / priorValues.length
    : 0
  return { bars, avgPrior }
}
