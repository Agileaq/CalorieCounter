import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'

const updateSpy = vi.fn()
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: updateSpy,
  }),
}))

import { UpdateBanner } from './UpdateBanner'

describe('UpdateBanner', () => {
  it('shows when a refresh is needed and triggers update on click', () => {
    render(<UpdateBanner />)
    fireEvent.click(screen.getByText(/Update/i))
    expect(updateSpy).toHaveBeenCalledWith(true)
  })
})
