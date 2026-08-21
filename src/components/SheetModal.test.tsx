import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { SheetModal } from './SheetModal'

// flush the macrotask safety timer the sheet installs on a gesture dismiss,
// so a leftover ghost-click guard never leaks into the next test
function flushTimers() {
  return act(async () => { await new Promise(r => setTimeout(r, 1)) })
}

describe('SheetModal', () => {
  it('closes when dragged down past the threshold while at the top', async () => {
    const onClose = vi.fn()
    const { container } = render(<SheetModal onClose={onClose}><div>body</div></SheetModal>)
    const sheet = container.querySelector('.modal')! as HTMLElement
    // the scroll container sits at scrollTop 0 (no overflow in jsdom)
    fireEvent.touchStart(sheet, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(sheet, { touches: [{ clientY: 180 }] }) // +80px downward > 70
    fireEvent.touchEnd(sheet, { touches: [{ clientY: 180 }] })
    expect(onClose).toHaveBeenCalled()
    await flushTimers()
  })
  it('does not close for a small downward nudge under the threshold', async () => {
    const onClose = vi.fn()
    const { container } = render(<SheetModal onClose={onClose}><div>body</div></SheetModal>)
    const sheet = container.querySelector('.modal')! as HTMLElement
    fireEvent.touchStart(sheet, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(sheet, { touches: [{ clientY: 130 }] }) // +30px
    fireEvent.touchEnd(sheet, { touches: [{ clientY: 130 }] })
    expect(onClose).not.toHaveBeenCalled()
    await flushTimers()
  })
  it('clicking the backdrop closes the sheet', () => {
    const onClose = vi.fn()
    const { container } = render(<SheetModal onClose={onClose}><div>body</div></SheetModal>)
    fireEvent.click(container.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalled()
  })
})
