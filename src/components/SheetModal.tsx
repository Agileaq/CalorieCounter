import { useEffect, useRef, type ReactNode, type TouchEvent } from 'react'

/**
 * Full-screen bottom sheet shared by FoodPicker / FoodDetail / FoodForm.
 *
 * Scroll: the sheet body is the only scroll container. While open the page
 * behind it is locked (body overflow hidden + overscroll-behavior: contain),
 * so a swipe inside the sheet never drags the Log page behind it.
 *
 * Pull-to-dismiss: when the sheet is scrolled to the very top and the user
 * keeps dragging downward past a threshold, the sheet closes (onClose). This
 * mirrors the FoodPicker behavior the user expects on all three sheets.
 */
export function SheetModal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const start = useRef<{ y: number; top: number } | null>(null)
  // downward drag accumulated while pinned at scrollTop 0, used to decide dismiss
  const drag = useRef(0)

  // lock the page behind the sheet while it is mounted
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function onTouchStart(e: TouchEvent) {
    const el = scrollRef.current
    start.current = { y: e.touches[0].clientY, top: el ? el.scrollTop : 0 }
    drag.current = 0
  }
  function onTouchMove(e: TouchEvent) {
    const el = scrollRef.current
    const s = start.current
    if (!el || !s) return
    const dy = e.touches[0].clientY - s.y
    // only interested in downward drags while the sheet sits at the top
    if (el.scrollTop <= 0 && dy > 0) {
      drag.current = dy
      // suppress the default so the browser does not hand the scroll to the page
      if (e.cancelable) e.preventDefault()
    } else {
      drag.current = 0
    }
  }
  function onTouchEnd() {
    if (drag.current > 70) onClose()
    start.current = null
    drag.current = 0
  }

  return (
    <div className="modal-backdrop sheet" onClick={onClose}>
      <div
        className="modal"
        ref={scrollRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet-grabber" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}
