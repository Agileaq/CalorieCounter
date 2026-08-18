import { useApp } from '../state/useApp'
import { addDays, formatHeader } from '../lib/date'

export function DateHeader({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const { selectedDate, setSelectedDate, settings } = useApp()
  return (
    <div className="row spread" style={{ padding: '8px 12px' }}>
      <button className="btn-ghost" data-testid="date-prev" aria-label="previous day"
        onClick={() => setSelectedDate(addDays(selectedDate, -1))}>‹</button>
      <button className="btn-ghost" data-testid="date-center" onClick={onOpenCalendar}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        📅 {formatHeader(selectedDate, settings.language)}
      </button>
      <button className="btn-ghost" data-testid="date-next" aria-label="next day"
        onClick={() => setSelectedDate(addDays(selectedDate, 1))}>›</button>
    </div>
  )
}
