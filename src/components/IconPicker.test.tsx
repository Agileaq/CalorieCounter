import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../i18n'
import { IconPicker } from './IconPicker'

describe('IconPicker', () => {
  it('selecting an emoji calls onChange and onClose', () => {
    const onChange = vi.fn(); const onClose = vi.fn()
    render(<IconPicker value="🍽️" onChange={onChange} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '🍚' }))
    expect(onChange).toHaveBeenCalledWith('🍚')
    expect(onClose).toHaveBeenCalled()
  })
  it('search filters by keyword', () => {
    render(<IconPicker value="🍽️" onChange={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'rice' } })
    expect(screen.getByRole('button', { name: '🍚' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '🍎' })).not.toBeInTheDocument()
  })
  it('type-your-own applies a custom emoji', () => {
    const onChange = vi.fn()
    render(<IconPicker value="🍽️" onChange={onChange} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('custom-emoji'), { target: { value: '🥥' } })
    fireEvent.click(screen.getByTestId('custom-emoji-apply'))
    expect(onChange).toHaveBeenCalledWith('🥥')
  })
})
