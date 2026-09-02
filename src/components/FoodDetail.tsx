import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { Food, LogEntry } from '../types'
import { primaryServing, computedCalories, entryNutrition } from '../lib/nutrition'
import { newId } from '../lib/ids'
import { NumberInput } from './NumberInput'
import { SheetModal } from './SheetModal'
import { FoodForm } from './FoodForm'

const fmt = (v: number, unit: string) => `${Math.round(v * 10) / 10}${unit}`

function Row({ label, value, indent }: { label: string; value: string; indent?: boolean }) {
  const style = indent ? { color: 'var(--muted)' } : undefined
  return (
    <div className="row spread" style={{ padding: '3px 0', paddingInlineStart: indent ? 16 : 0 }}>
      <span style={style}>{label}</span>
      <span style={style}>{value}</span>
    </div>
  )
}

/**
 * Read/edit view for a food's metadata: big derived-calories number, macro
 * rows, expandable full nutrition label, servings, and Edit / Delete / Reset.
 * Editing a predefined food writes an override (in place); custom foods edit
 * directly. Add (✓) logs the food to the day like the picker's ＋ does.
 */
export function FoodDetail({ food, onAdd, onClose }: { food: Food; onAdd: (e: LogEntry) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const { updateMyFood, deleteMyFood, overrideFood, resetOverride, foodOverrides } = useApp()
  const [showFull, setShowFull] = useState(false)
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(1)

  const n = food.nutrition
  const entry: LogEntry = { id: newId(), foodSnapshot: food, servingId: primaryServing(food).id, quantity: qty }
  const previewCals = Math.round(entryNutrition(entry).calories)

  function save(f: Food) {
    if (f.source === 'custom') updateMyFood(f)
    else overrideFood(f)
  }
  function del() {
    if (!window.confirm(t('foodDetail.confirmDelete'))) return
    deleteMyFood(food.id)
    onClose()
  }
  function add() {
    onAdd(entry)
    onClose()
  }

  return (
    <SheetModal onClose={onClose}>
      <div className="row spread">
        <button className="icon-btn" data-testid="food-detail-close" aria-label={t('common.back')} onClick={onClose}>←</button>
        <strong style={{ flex: 1, textAlign: 'center' }}>{food.icon} {food.name}</strong>
        <button className="btn-accent" data-testid="food-detail-add" onClick={add}>{t('common.add')}</button>
      </div>
        {food.brand && <div className="muted" style={{ textAlign: 'center' }}>{food.brand}</div>}

        <div className="card" data-testid="food-detail-quantity">
          <div className="muted">{t('foodForm.quantity')}</div>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <NumberInput testId="qty-input" value={qty} onChange={setQty} style={{ width: 100, padding: 8 }} />
            <span className="muted" style={{ alignSelf: 'center' }}>
              {primaryServing(food).label} ({primaryServing(food).amount}{primaryServing(food).unit})
            </span>
          </div>
          <div className="row spread" style={{ marginTop: 10 }}>
            <span className="muted">{t('foodForm.calories')}</span>
            <strong data-testid="qty-preview-cals">{previewCals} {t('meal.cals', { n: '' }).trim()}</strong>
          </div>
        </div>

        <div className="row spread" style={{ marginTop: 10 }}>
          <span className="muted">{t('foodDetail.nutritionFacts')}</span>
          <button className="btn-ghost" data-testid="food-detail-edit" onClick={() => setEditing(true)}>{t('foodDetail.editNutrition')}</button>
        </div>

        <div className="card">
          <div className="row" style={{ gap: 16, padding: '12px 0' }}>
            <div style={{ textAlign: 'center', minWidth: 90 }}>
              <div data-testid="food-detail-cals" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{computedCalories(n)}</div>
              <div className="muted">{t('foodForm.calories')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <Row label={t('foodDetail.totalFat')} value={fmt(n.fat.total, 'g')} />
              <Row indent label={t('foodDetail.satFat')} value={fmt(n.fat.saturated, 'g')} />
              <Row label={t('foodDetail.cholesterol')} value={fmt(n.cholesterol, 'mg')} />
              <Row label={t('foodDetail.sodium')} value={fmt(n.sodium, 'mg')} />
              <Row label={t('foodDetail.totalCarbs')} value={fmt(n.carbs.total, 'g')} />
              <Row indent label={t('foodDetail.fiber')} value={fmt(n.carbs.fiber, 'g')} />
              <Row indent label={t('foodDetail.sugars')} value={fmt(n.carbs.sugar, 'g')} />
              <Row label={t('foodDetail.protein')} value={fmt(n.protein, 'g')} />
            </div>
          </div>
          <button className="btn-ghost" data-testid="food-detail-full" onClick={() => setShowFull(s => !s)} style={{ padding: 0 }}>
            {showFull ? `${t('foodDetail.hideFull')} ▴` : `${t('foodDetail.viewFull')} ›`}
          </button>
          {showFull && (
            <div style={{ marginTop: 8 }}>
              <Row indent label={t('foodForm.mono')} value={fmt(n.fat.mono, 'g')} />
              <Row indent label={t('foodForm.poly')} value={fmt(n.fat.poly, 'g')} />
              <Row indent label={t('foodForm.trans')} value={fmt(n.fat.trans, 'g')} />
              <div className="muted" style={{ margin: '6px 0' }}>{t('foodForm.vitamins')}</div>
              <Row indent label={t('foodForm.vitA')} value={fmt(n.vitamins.a, 'mcg')} />
              <Row indent label={t('foodForm.vitC')} value={fmt(n.vitamins.c, 'mg')} />
              <Row indent label={t('foodForm.b1')} value={fmt(n.vitamins.b1, 'mg')} />
              <Row indent label={t('foodForm.b2')} value={fmt(n.vitamins.b2, 'mg')} />
              <Row indent label={t('foodForm.b3')} value={fmt(n.vitamins.b3, 'mg')} />
              <Row indent label={t('foodForm.b9')} value={fmt(n.vitamins.b9, 'mcg')} />
              <Row indent label={t('foodForm.b6')} value={fmt(n.vitamins.b6, 'mg')} />
              <Row indent label={t('foodForm.b12')} value={fmt(n.vitamins.b12, 'mcg')} />
              <div className="muted" style={{ margin: '6px 0' }}>{t('foodForm.minerals')}</div>
              <Row indent label={t('foodForm.calcium')} value={fmt(n.minerals.calcium, 'mg')} />
              <Row indent label={t('foodForm.iron')} value={fmt(n.minerals.iron, 'mg')} />
              <Row indent label={t('foodForm.magnesium')} value={fmt(n.minerals.magnesium, 'mg')} />
              <Row indent label={t('foodForm.phosphorus')} value={fmt(n.minerals.phosphorus, 'mg')} />
              <Row indent label={t('foodForm.potassium')} value={fmt(n.minerals.potassium, 'mg')} />
              <Row indent label={t('foodForm.zinc')} value={fmt(n.minerals.zinc, 'mg')} />
              <Row label={t('foodForm.caffeine')} value={fmt(n.caffeine, 'mg')} />
            </div>
          )}
        </div>

        <div className="row" style={{ gap: 8 }}>
          {food.source === 'custom' && (
            <button className="btn-ghost" data-testid="food-detail-delete" style={{ color: 'var(--red)' }} onClick={del}>{t('common.delete')}</button>
          )}
          {food.source === 'predefined' && foodOverrides[food.id] && (
            <button className="btn-ghost" data-testid="food-detail-reset" onClick={() => resetOverride(food.id)}>{t('foodDetail.resetOverride')}</button>
          )}
        </div>
      {editing && <FoodForm initial={food} onSave={save} onClose={() => setEditing(false)} />}
    </SheetModal>
  )
}
