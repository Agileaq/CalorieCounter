/**
 * Default macro targets for a daily calorie budget, based on a reference
 * 80 kg body weight: protein 1.8 g/kg (=144 g), fat 0.8 g/kg (=64 g), and
 * carbs get whatever calories the budget leaves over (÷ 4 cal/g, floored at 0).
 * These are only defaults — once stored in settings they are user-editable.
 */
export const REFERENCE_WEIGHT_KG = 80
export const PROTEIN_G_PER_KG = 1.8
export const FAT_G_PER_KG = 0.8

export function derivedTargets(budget: number): { carbs: number; protein: number; fat: number } {
  const protein = Math.round(REFERENCE_WEIGHT_KG * PROTEIN_G_PER_KG)
  const fat = Math.round(REFERENCE_WEIGHT_KG * FAT_G_PER_KG)
  const carbs = Math.max(0, Math.round((budget - protein * 4 - fat * 9) / 4))
  return { carbs, protein, fat }
}
