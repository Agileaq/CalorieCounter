import { describe, it, expect } from 'vitest'
import type { DayLog, WeightTag } from '../types'
import {
  LB_PER_KG, MAX_GAP_DAYS, dailySeries, extractWeighIns, kgToLb, lbToKg, round1,
  safeCorridor, deficitSeries, padBounds, symmetricBounds, deficitWeekSummary, trendDirection,
  resolveReviewWeightKg,
} from './weight'
import { emptyNutrition } from './nutrition'

function D(date: string, kg: number, tags?: WeightTag[]): Record<string, DayLog> {
  return {
    [date]: {
      date, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], weightKg: kg, tags,
    },
  }
}

function dayWithCals(date: string, calories: number, burned = 0): DayLog {
  const base = emptyNutrition()
  return {
    date,
    meals: {
      breakfast: calories
        ? [{
            id: 'e1', servingId: 's', quantity: 1,
            foodSnapshot: {
              id: 'f1', name: 'Rice', icon: '🍚', source: 'custom', createdAt: '',
              servings: [{ id: 's', kind: 'weight', label: 'Grams', amount: 100, unit: 'g', isPrimary: true }],
              nutrition: { ...base, calories },
            },
          }]
        : [],
      lunch: [], dinner: [], snacks: [],
    },
    exercise: burned ? [{ id: 'x1', name: 'Run', caloriesBurned: burned }] : [],
  }
}

describe('weight conversions', () => {
  it('uses the locked lb/kg factor and 3-decimal lb storage precision', () => {
    expect(LB_PER_KG).toBeCloseTo(2.20462, 4)
    expect(MAX_GAP_DAYS).toBe(7)
    expect(lbToKg(181.8)).toBe(82.463)
    expect(kgToLb(82.463)).toBeCloseTo(181.8, 1)
    expect(round1(82.459)).toBe(82.5)
  })
  it('lb round-trip never drifts at display precision (2-decimal storage made 175.5 read back as 175.4)', () => {
    expect(kgToLb(lbToKg(175.5)).toFixed(1)).toBe('175.5')
    expect(kgToLb(lbToKg(180.3)).toFixed(1)).toBe('180.3')
  })
})

describe('extractWeighIns', () => {
  it('collects and sorts positive weights only', () => {
    const days = { ...D('2026-01-03', 79), ...D('2026-01-01', 80), ...D('2026-01-02', 0) }
    expect(extractWeighIns(days)).toEqual([
      { date: '2026-01-01', kg: 80 },
      { date: '2026-01-03', kg: 79 },
    ])
  })
})

describe('resolveReviewWeightKg', () => {
  it('uses the latest weigh-in, whatever its date', () => {
    const days = { ...D('2026-01-01', 80), ...D('2026-01-10', 82.4) }
    expect(resolveReviewWeightKg(days, 75)).toBe(82.4)
  })
  it('falls back to the goal weight when nothing was ever weighed', () => {
    expect(resolveReviewWeightKg({}, 75.5)).toBe(75.5)
  })
  it('falls back to the 80 kg base when there is no weigh-in and no goal', () => {
    expect(resolveReviewWeightKg({}, null)).toBe(80)
  })
})

describe('dailySeries', () => {
  it('returns an empty series without weigh-ins', () => {
    const s = dailySeries({}, 'all', '2026-01-15')
    expect(s.points).toEqual([])
    expect(s.weighInCount).toBe(0)
  })
  it('carry-forward fills ≤7 days then fuses', () => {
    const days = { ...D('2026-01-01', 80), ...D('2026-01-11', 79) }
    const s = dailySeries(days, 'all', '2026-01-11')
    expect(s.start).toBe('2026-01-01')
    expect(s.end).toBe('2026-01-11')
    expect(s.points[0].kg).toBe(80)
    expect(s.points[7].kg).toBe(80)         // 01-08, last valid carry (1 + 7)
    expect(s.points[8].kg).toBeUndefined()  // 01-09 fused
    expect(s.points[9].kg).toBeUndefined()
    expect(s.points[10].kg).toBe(79)        // 01-11 resume
  })
  it('trend dies with kg and resumes immediately at the new weigh-in', () => {
    const days = { ...D('2026-01-01', 80), ...D('2026-01-11', 79) }
    const s = dailySeries(days, 'all', '2026-01-11')
    expect(s.points[0].trend).toBe(80)          // expanding window from day one
    expect(s.points[8].trend).toBeUndefined()   // fused → no line
    // defined window values at 01-11: carry days 01-05..01-08 (80) + new 79
    expect(s.points[10].trend).toBeCloseTo((80 * 4 + 79) / 5, 5)
  })
  it('single weigh-in stays flat while carried, then stops', () => {
    const s = dailySeries(D('2026-01-01', 80), 'all', '2026-01-15')
    expect(s.points[7].kg).toBe(80)
    expect(s.points[7].trend).toBe(80)
    expect(s.points[8].kg).toBeUndefined()
    expect(s.points[8].trend).toBeUndefined()
    expect(s.points).toHaveLength(15) // 01-01..01-15 inclusive
  })
  it('warm-up is an expanding window: trend[0] equals the first weigh-in exactly', () => {
    const s = dailySeries({ ...D('2026-01-01', 91), ...D('2026-01-02', 92.5), ...D('2026-01-03', 92.5) }, 'all', '2026-01-03')
    expect(s.points[0].trend).toBe(91)
    expect(s.points[1].trend).toBeCloseTo(91.75, 5)
    expect(s.points[2].trend).toBeCloseTo(92, 5)
  })
  it('30-day window: pre-window weigh-in beyond the fuse does not carry', () => {
    const days = { ...D('2025-12-01', 80), ...D('2026-01-15', 79) }
    const s = dailySeries(days, 30, '2026-01-15')
    expect(s.start).toBe('2025-12-17')     // today − 29
    expect(s.points[0].kg).toBeUndefined() // 12-17 is 16 days after 12-01 → fused
    expect(s.points[s.points.length - 1].kg).toBe(79)
  })
  it('all range starts at the first weigh-in', () => {
    const days = { ...D('2025-12-01', 80), ...D('2026-01-15', 79) }
    const s = dailySeries(days, 'all', '2026-01-15')
    expect(s.start).toBe('2025-12-01')
    expect(s.points[0].kg).toBe(80)
  })
  it("'week' renders exactly the anchor date's Mon–Sun, carrying across Monday", () => {
    // 2026-09-11 is a Friday; its week runs Mon 09-07 .. Sun 09-13
    const days = { ...D('2026-09-01', 80), ...D('2026-09-09', 79), ...D('2026-09-20', 78) }
    const s = dailySeries(days, 'week', '2026-09-11', '2026-09-11')
    expect(s.start).toBe('2026-09-07')
    expect(s.end).toBe('2026-09-13')
    expect(s.points).toHaveLength(7)
    expect(s.points[0].kg).toBe(80)          // Monday: carried from 09-01 (6-day gap ≤ fuse)
    expect(s.points[0].trend).toBe(80)       // expanding window from day one
    expect(s.points[2].kg).toBe(79)          // Wednesday weigh-in
    expect(s.points[6].kg).toBe(79)          // Sunday: carried from 09-09 (4 days)
    // the 09-20 weigh-in stays outside the window entirely
    expect(s.points.some(p => p.kg === 78)).toBe(false)
  })
  it("'week' past all data yields week bounds with only undefined points", () => {
    const s = dailySeries(D('2026-01-01', 80), 'week', '2026-09-11', '2026-09-11')
    expect(s.start).toBe('2026-09-07')
    expect(s.end).toBe('2026-09-13')
    expect(s.points).toHaveLength(7)
    expect(s.points.every(p => p.kg === undefined && p.trend === undefined)).toBe(true)
  })
})

describe('safeCorridor', () => {
  const WI = [
    { date: '2026-01-01', kg: 80 },
    { date: '2026-01-02', kg: 79.5 },
    { date: '2026-01-03', kg: 79 },
  ]
  const days = { ...D('2026-01-01', 80), ...D('2026-01-02', 79.5), ...D('2026-01-03', 79) }

  it('starts at W₀ on day 1 and only descends, clamped at goal', () => {
    const s = dailySeries(days, 'all', '2026-02-15')
    const c = safeCorridor(WI, s, 78)!
    expect(c.anchorDate).toBe('2026-01-03')
    const w0 = s.points[2].trend! // (80 + 79.5 + 79) / 3 = 79.5
    expect(w0).toBeCloseTo(79.5, 5)
    // day-1 coverage: rails start at W₀ on the first weigh-in and never rise back
    expect(c.slow[0].date).toBe('2026-01-01')
    expect(c.slow[0].v).toBeCloseTo(w0, 5)
    expect(c.slow.find(p => p.date === '2026-01-08')!.v).toBeCloseTo(w0 * 0.995, 5) // one week down
    // fast rail reaches the goal first; both rails end clamped at the goal
    expect(c.fast[c.fast.length - 1].v).toBe(78)
    expect(c.slow[c.slow.length - 1].v).toBe(78)
    expect(c.fast.length).toBeLessThan(c.slow.length)
  })
  it('stays null below 3 weigh-ins — corridor unlocks together with the SMA', () => {
    const s = dailySeries(days, 'all', '2026-02-15')
    expect(safeCorridor(WI.slice(0, 1), s, 78)).toBeNull()
    expect(safeCorridor(WI.slice(0, 2), s, 78)).toBeNull()
  })
  it('is null without a goal, with no weigh-ins, or when goal ≥ W₀', () => {
    const s = dailySeries(days, 'all', '2026-02-15')
    expect(safeCorridor(WI, s, null)).toBeNull()
    expect(safeCorridor(WI, s, 90)).toBeNull()
    expect(safeCorridor(WI, s, 79.5)).toBeNull() // 79.5 ≥ W₀ (trend at the 3rd weigh-in)
  })
})

describe('deficitSeries', () => {
  it('recorded days only — deficit = (food − exercise) − budget; weigh-in-only days are no data', () => {
    const days: Record<string, DayLog> = {
      '2026-01-01': { ...dayWithCals('2026-01-01', 500, 200), weightKg: 80 }, // recorded → −1948
      '2026-01-02': { ...dayWithCals('2026-01-02', 0, 100), weightKg: 80 },   // exercise-only → real zero intake → −2348
      '2026-01-03': { ...dayWithCals('2026-01-03', 0), weightKg: 80 },        // weigh-in only → no data → no bar
    }
    const s = dailySeries(days, 'all', '2026-01-04')
    const d = deficitSeries(days, s, 2248)
    expect(d.find(p => p.date === '2026-01-01')!.deficit).toBe(-1948)
    expect(d.find(p => p.date === '2026-01-02')!.deficit).toBe(-2348)
    expect(d.find(p => p.date === '2026-01-03')).toBeUndefined() // no explicit record → skipped
    expect(d.find(p => p.date === '2026-01-04')).toBeUndefined() // day key absent
  })
})

describe('bounds', () => {
  it('pad is 20% of range with a 0.5 floor per side', () => {
    expect(padBounds(80, 85)).toEqual({ lo: 79, hi: 86 })
    expect(padBounds(80, 80.05)).toEqual({ lo: 79.5, hi: 80.55 })
    expect(padBounds(80, 80)).toEqual({ lo: 79.5, hi: 80.5 })
  })
  it('symmetric bounds are ±max(|v|, floor) × 1.2', () => {
    expect(symmetricBounds([1948, -500], 1)).toEqual({ lo: -2337.6, hi: 2337.6 })
    expect(symmetricBounds([], 0.5)).toEqual({ lo: -0.6, hi: 0.6 })
  })
})

describe('deficitWeekSummary', () => {
  // Week of Wed 2026-01-07 is Mon 2026-01-05 .. Sun 2026-01-11
  it('sums recorded days of the calendar week containing selected, Mon..Sun', () => {
    const days: Record<string, DayLog> = {
      '2026-01-04': { ...dayWithCals('2026-01-04', 500, 200), weightKg: 80 }, // previous week's Sunday → excluded
      '2026-01-05': { ...dayWithCals('2026-01-05', 500, 200), weightKg: 80 }, // Monday → −1948
      '2026-01-06': { ...dayWithCals('2026-01-06', 0), weightKg: 80 },         // weigh-in only → no data
      '2026-01-07': { ...dayWithCals('2026-01-07', 3000), weightKg: 80 },     // selected → +752
      '2026-01-08': { ...dayWithCals('2026-01-08', 4248), weightKg: 80 },     // pre-logged Thursday → +2000
    }
    const r = deficitWeekSummary(days, '2026-01-07', 2248)
    expect(r.hasData).toBe(true)
    expect(r.totalKcal).toBe(-1948 + 752 + 2000)
  })
  it('no recorded day in the week → hasData=false, total 0', () => {
    expect(deficitWeekSummary({}, '2026-01-07', 2248)).toEqual({ totalKcal: 0, hasData: false })
    const weighOnly = { '2026-01-06': { ...dayWithCals('2026-01-06', 0), weightKg: 80 } }
    expect(deficitWeekSummary(weighOnly, '2026-01-07', 2248)).toEqual({ totalKcal: 0, hasData: false })
  })
})

describe('trendDirection', () => {
  const days = {
    ...D('2026-01-01', 80), ...D('2026-01-08', 78), ...D('2026-01-15', 76), ...D('2026-01-22', 74),
  }
  const s = dailySeries(days, 'all', '2026-01-22')
  it('falls on a steep decline (Δ ≤ −0.15)', () => {
    // trend(01-22) = 76 (carry window), trend(01-15) = (6×78 + 76)/7 ≈ 77.71 → Δ ≈ −1.71
    expect(trendDirection(s, '2026-01-22')).toBe('down')
  })
  it('is stable within the 0.15 kg threshold', () => {
    const flat = dailySeries({ ...D('2026-01-01', 80), ...D('2026-01-08', 79.9), ...D('2026-01-15', 79.8) }, 'all', '2026-01-15')
    expect(trendDirection(flat, '2026-01-15')).toBe('stable')
  })
  it('rises', () => {
    const up = dailySeries({ ...D('2026-01-01', 80), ...D('2026-01-08', 81), ...D('2026-01-15', 82) }, 'all', '2026-01-15')
    expect(trendDirection(up, '2026-01-15')).toBe('up')
  })
  it('is null when either endpoint lacks a trend', () => {
    expect(trendDirection(s, '2026-01-01')).toBeNull()  // no trend 7 days earlier
    expect(trendDirection(s, '2025-12-25')).toBeNull()  // date outside the series
  })
})
