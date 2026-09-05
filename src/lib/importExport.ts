import type { Food, Settings, DayLog, MealMap } from '../types'

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
  // keep each food's own id and source: predefined entries land as overrides
  // (matching the predefined id), custom as My Foods. Rewriting the id here used
  // to discard the original — predefined overrides then keyed to a random id and
  // never matched their predefined food, so edits were silently lost on re-import.
  return foods
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

export type BackupData = {
  days: Record<string, DayLog>
  myFoods: Food[]
  settings: Settings
  foodOverrides?: Record<string, Food>
  hiddenFoods?: Record<string, true>
  customIcons?: string[]
}

export function exportBackup(data: BackupData): string {
  return JSON.stringify({ kind: 'backup', version: BACKUP_VERSION, ...data }, null, 2)
}

export function parseBackup(text: string): BackupData {
  let parsed: any
  try { parsed = JSON.parse(text) } catch { throw new Error('Invalid backup file') }
  if (!parsed || typeof parsed !== 'object' || !('days' in parsed) || !('myFoods' in parsed) || !('settings' in parsed)) {
    throw new Error('Invalid backup file')
  }
  return { days: parsed.days, myFoods: parsed.myFoods, settings: parsed.settings, foodOverrides: parsed.foodOverrides, hiddenFoods: parsed.hiddenFoods, customIcons: parsed.customIcons }
}

/**
 * Merge an incoming backup into the existing state, keyed by stable ids so that
 * re-importing the same export does not create duplicates. This is the "merge"
 * counterpart to replaceAll's overwrite semantics.
 *
 *   days         — union by date key; same-day meals union per-meal entries by
 *                  entry.id (incoming wins on conflict), exercise unions by id.
 *   myFoods      — union by id, falling back to name|brand; incoming wins.
 *   foodOverrides — shallow-merge maps; incoming keys overwrite.
 *   hiddenFoods   — shallow-merge; incoming keys overwrite.
 *   settings     — incoming wins (no merge semantics; the imported config is
 *                  the source of truth).
 */
export function mergeBackup(existing: BackupData, incoming: BackupData): BackupData {
  // — days —
  const days: Record<string, DayLog> = { ...existing.days }
  for (const [key, inDay] of Object.entries(incoming.days)) {
    const exDay = days[key]
    if (!exDay) { days[key] = inDay; continue }
    days[key] = {
      date: key,
      meals: mergeMeals(exDay.meals, inDay.meals),
      exercise: mergeById(exDay.exercise, inDay.exercise),
    }
  }

  // — myFoods (id first, name|brand fallback so two exports of the same custom
  //   food with mismatched ids still collapse to one) —
  const foodsById = new Map<string, Food>()
  for (const f of existing.myFoods) foodsById.set(f.id, f)
  for (const f of incoming.myFoods) {
    if (foodsById.has(f.id)) { foodsById.set(f.id, f); continue }
    // name|brand fallback: if an existing food has the same norm key, overwrite it
    let matched = false
    for (const [fid, ex] of foodsById) {
      if (ex.id === f.id) continue
      if (normKey(ex) === normKey(f)) { foodsById.set(fid, f); matched = true; break }
    }
    if (!matched) foodsById.set(f.id, f)
  }

  return {
    days,
    myFoods: [...foodsById.values()],
    settings: incoming.settings,
    foodOverrides: { ...existing.foodOverrides, ...incoming.foodOverrides },
    hiddenFoods: { ...existing.hiddenFoods, ...incoming.hiddenFoods },
    customIcons: [...new Set([...(existing.customIcons ?? []), ...(incoming.customIcons ?? [])])],
  }
}

function mergeMeals(ex: MealMap, inc: MealMap): MealMap {
  const out: MealMap = { breakfast: [], lunch: [], dinner: [], snacks: [] }
  for (const k of ['breakfast', 'lunch', 'dinner', 'snacks'] as const) {
    out[k] = mergeById(ex[k], inc[k])
  }
  return out
}

/** Union two arrays by their `id` field; on a clash the incoming item wins. */
function mergeById<T extends { id: string }>(ex: T[], inc: T[]): T[] {
  const map = new Map<string, T>()
  for (const x of ex) map.set(x.id, x)
  for (const y of inc) map.set(y.id, y)
  return [...map.values()]
}
