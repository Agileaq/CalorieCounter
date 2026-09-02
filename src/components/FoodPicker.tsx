import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import type { Food, LogEntry } from '../types'
import { primaryServing } from '../lib/nutrition'
import { foodCounts } from '../lib/food'
import { newId } from '../lib/ids'
import { todayKey } from '../lib/date'
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

/** All tab: most-logged first (last 180 days), then alphabetical. Unused foods
 *  get count 0 and fall through to the alphabetical tail. */
function sortByFrequency(foods: Food[], counts: Map<string, number>): Food[] {
  return [...foods].sort((a, b) => {
    const ca = counts.get(a.id) ?? 0
    const cb = counts.get(b.id) ?? 0
    if (ca !== cb) return cb - ca
    return a.name.localeCompare(b.name)
  })
}

export function FoodPicker({ onPick, onClose }: { onPick: (e: LogEntry) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const { allFoods, myFoods, addMyFood, days, selectedDate } = useApp()
  const [tab, setTab] = useState<'all' | 'my'>('all')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  // transient "✓ added {name}" pill; keyed by a counter so rapid fast-adds
  // replace it and reset the dismiss timer (the effect re-runs on each new key).
  const [toast, setToast] = useState<{ key: number; name: string } | null>(null)
  // look the food up live so edits/overrides refresh an open detail view
  const detail = detailId ? allFoods.find(f => f.id === detailId) ?? null : null

  const source = tab === 'all' ? allFoods : myFoods
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? source.filter(f => f.name.toLowerCase().includes(term) || (f.brand ?? '').toLowerCase().includes(term)) : source
  }, [source, q])
  const counts = useMemo(
    () => foodCounts(days, selectedDate || todayKey()),
    [days, selectedDate],
  )
  const allSorted = useMemo(() => sortByFrequency(filtered, counts), [filtered, counts])
  const myGroups = useMemo(() => groupByLetter(filtered), [filtered])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1200)
    return () => clearTimeout(id)
  }, [toast])

  /** Add qty 1 (primary serving) without leaving the picker, so a user who
   *  knows the food can log several in a row. Toast confirms each add. */
  function fastAdd(f: Food) {
    const entry: LogEntry = { id: newId(), foodSnapshot: f, servingId: primaryServing(f).id, quantity: 1 }
    onPick(entry)
    setToast({ key: (toast?.key ?? 0) + 1, name: f.name })
  }

  return (
    <SheetModal onClose={onClose}>
      <div className="row spread">
        <button className="icon-btn" aria-label={t('common.back')} onClick={onClose}>←</button>
        <input placeholder={t('foodPicker.search')} value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, padding: 8, margin: '0 8px' }} />
      </div>
      <div className="row" style={{ gap: 8, margin: '10px 0' }}>
        <button className={tab === 'all' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('all')}>{t('foodPicker.all')}</button>
        <button className={tab === 'my' ? 'btn-accent' : 'btn-ghost'} onClick={() => setTab('my')}>{t('foodPicker.myFoods')}</button>
        <button className="btn-ghost" data-testid="new-food" onClick={() => setCreating(true)}>+ {t('foodPicker.newMyFood')}</button>
      </div>
      <div>
        {tab === 'all'
          ? allSorted.map(f => renderRow(f))
          : myGroups.map(([letter, foods]) => (
            <div key={letter}>
              <div className="muted" style={{ marginTop: 8 }}>{letter}</div>
              {foods.map(f => renderRow(f))}
            </div>
          ))}
        {toast && (
          <div className="fast-add-toast" data-testid="fast-add-toast">
            ✓ {t('foodPicker.added', { name: toast.name })}
          </div>
        )}
      </div>
      {creating && <FoodForm onSave={f => { addMyFood(f); setTab('my') }} onClose={() => setCreating(false)} />}
      {detail && <FoodDetail food={detail} onAdd={e => { onPick(e); onClose() }} onClose={() => setDetailId(null)} />}
    </SheetModal>
  )

  function renderRow(f: Food) {
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
        <div className="row" style={{ gap: 6 }}>
          {/* details button → opens the full FoodDetail sheet (nutrition facts + edit) */}
          <button className="btn-ghost" data-testid="food-detail-open" aria-label={t('foodPicker.details', { name: f.name })} style={{ fontSize: 18 }} onClick={() => setDetailId(f.id)}>🔍</button>
          {/* fast-add → logs qty 1 immediately, stays on the picker */}
          <button className="btn-ghost" data-testid="food-add" aria-label={t('foodPicker.fastAdd', { name: f.name })} style={{ fontSize: 22 }} onClick={() => fastAdd(f)}>＋</button>
        </div>
      </div>
    )
  }
}
