/**
 * Weight data model + trend math for the Log-page check-in card and the
 * Goals-page trend chart. Everything here is pure: dates go in and out as
 * "YYYY-MM-DD" keys via the local-calendar helpers in ./date (never the
 * UTC-parsing single-string Date constructor), and `today` is always an
 * injected parameter so tests are deterministic.
 */
import type { DayLog, WeightTag } from '../types'
import { addDays, daysBetween, todayKey, weekOf } from './date'
import { dayFoodNutrition, exerciseTotal } from './nutrition'

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

export interface RailPoint { date: string; v: number }
export interface Corridor { anchorDate: string; slow: RailPoint[]; fast: RailPoint[] }

/**
 * Funnel from the trend value at the 3rd weigh-in (noise-proof anchor: a bad
 * first day can't tilt the corridor) down to the goal weight. Each rail is
 * w0 − w0·rate·weeks; it stops at the first day it touches the goal, so the
 * fast rail ends sooner and the funnel visibly "closes". Null when there is
 * no goal, fewer than 3 weigh-ins, or the goal is not below the anchor.
 */
export function safeCorridor(weighIns: WeighIn[], s: Series, goalWeightKg: number | null): Corridor | null {
  if (goalWeightKg == null || weighIns.length < 3) return null
  const anchorDate = weighIns[2].date < s.start ? s.start : weighIns[2].date
  const idx = daysBetween(s.start, anchorDate)
  const w0 = s.points[idx]?.trend
  if (w0 == null || goalWeightKg >= w0) return null
  const rail = (rate: number): RailPoint[] => {
    const out: RailPoint[] = []
    for (let i = idx; i < s.points.length; i++) {
      const v = w0 - w0 * rate * (daysBetween(anchorDate, s.points[i].date) / 7)
      if (v <= goalWeightKg) { out.push({ date: s.points[i].date, v: goalWeightKg }); break }
      out.push({ date: s.points[i].date, v })
    }
    return out
  }
  return { anchorDate, slow: rail(SLOW_RATE), fast: rail(FAST_RATE) }
}

export interface WeekRate { weekStart: string; delta: number }

/**
 * Δ of the trend line per ISO week (Mon-based). Only weeks that have fully
 * ended (weekStart+7 ≤ today) are returned — an in-progress week understates
 * the rate. Δ spans the week's first..last defined trend days, so a mid-week
 * first weigh-in folds naturally; a week with a single flat value yields 0
 * and the chart skips zero bars.
 */
export function weeklyRate(s: Series, today = todayKey()): WeekRate[] {
  const first = s.points.find(p => p.trend !== undefined)
  if (!first) return []
  const out: WeekRate[] = []
  let ws = weekOf(first.date)[0]
  while (addDays(ws, 7) <= today) {
    const defined = s.points.filter(p => p.date >= ws && p.date < addDays(ws, 7) && p.trend !== undefined)
    if (defined.length >= 2) {
      out.push({ weekStart: ws, delta: (defined[defined.length - 1].trend as number) - (defined[0].trend as number) })
    }
    ws = addDays(ws, 7)
  }
  return out
}

export interface DeficitPoint { date: string; deficit: number }

/**
 * Daily energy balance against the CURRENT daily budget (the app stores no
 * historical budgets — documented limitation). A negative deficit (green)
 * means eating under budget. Only day keys actually present in `days` are
 * returned: a never-opened day is "no data", while an opened-but-empty day
 * is a real zero-intake day.
 */
export function deficitSeries(days: Record<string, DayLog>, s: Series, budget: number): DeficitPoint[] {
  return s.points
    .filter(p => days[p.date] != null)
    .map(p => {
      const d = days[p.date]
      return { date: p.date, deficit: (dayFoodNutrition(d).calories - exerciseTotal(d)) - budget }
    })
}

/** Main-chart Y range: 20% padding per side, floored at minPad so a ~1kg spread never looks like a rollercoaster. */
export function padBounds(min: number, max: number, padRatio = 0.2, minPad = 0.5): { lo: number; hi: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return { lo: 0, hi: 1 }
  if (min === max) return { lo: min - minPad, hi: max + minPad }
  const pad = Math.max((max - min) * padRatio, minPad)
  return { lo: min - pad, hi: max + pad }
}

/** Sub-chart Y range: symmetric around 0 at 1.2 × the largest magnitude (≥ floor). */
export function symmetricBounds(values: number[], floor: number): { lo: number; hi: number } {
  const m = Math.max(0, ...values.map(v => Math.abs(v)), floor)
  return { lo: -m * 1.2, hi: m * 1.2 }
}
