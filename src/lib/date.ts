export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function formatHeader(key: string, locale: string): string {
  return fromDateKey(key).toLocaleDateString(locale, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// Monday = 0 offset
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function weekOf(key: string): string[] {
  const d = fromDateKey(key)
  const monday = addDays(key, -mondayIndex(d))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function monthGrid(year: number, month0: number): string[][] {
  const first = new Date(year, month0, 1)
  const start = addDays(toDateKey(first), -mondayIndex(first))
  const weeks: string[][] = []
  let cursor = start
  // 6 weeks covers every possible month layout
  for (let w = 0; w < 6; w++) {
    const week: string[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}
