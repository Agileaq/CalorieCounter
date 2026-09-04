import { useTranslation } from 'react-i18next'
import type { Nutrition } from '../types'
import { computedCalories } from '../lib/nutrition'
import { NumberInput } from './NumberInput'

type NumPath = (n: Nutrition, v: number) => Nutrition

function Field({ label, value, onChange, testId, indent }: { label: string; value: number; onChange: (v: number) => void; testId?: string; indent?: boolean }) {
  return (
    <div className="row spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', paddingInlineStart: indent ? 16 : 0 }}>
      <label style={{ color: indent ? 'var(--muted)' : 'inherit' }}>{label}</label>
      <NumberInput testId={testId} value={Number.isFinite(value) ? value : 0} onChange={onChange}
        style={{ width: 90, textAlign: 'end', border: 'none', background: 'transparent' }} />
    </div>
  )
}

export function NutritionFields({ nutrition, onChange }: { nutrition: Nutrition; onChange: (n: Nutrition) => void }) {
  const { t } = useTranslation()
  const set: (fn: NumPath) => (v: number) => void = (fn) => (v) => onChange(fn(nutrition, v))
  return (
    <div className="card">
      <div className="row spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
        <label>{t('foodForm.calories')}</label>
        <span data-testid="nutri-calories" style={{ width: 90, textAlign: 'end', fontWeight: 700 }}>{computedCalories(nutrition)}</span>
      </div>
      <Field label={t('foodForm.carbs')} value={nutrition.carbs.total} testId="nutri-carbs" onChange={set((n, v) => ({ ...n, carbs: { ...n.carbs, total: v } }))} />
      <Field indent label={t('foodForm.fiber')} value={nutrition.carbs.fiber} onChange={set((n, v) => ({ ...n, carbs: { ...n.carbs, fiber: v } }))} />
      <Field indent label={t('foodForm.sugar')} value={nutrition.carbs.sugar} onChange={set((n, v) => ({ ...n, carbs: { ...n.carbs, sugar: v } }))} />
      <Field label={t('foodForm.protein')} value={nutrition.protein} testId="nutri-protein" onChange={set((n, v) => ({ ...n, protein: v }))} />
      <Field label={t('foodForm.fat')} value={nutrition.fat.total} testId="nutri-fat" onChange={set((n, v) => ({ ...n, fat: { ...n.fat, total: v } }))} />
      <Field indent label={t('foodForm.mono')} value={nutrition.fat.mono} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, mono: v } }))} />
      <Field indent label={t('foodForm.poly')} value={nutrition.fat.poly} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, poly: v } }))} />
      <Field indent label={t('foodForm.saturated')} value={nutrition.fat.saturated} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, saturated: v } }))} />
      <Field indent label={t('foodForm.trans')} value={nutrition.fat.trans} onChange={set((n, v) => ({ ...n, fat: { ...n.fat, trans: v } }))} />
      <Field label={t('foodForm.cholesterol')} value={nutrition.cholesterol} onChange={set((n, v) => ({ ...n, cholesterol: v }))} />
      <Field label={t('foodForm.sodium')} value={nutrition.sodium} onChange={set((n, v) => ({ ...n, sodium: v }))} />
      <div className="muted" style={{ marginTop: 8 }}>{t('foodForm.vitamins')}</div>
      <Field indent label={t('foodForm.vitA')} value={nutrition.vitamins.a} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, a: v } }))} />
      <Field indent label={t('foodForm.vitC')} value={nutrition.vitamins.c} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, c: v } }))} />
      <Field indent label={t('foodForm.b1')} value={nutrition.vitamins.b1} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b1: v } }))} />
      <Field indent label={t('foodForm.b2')} value={nutrition.vitamins.b2} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b2: v } }))} />
      <Field indent label={t('foodForm.b3')} value={nutrition.vitamins.b3} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b3: v } }))} />
      <Field indent label={t('foodForm.b9')} value={nutrition.vitamins.b9} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b9: v } }))} />
      <Field indent label={t('foodForm.b6')} value={nutrition.vitamins.b6} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b6: v } }))} />
      <Field indent label={t('foodForm.b12')} value={nutrition.vitamins.b12} onChange={set((n, v) => ({ ...n, vitamins: { ...n.vitamins, b12: v } }))} />
      <div className="muted" style={{ marginTop: 8 }}>{t('foodForm.minerals')}</div>
      <Field indent label={t('foodForm.calcium')} value={nutrition.minerals.calcium} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, calcium: v } }))} />
      <Field indent label={t('foodForm.iron')} value={nutrition.minerals.iron} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, iron: v } }))} />
      <Field indent label={t('foodForm.magnesium')} value={nutrition.minerals.magnesium} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, magnesium: v } }))} />
      <Field indent label={t('foodForm.phosphorus')} value={nutrition.minerals.phosphorus} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, phosphorus: v } }))} />
      <Field indent label={t('foodForm.potassium')} value={nutrition.minerals.potassium} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, potassium: v } }))} />
      <Field indent label={t('foodForm.zinc')} value={nutrition.minerals.zinc} onChange={set((n, v) => ({ ...n, minerals: { ...n.minerals, zinc: v } }))} />
      <Field label={t('foodForm.caffeine')} value={nutrition.caffeine} onChange={set((n, v) => ({ ...n, caffeine: v }))} />
    </div>
  )
}
