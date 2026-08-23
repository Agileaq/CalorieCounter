import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { exportFoods, parseFoodsImport, exportBackup, parseBackup } from '../lib/importExport'
import { download, readFileText } from '../lib/download'
import { NumberInput } from '../components/NumberInput'

export default function Goals() {
  const { t } = useTranslation()
  const { settings, updateSettings, myFoods, allFoods, foodOverrides, days, importFoods, replaceAll } = useApp()
  const [msg, setMsg] = useState('')
  const mt = settings.macroTargets
  const setMacro = (patch: Partial<typeof mt>) => updateSettings({ macroTargets: { ...mt, ...patch } })

  async function onImportFoods(file?: File) {
    if (!file) return
    try { const n = importFoods(parseFoodsImport(await readFileText(file))); setMsg(t('goals.importFoodsDone', { n })) }
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
        <label className="row spread">{t('goals.carbsTarget')}
          <NumberInput testId="carbs-target" integer value={mt.carbs}
            onChange={v => setMacro({ carbs: v })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.proteinTarget')}
          <NumberInput testId="protein-target" integer value={mt.protein}
            onChange={v => setMacro({ protein: v })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.fatTarget')}
          <NumberInput testId="fat-target" integer value={mt.fat}
            onChange={v => setMacro({ fat: v })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.fiberTarget')}
          <NumberInput testId="fiber-target" integer value={mt.fiber}
            onChange={v => setMacro({ fiber: v })} style={{ width: 100, textAlign: 'end' }} /></label>
      </div>

      <div className="card">
        <strong>{t('goals.data')}</strong>
        <div className="muted">{t('goals.backupNote')}</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn-outline" onClick={() => download('foods.json', exportFoods(allFoods))}>{t('goals.exportFoods')}</button>
          <label className="btn-outline">{t('goals.importFoods')}
            <input type="file" accept="application/json" hidden onChange={e => onImportFoods(e.target.files?.[0] ?? undefined)} /></label>
          <button className="btn-outline" onClick={() => download('backup.json', exportBackup({ days, myFoods, settings, foodOverrides }))}>{t('goals.exportBackup')}</button>
          <label className="btn-outline">{t('goals.importBackup')}
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
