import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { LanguageSwitcher } from './LanguageSwitcher'

describe('LanguageSwitcher', () => {
  it('opens a sheet and switches to Chinese', () => {
    render(<AppProvider><LanguageSwitcher /></AppProvider>)
    fireEvent.click(screen.getByTestId('lang-button'))
    fireEvent.click(screen.getByText('中文'))
    // dir stays ltr for zh; button now shows zh native name
    expect(screen.getByTestId('lang-button').textContent).toContain('中文')
  })
  it('switching to Arabic sets rtl', () => {
    render(<AppProvider><LanguageSwitcher /></AppProvider>)
    fireEvent.click(screen.getByTestId('lang-button'))
    fireEvent.click(screen.getByText('العربية'))
    expect(document.documentElement.dir).toBe('rtl')
  })
})
