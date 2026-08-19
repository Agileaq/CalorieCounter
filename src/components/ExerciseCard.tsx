import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { newId } from '../lib/ids'
import { NumberInput } from './NumberInput'

export function ExerciseCard() {
  const { t } = useTranslation()
  const { day, addExercise, deleteExercise } = useApp()
  const [exName, setExName] = useState('')
  const [exCals, setExCals] = useState(0)

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
        <input data-testid="exercise-name" placeholder="Run" value={exName} onChange={e => setExName(e.target.value)} style={{ flex: 1 }} />
        <NumberInput testId="exercise-cals" integer value={exCals} onChange={setExCals} style={{ width: 80 }} />
        <button className="btn-accent" data-testid="exercise-add"
          onClick={() => { if (exName.trim()) { addExercise({ id: newId(), name: exName.trim(), caloriesBurned: exCals }); setExName(''); setExCals(0) } }}>{t('common.add')}</button>
      </div>
    </div>
  )
}
