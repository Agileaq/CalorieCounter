import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FOOD_EMOJI_CATEGORIES } from '../data/foodEmojis'
import { useApp } from '../state/useApp'
import { SheetModal } from './SheetModal'

export function IconPicker({ value, onChange, onClose }: { value: string; onChange: (c: string) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const { customIcons, setCustomIcons } = useApp()
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState('')

  // The bundled categories plus a synthetic "custom" category holding the icons
  // the user has added from the unicode picker. customIcons is the app's single
  // source of truth (persisted via setCustomIcons → cc.customIcons in storage),
  // so it stays consistent with backup export/import.
  const categories = useMemo(() => {
    const customCat = { key: 'custom', emojis: customIcons.map(c => ({ char: c, keywords: ['custom', '自定义'] })) }
    const all = customIcons.length ? [...FOOD_EMOJI_CATEGORIES, customCat] : FOOD_EMOJI_CATEGORIES
    const term = q.trim().toLowerCase()
    if (!term) return all
    return all
      .map(c => ({ ...c, emojis: c.emojis.filter(e => e.char === term || e.keywords.some(k => k.toLowerCase().includes(term))) }))
      .filter(c => c.emojis.length > 0)
  }, [q, customIcons])

  function pick(c: string) { onChange(c); onClose() }

  function addCustom(c: string) {
    const ch = c.trim()
    if (!ch) return
    // de-dup: don't add a custom icon that already exists
    if (!customIcons.includes(ch)) setCustomIcons([...customIcons, ch])
    pick(ch)
  }

  // Rendered directly into SheetModal (no nested scroll container) so the sheet
  // itself is the sole scroll container — the same layout FoodPicker uses, which
  // is what keeps SheetModal's pull-to-dismiss / overscroll handling correct.
  return (
    <SheetModal onClose={onClose}>
      <div className="row spread">
        <button className="icon-btn" aria-label={t('common.back')} onClick={onClose}>←</button>
        <strong>{t('foodForm.icon')}</strong>
        {/* right spacer keeps the title centered, mirroring FoodForm's header */}
        <span style={{ width: 36 }} aria-hidden />
      </div>
      <input placeholder={t('foodPicker.search')} value={q} onChange={e => setQ(e.target.value)}
        style={{ width: '100%', padding: 8, margin: '8px 0' }} />
      {categories.map(c => (
        <div key={c.key}>
          <div className="muted" style={{ marginTop: 8 }}>{c.key}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {c.emojis.map(e => (
              <button key={e.char} aria-label={e.char} onClick={() => pick(e.char)}
                style={{ fontSize: 28, padding: 8, border: value === e.char ? '2px solid var(--accent)' : '1px solid var(--line)', borderRadius: 10, background: '#fff' }}>
                {e.char}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <input data-testid="custom-emoji" placeholder="🙂" value={custom} onChange={e => setCustom(e.target.value)}
          style={{ flex: 1, padding: 8, textAlign: 'center' }} />
        <button className="btn-accent" data-testid="custom-emoji-apply"
          onClick={() => addCustom(custom)}>{t('common.add')}</button>
      </div>
    </SheetModal>
  )
}
