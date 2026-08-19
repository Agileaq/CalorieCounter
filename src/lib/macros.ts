/**
 * Default macro targets derived from a daily calorie budget, using the common
 * 50% carbs / 20% protein / 30% fat split. Carbs and protein are 4 cal/g, fat 9 cal/g.
 * These are only defaults — once stored in settings they are user-editable.
 */
export function derivedTargets(budget: number): { carbs: number; protein: number; fat: number } {
  return {
    carbs: Math.round((budget * 0.5) / 4),
    protein: Math.round((budget * 0.2) / 4),
    fat: Math.round((budget * 0.3) / 9),
  }
}
