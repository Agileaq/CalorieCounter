import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateBanner() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => { if (document.visibilityState === 'visible') registration.update() }
      document.addEventListener('visibilitychange', check)
      setInterval(check, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div style={{ position: 'fixed', insetInline: 12, bottom: 'calc(var(--nav-h) + 12px)', zIndex: 100,
      background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{t('update.available')}</span>
      <button className="btn-ghost" style={{ color: '#fff', fontWeight: 700 }} onClick={() => updateServiceWorker(true)}>{t('update.reload')}</button>
    </div>
  )
}
