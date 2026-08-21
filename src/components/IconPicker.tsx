import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FOOD_EMOJI_CATEGORIES } from '../data/foodEmojis'

export function IconPicker({ value, onChange, onClose }: { value: string; onChange: (c: string) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState('')

  const categories = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return FOOD_EMOJI_CATEGORIES
    return FOOD_EMOJI_CATEGORIES
      .map(c => ({ ...c, emojis: c.emojis.filter(e => e.char === term || e.keywords.some(k => k.toLowerCase().includes(term))) }))
      .filter(c => c.emojis.length > 0)
  }, [q])

  function pick(c: string) { onChange(c); onClose() }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread">
          <strong>{t('foodForm.icon')}</strong>
          <button className="btn-ghost" aria-label={t('common.close')} onClick={onClose}>✕</button>
        </div>
        <input placeholder={t('foodPicker.search')} value={q} onChange={e => setQ(e.target.value)}
          style={{ width: '100%', padding: 8, margin: '8px 0' }} />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {categories.map(c => (
            <div key={c.key}>
              <div className="muted" style={{ marginTop: 8 }}>{c.key}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {c.emojis.map(e => (
                  <button key={e.char} aria-label={e.char} onClick={() => pick(e.char)}
                    style={{ fontSize: 24, padding: 6, border: value === e.char ? '2px solid var(--accent)' : '1px solid var(--line)', borderRadius: 10, background: '#fff' }}>
                    {e.char}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <input data-testid="custom-emoji" placeholder="🙂" value={custom} onChange={e => setCustom(e.target.value)}
            style={{ width: 60, padding: 8, textAlign: 'center' }} />
          <button className="btn-accent" data-testid="custom-emoji-apply"
            onClick={() => { if (custom.trim()) pick(custom.trim()) }}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}
