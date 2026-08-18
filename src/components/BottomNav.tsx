import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function BottomNav() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/', icon: '📊', label: t('nav.dashboard') },
    { to: '/log', icon: '📋', label: t('nav.log') },
    { to: '/goals', icon: '🎯', label: t('nav.goals') },
  ]
  return (
    <nav className="bottom-nav">
      {tabs.map(tb => (
        <NavLink key={tb.to} to={tb.to} end={tb.to === '/'}
          className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="icon">{tb.icon}</span>
          <span>{tb.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
