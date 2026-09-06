/**
 * Weight data model + trend math for the Log-page check-in card and the
 * Goals-page trend chart. Everything here is pure: dates go in and out as
 * "YYYY-MM-DD" keys via the local-calendar helpers in ./date (never the
 * UTC-parsing single-string Date constructor), and `today` is always an
 * injected parameter so tests are deterministic.
 */
import type { DayLog, WeightTag } from '../types'
import { addDays, daysBetween, todayKey } from './date'

export const LB_PER_KG = 2.2046226218
export const MAX_GAP_DAYS = 7
export const SLOW_RATE = 0.005 // safe-loss corridor, slow rail (per week)
export const FAST_RATE = 0.01  // safe-loss corridor, fast rail (per week)

export const TAG_COLORS: Record<WeightTag, string> = {
  cheat: '#f5a623',
  strength: '#5b3df5',
  cardio: '#34c0eb',
  stress: '#8a8a8e',
  period: '#f56fa1',
}

export type Range = 30 | 90 | 'all'

export interface WeighIn { date: string; kg: number }
export interface DailyPoint { date: string; kg: number | undefined; trend: number | undefined }
export interface Series { start: string; end: string; points: DailyPoint[]; weighInCount: number }

export const round1 = (x: number) => Math.round(x * 10) / 10
export const kgToLb = (kg: number) => kg * LB_PER_KG
/** lb → kg, kept at 2 decimals so an lb round-trip never visibly drifts. */
export const lbToKg = (lb: number) => Math.round((lb / LB_PER_KG) * 100) / 100

export function extractWeighIns(days: Record<string, DayLog>): WeighIn[] {
  return Object.entries(days)
    .filter(([, d]) => typeof d.weightKg === 'number' && d.weightKg > 0)
    .map(([date, d]) => ({ date, kg: d.weightKg as number }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Per-calendar-day series over the visible window [start..today].
 * kg: the day's weigh-in, else a carry-forward of the last weigh-in
 * (≤ MAX_GAP_DAYS, then undefined — the "fuse" that stops stale flat lines),
 * else undefined. trend: 7-day simple moving average over the defined values
 * in the window (expanding during warm-up); undefined exactly where kg is
 * undefined, so after a fused gap the line resumes on the day of the next
 * weigh-in instead of staying broken for another week.
 */
export function dailySeries(days: Record<string, DayLog>, range: Range, today = todayKey()): Series {
  const weighIns = extractWeighIns(days)
  const first = weighIns[0]?.date
  if (!first || first > today) return { start: today, end: today, points: [], weighInCount: weighIns.length }
  const windowStart = range === 'all' ? first : addDays(today, -(range - 1))
  const start = windowStart < first ? first : windowStart
  const byDate = new Map(weighIns.map(w => [w.date, w.kg]))
  // a weigh-in just before the window still feeds carry-forward into the first days
  const pre = [...weighIns].reverse().find(w => w.date <= start)
  let lastDate: string | null = pre ? pre.date : null
  let lastKg: number | undefined = pre ? pre.kg : undefined
  const points: DailyPoint[] = []
  const n = daysBetween(start, today)
  for (let i = 0; i <= n; i++) {
    const date = addDays(start, i)
    const w = byDate.get(date)
    if (w != null) { lastDate = date; lastKg = w }
    const kg = w != null ? w
      : lastKg != null && lastDate != null && daysBetween(lastDate, date) <= MAX_GAP_DAYS ? lastKg
      : undefined
    let trend: number | undefined
    if (kg !== undefined) {
      let sum = 0
      let cnt = 0
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        const v = j === i ? kg : points[j]?.kg // points[i] isn't pushed yet
        if (v !== undefined) { sum += v; cnt++ }
      }
      trend = cnt > 0 ? sum / cnt : undefined
    }
    points.push({ date, kg, trend })
  }
  return { start, end: today, points, weighInCount: weighIns.length }
}
