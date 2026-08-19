import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Food, LogEntry } from '../types'
import { primaryServing, entryNutrition } from '../lib/nutrition'
import { newId } from '../lib/ids'
import { NumberInput } from './NumberInput'

export function QuantitySheet({ food, onConfirm, onClose }: { food: Food; onConfirm: (e: LogEntry) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [servingId, setServingId] = useState(primaryServing(food).id)
  const [qty, setQty] = useState(primaryServing(food).amount)
  const entry: LogEntry = { id: newId(), foodSnapshot: food, servingId, quantity: qty }
  const cals = Math.round(entryNutrition(entry).calories)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread"><strong>{food.icon} {food.name}</strong><button className="btn-ghost" onClick={onClose}>✕</button></div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <NumberInput testId="qty-input" value={qty}
            onChange={setQty} style={{ width: 100, padding: 8 }} />
          <select value={servingId} onChange={e => setServingId(e.target.value)} style={{ padding: 8 }}>
            {food.servings.map(s => <option key={s.id} value={s.id}>{s.label} ({s.amount}{s.unit})</option>)}
          </select>
        </div>
        <div style={{ margin: '10px 0', fontSize: 20, fontWeight: 700 }}>{cals} cals</div>
        <button className="btn-accent" data-testid="qty-confirm" onClick={() => { onConfirm(entry); onClose() }}>{t('common.add')}</button>
      </div>
    </div>
  )
}
