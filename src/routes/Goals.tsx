import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { exportFoods, parseFoodsImport, exportBackup, parseBackup } from '../lib/importExport'
import { download, readFileText } from '../lib/download'
import { newId } from '../lib/ids'
import { NumberInput } from '../components/NumberInput'

export default function Goals() {
  const { t } = useTranslation()
  const { settings, updateSettings, day, addExercise, deleteExercise, myFoods, days, importMyFoods, replaceAll } = useApp()
  const [exName, setExName] = useState('')
  const [exCals, setExCals] = useState(0)
  const [msg, setMsg] = useState('')

  async function onImportFoods(file?: File) {
    if (!file) return
    try { const n = importMyFoods(parseFoodsImport(await readFileText(file))); setMsg(t('goals.importFoodsDone', { n })) }
    catch (e) { setMsg(t('goals.importError', { msg: (e as Error).message })) }
  }
  async function onImportBackup(file?: File) {
    if (!file) return
    try { replaceAll(parseBackup(await readFileText(file))); setMsg(t('common.done')) }
    catch (e) { setMsg(t('goals.importError', { msg: (e as Error).message })) }
  }

  return (
    <div className="screen">
      <h2>{t('goals.title')}</h2>
      <div className="card">
        <label className="row spread">{t('goals.dailyBudget')}
          <NumberInput testId="budget-input" integer value={settings.dailyBudget}
            onChange={v => updateSettings({ dailyBudget: v })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.proteinTarget')}
          <NumberInput integer value={settings.macroTargets.protein}
            onChange={v => updateSettings({ macroTargets: { ...settings.macroTargets, protein: v } })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.fiberTarget')}
          <NumberInput integer value={settings.macroTargets.fiber}
            onChange={v => updateSettings({ macroTargets: { ...settings.macroTargets, fiber: v } })} style={{ width: 100, textAlign: 'end' }} /></label>
      </div>

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

      <div className="card">
        <strong>{t('goals.data')}</strong>
        <div className="muted">{t('goals.backupNote')}</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn-ghost" onClick={() => download('foods.json', exportFoods(myFoods))}>{t('goals.exportFoods')}</button>
          <label className="btn-ghost">{t('goals.importFoods')}
            <input type="file" accept="application/json" hidden onChange={e => onImportFoods(e.target.files?.[0] ?? undefined)} /></label>
          <button className="btn-ghost" onClick={() => download('backup.json', exportBackup({ days, myFoods, settings }))}>{t('goals.exportBackup')}</button>
          <label className="btn-ghost">{t('goals.importBackup')}
            <input type="file" accept="application/json" hidden onChange={e => onImportBackup(e.target.files?.[0] ?? undefined)} /></label>
        </div>
        {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
      </div>

      <div className="card row spread">
        <span className="muted">{t('dashboard.version')}: v{__APP_VERSION__} ({__GIT_SHA__})</span>
      </div>
    </div>
  )
}
