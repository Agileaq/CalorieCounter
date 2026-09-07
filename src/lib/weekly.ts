import type { DayLog } from '../types'
import { emptyDay, hasExplicitRecords } from './storage'
import { weekOf } from './date'

export interface WeeklyBar { date: string; value: number; isToday: boolean }

export interface WeeklyStats { bars: WeeklyBar[]; avg: number | null; hitDays: number | null }

/**
 * Dashboard review stats for the week containing `selected`: the same Mon..Sun
 * `bars` shape as the dashboard bar charts plus an avg and a days-on-target
 * count for the conclusion lines. `avg` is the mean over RECORDED days (a meal
 * or exercise entry exists — see hasExplicitRecords; a weigh-in-only day is
 * "no data" and is skipped, not a silent zero) — null when no day in the week
 * is recorded. `hitDays` counts recorded days meeting `target` (`dir='max'`:
 * value ≤ target, `dir='min'`: value ≥ target); null when target ≤ 0 or no
 * day is recorded.
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
  const present = week.filter(date => {
    const d = days[date]
    return d !== undefined && hasExplicitRecords(d)
  })
  const values = present.map(date => metric(days[date]))
  const avg = present.length ? values.reduce((a, b) => a + b, 0) / present.length : null
  let hitDays: number | null = null
  if (target > 0 && present.length) {
    hitDays = values.filter(v => (dir === 'max' ? v <= target : v >= target)).length
  }
  return { bars, avg, hitDays }
}
