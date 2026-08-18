import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../i18n'
import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  it('renders three tabs with links', () => {
    render(<MemoryRouter><BottomNav /></MemoryRouter>)
    // MemoryRouter renders plain (non-hash) hrefs, so assert on count + accessible names.
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Log/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Goals/i })).toBeInTheDocument()
  })
})
