import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../i18n'
import { AppProvider } from '../state/AppContext'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  it('renders the budget gauge and a version badge', () => {
    render(<AppProvider><Dashboard /></AppProvider>)
    expect(screen.getByTestId('gauge-remaining')).toBeInTheDocument()
    expect(screen.getByTestId('build-info').textContent).toMatch(/^v/)
  })
})
