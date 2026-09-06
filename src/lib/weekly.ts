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

export interface WeeklyStats { bars: WeeklyBar[]; avg: number | null; hitDays: number | null }

/**
 * Dashboard review stats for the week containing `selected`: the same Mon..Sun
 * `bars` as weeklySeries plus an avg and a days-on-target count for the
 * conclusion lines. `avg` is the mean over days PRESENT in `days` (selected
 * day included; an opened-but-empty day is a real 0) — null when no day in the
 * week is present. `hitDays` counts present days meeting `target` (`dir='max'`:
 * value ≤ target, `dir='min'`: value ≥ target); null when target ≤ 0 or no
 * day is present.
 */
export function weeklyStats(
  days: Record<string, DayLog>,
  selected: string,
  metric: (d: DayLog) => number,
  target: number,
  dir: 'max' | 'min',
): WeeklyStats {
  const week = weekOf(selected)
  const bars: WeeklyBar[] = week.map(date => ({
    date,
    value: metric(days[date] ?? emptyDay(date)),
    isToday: date === selected,
  }))
  const present = week.filter(date => days[date] !== undefined)
  const values = present.map(date => metric(days[date]))
  const avg = present.length ? values.reduce((a, b) => a + b, 0) / present.length : null
  let hitDays: number | null = null
  if (target > 0 && present.length) {
    hitDays = values.filter(v => (dir === 'max' ? v <= target : v >= target)).length
  }
  return { bars, avg, hitDays }
}
