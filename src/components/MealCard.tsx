import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { MealKey } from '../types'
import { mealNutrition, entryNutrition, primaryServing } from '../lib/nutrition'
import { FoodPicker } from './FoodPicker'

export function MealCard({ meal }: { meal: MealKey }) {
  const { t } = useTranslation()
  const { day, addEntry, deleteEntry, clearMeal } = useApp()
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
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
        return (
          <div key={e.id} className="row spread" style={{ padding: '8px 0' }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20 }}>{e.foodSnapshot.icon}</span>
              <div>
                <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
                  <span>{e.foodSnapshot.name}</span>
                  <span className="muted">{e.quantity} {ps.label}</span>
                </div>
                <div className="muted" data-testid="entry-macros">{t('meal.macros', { c: Math.round(en.carbs.total), p: Math.round(en.protein), f: Math.round(en.fat.total), fi: Math.round(en.carbs.fiber) })}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span>{t('meal.cals', { n: Math.round(en.calories) })}</span>
              <button className="btn-ghost" aria-label={t('common.deleteEntry', { name: e.foodSnapshot.name })} onClick={() => deleteEntry(meal, e.id)}>✕</button>
            </div>
          </div>
        )
      })}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn-accent" onClick={() => setAdding(true)}>{t('meal.addFood')}</button>
      </div>
      {adding && <FoodPicker onPick={e => addEntry(meal, e)} onClose={() => setAdding(false)} />}
    </div>
  )
}
