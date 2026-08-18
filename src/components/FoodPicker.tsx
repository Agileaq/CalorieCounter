import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { Food, LogEntry } from '../types'
import { primaryServing } from '../lib/nutrition'
import { QuantitySheet } from './QuantitySheet'
import { FoodForm } from './FoodForm'

function groupByLetter(foods: Food[]): [string, Food[]][] {
  const map = new Map<string, Food[]>()
  for (const f of [...foods].sort((a, b) => a.name.localeCompare(b.name))) {
    const letter = (f.name[0] || '#').toUpperCase()
    map.set(letter, [...(map.get(letter) ?? []), f])
  }
  return [...map.entries()]
}

export function FoodPicker({ onPick, onClose }: { onPick: (e: LogEntry) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const { predefined, myFoods, addMyFood } = useApp()
  const [tab, setTab] = useState<'all' | 'my'>('all')
  const [q, setQ] = useState('')
  const [picking, setPicking] = useState<Food | null>(null)
  const [creating, setCreating] = useState(false)
  const [count, setCount] = useState(0)

  const source = tab === 'all' ? predefined : myFoods
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? source.filter(f => f.name.toLowerCase().includes(term) || (f.brand ?? '').toLowerCase().includes(term)) : source
  }, [source, q])
  const groups = useMemo(() => groupByLetter(filtered), [filtered])

  function confirm(entry: LogEntry) { setCount(c => c + 1); onPick(entry) }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread">
          <span className="muted">{count}</span>
          <input placeholder={t('foodPicker.search')} value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, padding: 8, margin: '0 8px' }} />
          <button className="btn-accent" onClick={onClose}>✓</button>
        </div>
        <div className="row" style={{ gap: 8, margin: '10px 0' }}>
          <button className={tab === 'all' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('all')}>{t('foodPicker.all')}</button>
          <button className={tab === 'my' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('my')}>{t('foodPicker.myFoods')}</button>
          {tab === 'my' && <button className="btn-ghost" data-testid="new-food" onClick={() => setCreating(true)}>+ {t('foodPicker.newFood')}</button>}
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {groups.map(([letter, foods]) => (
            <div key={letter}>
              <div className="muted" style={{ marginTop: 8 }}>{letter}</div>
              {foods.map(f => {
                const ps = primaryServing(f)
                return (
                  <div key={f.id} className="row spread card" style={{ padding: 10 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{f.icon}</span>
                      <div>
                        <div>{f.name}</div>
                        <div className="muted">{t('foodPicker.perServing', { cal: Math.round(f.nutrition.calories), amount: ps.amount, label: ps.label })}</div>
                      </div>
                    </div>
                    <button className="btn-ghost" data-testid="food-add" aria-label={`add ${f.name}`} style={{ fontSize: 22 }} onClick={() => setPicking(f)}>＋</button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {picking && <QuantitySheet food={picking} onConfirm={confirm} onClose={() => setPicking(null)} />}
      {creating && <FoodForm onSave={f => { addMyFood(f); setTab('my') }} onClose={() => setCreating(false)} />}
    </div>
  )
}
