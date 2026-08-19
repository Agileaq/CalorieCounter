import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { newId } from '../lib/ids'
import { NumberInput } from './NumberInput'

/**
 * Exercise name is a combobox: free-typed text + a ▾ button that opens an
 * UNFILTERED list of the preset activities. Unlike a native <datalist>, the
 * presets are always selectable regardless of what the input currently holds.
 */
export function ExerciseCard() {
  const { t } = useTranslation()
  const { day, addExercise, deleteExercise } = useApp()
  const [exName, setExName] = useState(() => t('exercise.strength')) // default preset
  const [exCals, setExCals] = useState(0)
  const [open, setOpen] = useState(false)

  const presets = [
    t('exercise.strength'),
    t('exercise.walking'),
    t('exercise.running'),
    t('exercise.swimming'),
  ]

  function add() {
    const name = exName.trim()
    if (!name) return
    addExercise({ id: newId(), name, caloriesBurned: exCals })
    setExName(t('exercise.strength')) // reset to the default preset
    setExCals(0)
  }

  return (
    <div className="card">
      <strong>{t('dashboard.exercise')}</strong>
      {day.exercise.map(e => (
        <div key={e.id} className="row spread" style={{ padding: '6px 0' }}>
          <span>{e.name}</span>
          <div className="row" style={{ gap: 8 }}><span>{e.caloriesBurned}</span>
            <button className="btn-ghost" onClick={() => deleteExercise(e.id)}>✕</button></div>
        </div>
      ))}
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div className="row" style={{ gap: 0 }}>
            <input data-testid="exercise-name" placeholder={t('exercise.custom')}
              value={exName} onChange={e => setExName(e.target.value)} style={{ flex: 1, padding: 8 }} />
            <button type="button" className="btn-ghost" data-testid="exercise-name-toggle"
              onClick={() => setOpen(o => !o)} style={{ padding: '0 10px' }}>▾</button>
          </div>
          {open && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                onClick={() => setOpen(false)} />
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'var(--card)', border: '1px solid var(--line)' }}>
                {presets.map(p => (
                  <button key={p} type="button" data-testid="exercise-preset" className="row spread"
                    style={{ width: '100%', padding: 8, background: 'transparent', border: 'none',
                      borderBottom: '1px solid var(--line)' }}
                    onClick={() => { setExName(p); setOpen(false) }}>{p}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <NumberInput testId="exercise-cals" integer value={exCals} onChange={setExCals} style={{ width: 80 }} />
        <button className="btn-accent" data-testid="exercise-add" onClick={add}>{t('common.add')}</button>
      </div>
    </div>
  )
}
