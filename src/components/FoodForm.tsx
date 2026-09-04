import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Food, Serving } from '../types'
import { newFood, collapseToPrimaryServing } from '../lib/food'
import { computedCalories } from '../lib/nutrition'
import { IconPicker } from './IconPicker'
import { NutritionFields } from './NutritionFields'
import { NumberInput } from './NumberInput'
import { SheetModal } from './SheetModal'

export function FoodForm({ initial, onSave, onClose }: { initial?: Food; onSave: (f: Food) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [food, setFood] = useState<Food>(() => {
    const base = initial ? JSON.parse(JSON.stringify(initial)) : newFood()
    const collapsed = collapseToPrimaryServing(base)
    // For a brand-new food, start the serving row empty — label/amount/unit are
    // all hinted via placeholders rather than prefilled with "Grams / 100 / g".
    // Editing an existing food keeps its serving values as-is.
    if (!initial) {
      collapsed.servings = collapsed.servings.map(s => ({ ...s, label: '', amount: 0, unit: '' }))
    }
    return collapsed
  })
  const [showIcon, setShowIcon] = useState(false)
  const [error, setError] = useState('')

  function updateServing(id: string, patch: Partial<Serving>) {
    setFood(f => ({ ...f, servings: f.servings.map(s => s.id === id ? { ...s, ...patch } : s) }))
  }

  function save() {
    if (!food.name.trim()) { setError(t('foodForm.foodName')); return }
    // calories are always derived from macros (fat×9 + carbs×4 + protein×4);
    // id/source stay as-is — the caller decides where the food lands
    onSave({ ...food, nutrition: { ...food.nutrition, calories: computedCalories(food.nutrition) } })
    onClose()
  }

  return (
    <SheetModal onClose={onClose} dismissible={false}>
      <div className="row spread">
        <button className="icon-btn" aria-label={t('common.back')} onClick={onClose}>←</button>
        <strong>{initial ? t('foodForm.editFood') : t('foodForm.newFood')}</strong>
        <button className="btn-accent" data-testid="food-save" onClick={save}>{t('common.save')}</button>
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
      <div className="card">
        <input data-testid="food-name" placeholder={t('foodForm.foodName')} value={food.name}
          onChange={e => setFood({ ...food, name: e.target.value })} style={{ width: '100%', padding: 8, border: 'none', borderBottom: '1px solid var(--line)' }} />
        <input placeholder={t('foodForm.brand')} value={food.brand ?? ''}
          onChange={e => setFood({ ...food, brand: e.target.value })} style={{ width: '100%', padding: 8, border: 'none', borderBottom: '1px solid var(--line)' }} />
        <button className="row spread" style={{ width: '100%', padding: 8, background: 'transparent', border: 'none' }} onClick={() => setShowIcon(true)}>
          <span>{t('foodForm.icon')}</span><span style={{ fontSize: 22 }}>{food.icon}</span>
        </button>
      </div>
      <div className="card">
        <strong>{t('foodForm.nutritionFacts')}</strong>
        <div className="muted">{t('foodForm.servingsNote')}</div>
        <div className="row spread" style={{ padding: '8px 0' }}>
          <input data-testid="serving-label" placeholder={t('foodForm.servingLabelHint')} value={food.servings[0].label}
            onChange={e => updateServing(food.servings[0].id, { label: e.target.value })} style={{ flex: 1 }} />
          <NumberInput testId="serving-amount" placeholder={t('foodForm.servingAmountHint')} hideZero
            value={food.servings[0].amount}
            onChange={v => updateServing(food.servings[0].id, { amount: v })} style={{ width: 70, textAlign: 'end' }} />
          <input data-testid="serving-unit" value={food.servings[0].unit} placeholder={t('foodForm.servingUnitHint')} onChange={e => updateServing(food.servings[0].id, { unit: e.target.value })} style={{ width: 50 }} />
        </div>
      </div>
      <NutritionFields nutrition={food.nutrition} onChange={n => setFood({ ...food, nutrition: n })} />
      {showIcon && <IconPicker value={food.icon} onChange={c => setFood(f => ({ ...f, icon: c }))} onClose={() => setShowIcon(false)} />}
    </SheetModal>
  )
}
