import type { Food, Serving } from '../types'
import { emptyNutrition } from './nutrition'
import { newId } from './ids'

export const DEFAULT_ICON = '🍽️'

export function newServing(partial: Partial<Serving> = {}): Serving {
  return {
    id: newId(),
    kind: 'weight',
    label: 'Grams',
    amount: 100,
    unit: 'g',
    isPrimary: true,
    ...partial,
  }
}

export function newFood(partial: Partial<Food> = {}): Food {
  return {
    id: newId(),
    name: '',
    icon: DEFAULT_ICON,
    servings: [newServing()],
    nutrition: emptyNutrition(),
    source: 'custom',
    createdAt: new Date().toISOString(),
    ...partial,
  }
}

export function cloneAsCustom(food: Food): Food {
  const copy: Food = JSON.parse(JSON.stringify(food))
  copy.id = newId()
  copy.source = 'custom'
  copy.servings = copy.servings.map(s => ({ ...s, id: newId() }))
  return copy
}

/** Collapse to the primary serving only — the single-serving model keeps the
 *  primary and discards the rest. Nutrition is already expressed for the
 *  primary serving (per the Food type doc), so no rescaling is needed. */
export function collapseToPrimaryServing(food: Food): Food {
  const primary = food.servings.find(s => s.isPrimary) ?? food.servings[0]
  return { ...food, servings: [{ ...primary, isPrimary: true }] }
}
