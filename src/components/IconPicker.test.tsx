import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { IconPicker } from './IconPicker'
import { AppProvider } from '../state/AppContext'

function renderPicker(props?: { value?: string; onChange?: (c: string) => void; onClose?: () => void }) {
  const onChange = props?.onChange ?? vi.fn()
  const onClose = props?.onClose ?? vi.fn()
  render(
    <AppProvider>
      <IconPicker value={props?.value ?? '🍽️'} onChange={onChange} onClose={onClose} />
    </AppProvider>,
  )
  return { onChange, onClose }
}

describe('IconPicker', () => {
  beforeEach(() => localStorage.clear())

  it('selecting an emoji calls onChange and onClose', () => {
    const { onChange, onClose } = renderPicker()
    fireEvent.click(screen.getByRole('button', { name: '🍚' }))
    expect(onChange).toHaveBeenCalledWith('🍚')
    expect(onClose).toHaveBeenCalled()
  })
  it('search filters by keyword', () => {
    renderPicker()
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    expect(screen.getByRole('button', { name: '🍚' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '🍎' })).not.toBeInTheDocument()
  })
  it('type-your-own applies a custom emoji and shows it in a custom category', () => {
    const { onChange } = renderPicker()
    fireEvent.change(screen.getByTestId('custom-emoji'), { target: { value: '🥥' } })
    fireEvent.click(screen.getByTestId('custom-emoji-apply'))
    expect(onChange).toHaveBeenCalledWith('🥥')
    // the custom category row appears and persists 🥥 as a clickable button
    expect(screen.getByText('custom')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '🥥' }))
    expect(onChange).toHaveBeenNthCalledWith(2, '🥥')
  })
  it('the custom category persists to cc.customIcons in storage', () => {
    renderPicker()
    fireEvent.change(screen.getByTestId('custom-emoji'), { target: { value: '🥑' } })
    fireEvent.click(screen.getByTestId('custom-emoji-apply'))
    expect(JSON.parse(localStorage.getItem('cc.customIcons')!)).toEqual(['🥑'])
  })
  it('header has a left back-arrow and a centered title, no ✕ close button', () => {
    renderPicker()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })
})
