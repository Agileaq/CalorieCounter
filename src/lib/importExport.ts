import type { Food, Settings, DayLog } from '../types'
import { newId } from './ids'

const FOODS_VERSION = 1
const BACKUP_VERSION = 1

export function exportFoods(foods: Food[]): string {
  return JSON.stringify({ kind: 'foods', version: FOODS_VERSION, foods }, null, 2)
}

function isFoodArray(v: unknown): v is Food[] {
  return Array.isArray(v) && v.every(x => x && typeof x === 'object' && 'name' in x && 'nutrition' in x)
}

export function parseFoodsImport(text: string): Food[] {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('Invalid foods file') }
  let foods: unknown
  if (isFoodArray(parsed)) foods = parsed
  else if (parsed && typeof parsed === 'object' && 'foods' in parsed) foods = (parsed as { foods: unknown }).foods
  if (!isFoodArray(foods)) throw new Error('Invalid foods file')
  return foods.map(food => ({ ...food, id: newId(), source: 'custom' as const }))
}

function normKey(f: Food): string {
  return `${f.name.trim().toLowerCase()}|${(f.brand ?? '').trim().toLowerCase()}`
}

export function mergeFoods(existing: Food[], incoming: Food[]): Food[] {
  const map = new Map<string, Food>()
  for (const f of existing) map.set(normKey(f), f)
  for (const f of incoming) map.set(normKey(f), f)
  return [...map.values()]
}

export function exportBackup(data: { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings }): string {
  return JSON.stringify({ kind: 'backup', version: BACKUP_VERSION, ...data }, null, 2)
}

export function parseBackup(text: string): { days: Record<string, DayLog>; myFoods: Food[]; settings: Settings } {
  let parsed: any
  try { parsed = JSON.parse(text) } catch { throw new Error('Invalid backup file') }
  if (!parsed || typeof parsed !== 'object' || !('days' in parsed) || !('myFoods' in parsed) || !('settings' in parsed)) {
    throw new Error('Invalid backup file')
  }
  return { days: parsed.days, myFoods: parsed.myFoods, settings: parsed.settings }
}
