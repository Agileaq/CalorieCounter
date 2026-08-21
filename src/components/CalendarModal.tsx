import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { monthGrid, weekOf, fromDateKey, todayKey } from '../lib/date'
import { getDay } from '../lib/storage'
import { dayFoodNutrition } from '../lib/nutrition'
import { CalorieRing } from './CalorieRing'

export function CalendarModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { days, selectedDate, setSelectedDate, settings } = useApp()
  const sel = fromDateKey(selectedDate)
  const [year, setYear] = useState(sel.getFullYear())
  const [month0, setMonth0] = useState(sel.getMonth())

  const grid = monthGrid(year, month0)
  const dow = ['mon','tue','wed','thu','fri','sat','sun'] as const

  function shiftMonth(delta: number) {
    const d = new Date(year, month0 + delta, 1)
    setYear(d.getFullYear()); setMonth0(d.getMonth())
  }
  function goToday() {
    const tk = fromDateKey(todayKey()); setYear(tk.getFullYear()); setMonth0(tk.getMonth())
  }
  function selectDay(key: string) { setSelectedDate(key); onClose() }

  const monthName = new Date(year, month0, 1).toLocaleDateString(settings.language, { month: 'long' })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row spread">
          <strong>{monthName} {year}</strong>
          <button className="btn-ghost" aria-label={t('common.close')} onClick={onClose}>✕</button>
        </div>
        <div className="row spread" style={{ margin: '8px 0' }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn-ghost" aria-label={t('common.prevMonth')} onClick={() => shiftMonth(-1)}>‹</button>
            <button className="btn-ghost" aria-label={t('common.nextMonth')} onClick={() => shiftMonth(1)}>›</button>
          </div>
          <button className="btn-ghost" onClick={goToday}>{t('common.today')}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 1.2fr', gap: 4, fontSize: 11 }}>
          {dow.map(d => <div key={d} className="muted" style={{ textAlign: 'center' }}>{t(`calendar.${d}`)}</div>)}
          <div className="muted" style={{ textAlign: 'center' }}>{t('common.week')}</div>
          {grid.map((week, wi) => {
            const weekKeys = weekOf(week[0])
            const weekFood = weekKeys.reduce((s, k) => s + dayFoodNutrition(getDay(days, k)).calories, 0)
            const weekBudget = settings.dailyBudget * 7
            const wUO = weekBudget - weekFood >= 0
              ? { kind: 'under' as const, amount: Math.round(weekBudget - weekFood) }
              : { kind: 'over' as const, amount: Math.round(weekFood - weekBudget) }
            return (
              <WeekRow key={wi} week={week} month0={month0} days={days} budget={settings.dailyBudget}
                selectedDate={selectedDate} onSelect={selectDay} wUO={wUO} />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeekRow({ week, month0, days, budget, selectedDate, onSelect, wUO }: {
  week: string[]; month0: number; days: Record<string, any>; budget: number;
  selectedDate: string; onSelect: (k: string) => void; wUO: { kind: 'under' | 'over'; amount: number }
}) {
  return (
    <>
      {week.map(key => {
        const d = fromDateKey(key)
        const inMonth = d.getMonth() === month0
        const food = dayFoodNutrition(getDay(days, key)).calories
        const isSel = key === selectedDate
        return (
          <button key={key} data-testid="cal-day" onClick={() => onSelect(key)}
            style={{ background: 'transparent', border: isSel ? '2px solid var(--accent)' : 'none', borderRadius: 10, padding: 2, opacity: inMonth ? 1 : 0.35 }}>
            <div style={{ fontSize: 10 }}>{d.getDate()}</div>
            <CalorieRing consumed={food} budget={budget} size={26} />
          </button>
        )
      })}
      <div data-testid="week-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ background: wUO.kind === 'under' ? 'var(--green)' : 'var(--red)', color: '#fff', borderRadius: 6, padding: '1px 4px', fontSize: 10 }}>
          {wUO.kind === 'under' ? 'UNDER' : 'OVER'} {wUO.amount}
        </span>
      </div>
    </>
  )
}
