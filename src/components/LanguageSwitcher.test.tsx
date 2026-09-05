import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LANGUAGE_FLAGS } from '../i18n'

describe('LanguageSwitcher', () => {
  it('opens a sheet and switches to Chinese', () => {
    render(<AppProvider><LanguageSwitcher /></AppProvider>)
    // trigger shows only the current language's flag (default en), no native name
    expect(screen.getByTestId('lang-button').textContent).toContain(LANGUAGE_FLAGS.en)
    expect(screen.getByTestId('lang-button').textContent).not.toContain('English')
    fireEvent.click(screen.getByTestId('lang-button'))
    fireEvent.click(screen.getByText('中文'))
    // dir stays ltr for zh; button now shows zh flag only (native name lives in the picker)
    const trigger = screen.getByTestId('lang-button')
    expect(trigger.textContent).toContain(LANGUAGE_FLAGS.zh)
    expect(trigger.textContent).not.toContain('中文')
  })
  it('switching to Arabic sets rtl', () => {
    render(<AppProvider><LanguageSwitcher /></AppProvider>)
    fireEvent.click(screen.getByTestId('lang-button'))
    fireEvent.click(screen.getByText('العربية'))
    expect(document.documentElement.dir).toBe('rtl')
  })
  it('picker shows a flag next to every language name', () => {
    render(<AppProvider><LanguageSwitcher /></AppProvider>)
    fireEvent.click(screen.getByTestId('lang-button'))
    const sheet = document.querySelector('.modal')
    for (const flag of Object.values(LANGUAGE_FLAGS)) {
      expect(sheet?.textContent).toContain(flag)
    }
  })
})
