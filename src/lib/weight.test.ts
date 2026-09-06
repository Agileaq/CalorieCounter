import { describe, it, expect } from 'vitest'
import type { DayLog, WeightTag } from '../types'
import {
  LB_PER_KG, MAX_GAP_DAYS, dailySeries, extractWeighIns, kgToLb, lbToKg, round1,
} from './weight'

function D(date: string, kg: number, tags?: WeightTag[]): Record<string, DayLog> {
  return {
    [date]: {
      date, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercise: [], weightKg: kg, tags,
    },
  }
}

describe('weight conversions', () => {
  it('uses the locked lb/kg factor and precision', () => {
    expect(LB_PER_KG).toBeCloseTo(2.20462, 4)
    expect(MAX_GAP_DAYS).toBe(7)
    expect(lbToKg(181.8)).toBeCloseTo(82.46, 2)
    expect(kgToLb(82.46)).toBeCloseTo(181.8, 1)
    expect(round1(82.459)).toBe(82.5)
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
})
