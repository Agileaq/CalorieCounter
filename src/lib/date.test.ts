import { describe, it, expect } from 'vitest'
import { toDateKey, fromDateKey, addDays, monthGrid, weekOf } from './date'

describe('date utils', () => {
  it('toDateKey formats local date', () => {
    expect(toDateKey(new Date(2026, 7, 18))).toBe('2026-08-18')
  })
  it('fromDateKey round-trips', () => {
    expect(toDateKey(fromDateKey('2026-08-18'))).toBe('2026-08-18')
  })
  it('addDays crosses month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31')
  })
  it('monthGrid for Aug 2026 is Mon-first and 6 weeks', () => {
    const grid = monthGrid(2026, 7)
    expect(grid[0][0]).toBe('2026-07-27') // Mon before Aug 1 (Sat)
    expect(grid.flat()).toContain('2026-08-18')
    expect(grid[grid.length - 1]).toHaveLength(7)
  })
  it('weekOf returns Mon..Sun containing the date', () => {
    const w = weekOf('2026-08-18') // Tue
    expect(w).toHaveLength(7)
    expect(w[0]).toBe('2026-08-17') // Mon
    expect(w[6]).toBe('2026-08-23') // Sun
  })
})
