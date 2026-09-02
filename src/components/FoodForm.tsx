import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Food, Serving } from '../types'
import { newFood, newServing } from '../lib/food'
import { computedCalories } from '../lib/nutrition'
import { IconPicker } from './IconPicker'
import { NutritionFields } from './NutritionFields'
import { NumberInput } from './NumberInput'
import { SheetModal } from './SheetModal'

export function FoodForm({ initial, onSave, onClose }: { initial?: Food; onSave: (f: Food) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [food, setFood] = useState<Food>(() => initial ? JSON.parse(JSON.stringify(initial)) : newFood())
  const [showIcon, setShowIcon] = useState(false)
  const [error, setError] = useState('')

  function updateServing(id: string, patch: Partial<Serving>) {
    setFood(f => ({ ...f, servings: f.servings.map(s => s.id === id ? { ...s, ...patch } : s) }))
  }
  function addServing() { setFood(f => ({ ...f, servings: [...f.servings, newServing({ isPrimary: false })] })) }
  function makePrimary(id: string) {
    setFood(f => ({ ...f, servings: f.servings.map(s => ({ ...s, isPrimary: s.id === id })) }))
  }

  function save() {
    if (!food.name.trim()) { setError(t('foodForm.foodName')); return }
    if (food.servings.length < 1) { setError(t('foodForm.oneServingRequired')); return }
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
        {food.servings.map(s => (
          <div key={s.id} className="row spread" style={{ padding: '8px 0' }}>
            <input value={s.label} onChange={e => updateServing(s.id, { label: e.target.value })} style={{ width: 90 }} />
            <NumberInput value={s.amount} onChange={v => updateServing(s.id, { amount: v })} style={{ width: 70, textAlign: 'end' }} />
            <input value={s.unit} onChange={e => updateServing(s.id, { unit: e.target.value })} style={{ width: 50 }} />
            <label className="muted"><input type="radio" name="primary" checked={s.isPrimary} onChange={() => makePrimary(s.id)} /> ★</label>
          </div>
        ))}
        <button className="btn-ghost" onClick={addServing}>{t('foodForm.addServing')}</button>
      </div>
      <NutritionFields nutrition={food.nutrition} onChange={n => setFood({ ...food, nutrition: n })} />
      {showIcon && <IconPicker value={food.icon} onChange={c => setFood(f => ({ ...f, icon: c }))} onClose={() => setShowIcon(false)} />}
    </SheetModal>
  )
}
