import { useState } from 'react'
import { useApp } from '../state/useApp'
import { LANGUAGES } from '../types'
import { LANGUAGE_NATIVE_NAMES, LANGUAGE_FLAGS } from '../i18n'

export function LanguageSwitcher() {
  const { settings, setLanguage } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn-ghost" data-testid="lang-button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">{LANGUAGE_FLAGS[settings.language]}</span>{' '}
        <span>{LANGUAGE_NATIVE_NAMES[settings.language]}</span>
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {LANGUAGES.map(l => (
              <button key={l} className="row spread" style={{ width: '100%', padding: 12, background: 'transparent', border: 'none', borderBottom: '1px solid var(--line)' }}
                onClick={() => { setLanguage(l); setOpen(false) }}>
                <span><span aria-hidden="true">{LANGUAGE_FLAGS[l]}</span>{' '}<span>{LANGUAGE_NATIVE_NAMES[l]}</span></span>
                {settings.language === l && <span style={{ color: 'var(--accent)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
