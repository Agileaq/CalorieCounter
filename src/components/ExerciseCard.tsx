import { useState, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { newId } from '../lib/ids'
import { NumberInput } from './NumberInput'

/** Preset exercise labels are localized; the option <option value> is also the stored name. */
export function ExerciseCard() {
  const { t } = useTranslation()
  const { day, addExercise, deleteExercise } = useApp()
  // the name field defaults to the (localized) "Strength training" preset
  const [exName, setExName] = useState(() => t('exercise.strength'))
  const [exCals, setExCals] = useState(0)
  const listId = useId()

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
        <input data-testid="exercise-name" list={listId} placeholder={t('exercise.custom')}
          value={exName} onChange={e => setExName(e.target.value)} style={{ flex: 1 }} />
        <datalist id={listId}>
          {presets.map(p => <option key={p} value={p} />)}
        </datalist>
        <NumberInput testId="exercise-cals" integer value={exCals} onChange={setExCals} style={{ width: 80 }} />
        <button className="btn-accent" data-testid="exercise-add" onClick={add}>{t('common.add')}</button>
      </div>
    </div>
  )
}
