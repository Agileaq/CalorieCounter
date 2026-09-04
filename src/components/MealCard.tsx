import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { MealKey } from '../types'
import { mealNutrition, entryNutrition, primaryServing } from '../lib/nutrition'
import { FoodPicker } from './FoodPicker'
import { FoodDetail } from './FoodDetail'

export function MealCard({ meal }: { meal: MealKey }) {
  const { t } = useTranslation()
  const { day, addEntry, updateEntry, deleteEntry, clearMeal } = useApp()
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const entries = day.meals[meal]
  const n = mealNutrition(day, meal)

  return (
    <div className="card">
      <div className="row spread">
        <strong>{t(`meal.${meal}`)}: {t('meal.cals', { n: Math.round(n.calories) })}</strong>
        <button className="btn-ghost" aria-label={t('common.menu')} onClick={() => setMenu(m => !m)}>⋯</button>
      </div>
      <div className="muted" data-testid="meal-total">{t('meal.macros', { c: Math.round(n.carbs.total), p: Math.round(n.protein), f: Math.round(n.fat.total), fi: Math.round(n.carbs.fiber) })}</div>
      {menu && <button className="btn-ghost" onClick={() => { clearMeal(meal); setMenu(false) }}>{t('meal.clear')}</button>}
      {entries.map(e => {
        const ps = primaryServing(e.foodSnapshot)
        const en = entryNutrition(e)
        // e.g. qty 1.5 × 100g → "1.5 份 · 150 g · Grams". When the serving has
        // no label (blank/whitespace-only), the trailing " · {label}" segment
        // is dropped via entrySubtitleNoLabel so it reads "1.5 份 · 150 g".
        // count servings use the same templates; total is rounded to one
        // decimal to shed JS float tails (1.1×100 = 110.00000000000001).
        const total = Math.round(e.quantity * ps.amount * 10) / 10
        const label = ps.label.trim()
        const subtitle = label
          ? t('meal.entrySubtitle', { count: e.quantity, total, unit: ps.unit, label })
          : t('meal.entrySubtitleNoLabel', { count: e.quantity, total, unit: ps.unit })
        return (
          <div key={e.id} className="row spread" style={{ padding: '8px 0' }}>
            <button type="button" data-testid="entry-edit" aria-label={t('common.edit')} onClick={() => setEditingId(e.id)}
              className="row" style={{ gap: 8, flex: 1, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start', font: 'inherit', color: 'inherit' }}>
              <span style={{ fontSize: 18 }}>{e.foodSnapshot.icon}</span>
              <div>
                <div className="row" style={{ gap: 6, alignItems: 'baseline', fontSize: 13 }}>
                  <span>{e.foodSnapshot.name}</span>
                  <span className="muted" data-testid="entry-subtitle">{subtitle}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }} data-testid="entry-macros">{t('meal.macros', { c: Math.round(en.carbs.total), p: Math.round(en.protein), f: Math.round(en.fat.total), fi: Math.round(en.carbs.fiber) })}</div>
              </div>
            </button>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 13 }}>{t('meal.cals', { n: Math.round(en.calories) })}</span>
              <button className="icon-btn" style={{ width: 28, height: 28, fontSize: 14 }} aria-label={t('common.deleteEntry', { name: e.foodSnapshot.name })} onClick={() => deleteEntry(meal, e.id)}>✕</button>
            </div>
          </div>
        )
      })}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn-accent" onClick={() => setAdding(true)}>{t('meal.addFood')}</button>
      </div>
      {adding && <FoodPicker onPick={e => addEntry(meal, e)} onClose={() => setAdding(false)} />}
      {editingId && (() => {
        const e = entries.find(x => x.id === editingId)
        if (!e) return null
        return <FoodDetail food={e.foodSnapshot} initialEntry={e} onSaveEntry={ne => updateEntry(meal, ne)} onAdd={() => {}} onClose={() => setEditingId(null)} />
      })()}
    </div>
  )
}
