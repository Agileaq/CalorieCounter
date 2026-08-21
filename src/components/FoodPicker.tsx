import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { Food, LogEntry } from '../types'
import { primaryServing } from '../lib/nutrition'
import { SheetModal } from './SheetModal'
import { FoodForm } from './FoodForm'
import { FoodDetail } from './FoodDetail'

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
  const { allFoods, myFoods, addMyFood } = useApp()
  const [tab, setTab] = useState<'all' | 'my'>('all')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  // look the food up live so edits/overrides refresh an open detail view
  const detail = detailId ? allFoods.find(f => f.id === detailId) ?? null : null

  const source = tab === 'all' ? allFoods : myFoods
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? source.filter(f => f.name.toLowerCase().includes(term) || (f.brand ?? '').toLowerCase().includes(term)) : source
  }, [source, q])
  const groups = useMemo(() => groupByLetter(filtered), [filtered])

  return (
    <SheetModal onClose={onClose}>
      <div className="row spread">
        <input placeholder={t('foodPicker.search')} value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, padding: 8, margin: '0 8px' }} />
        <button className="icon-btn" aria-label={t('common.close')} onClick={onClose}>✕</button>
      </div>
      <div className="row" style={{ gap: 8, margin: '10px 0' }}>
        <button className={tab === 'all' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('all')}>{t('foodPicker.all')}</button>
        <button className={tab === 'my' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('my')}>{t('foodPicker.myFoods')}</button>
        <button className="btn-ghost" data-testid="new-food" onClick={() => setCreating(true)}>+ {t('foodPicker.newMyFood')}</button>
      </div>
      <div>
        {groups.map(([letter, foods]) => (
          <div key={letter}>
            <div className="muted" style={{ marginTop: 8 }}>{letter}</div>
            {foods.map(f => {
              const ps = primaryServing(f)
              return (
                <div key={f.id} className="row spread card" style={{ padding: 10 }}>
                  <button type="button" data-testid="food-row" className="row"
                    onClick={() => setDetailId(f.id)}
                    style={{ gap: 10, flex: 1, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start', font: 'inherit', color: 'inherit' }}>
                    <span style={{ fontSize: 24 }}>{f.icon}</span>
                    <div>
                      <div>{f.name}</div>
                      <div className="muted">{t('foodPicker.perServing', { cal: Math.round(f.nutrition.calories), amount: ps.amount, label: ps.label })}</div>
                    </div>
                  </button>
                  <button className="btn-ghost" data-testid="food-add" aria-label={`add ${f.name}`} style={{ fontSize: 22 }} onClick={() => setDetailId(f.id)}>＋</button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {creating && <FoodForm onSave={f => { addMyFood(f); setTab('my') }} onClose={() => setCreating(false)} />}
      {detail && <FoodDetail food={detail} onAdd={e => { onPick(e); onClose() }} onClose={() => setDetailId(null)} />}
    </SheetModal>
  )
}
