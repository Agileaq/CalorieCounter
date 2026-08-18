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
        <button className="btn-ghost" aria-label="menu" onClick={() => setMenu(m => !m)}>⋯</button>
      </div>
      <div className="muted" data-testid="meal-total">{t('meal.proteinFiber', { p: Math.round(n.protein), f: Math.round(n.carbs.fiber) })}</div>
      {menu && <button className="btn-ghost" onClick={() => { clearMeal(meal); setMenu(false) }}>{t('meal.clear')}</button>}
      {entries.map(e => {
        const ps = primaryServing(e.foodSnapshot)
        return (
          <div key={e.id} className="row spread" style={{ padding: '8px 0' }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20 }}>{e.foodSnapshot.icon}</span>
              <div>
                <div>{e.foodSnapshot.name}</div>
                <div className="muted">{e.quantity} {ps.label}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span>{Math.round(entryNutrition(e).calories)}</span>
              <button className="btn-ghost" aria-label={`delete ${e.foodSnapshot.name}`} onClick={() => deleteEntry(meal, e.id)}>✕</button>
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
