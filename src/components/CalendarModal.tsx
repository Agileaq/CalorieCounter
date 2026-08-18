export function CalendarModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} data-testid="calendar-stub">Calendar</div>
    </div>
  )
}
