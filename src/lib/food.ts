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
