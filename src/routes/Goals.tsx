import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { exportFoods, parseFoodsImport, exportBackup, parseBackup } from '../lib/importExport'
import { download, readFileText } from '../lib/download'
import { NumberInput } from '../components/NumberInput'

/** Macros per kg of body weight for an advice card. calories = carbs*4 + protein*4 + fat*9. */
interface Quota { carbs: number; protein: number; fat: number }
const CUT: Quota = { carbs: 3.5, protein: 1.5, fat: 0.8 }
const BULK: Quota = { carbs: 4, protein: 2, fat: 1 }

/**
 * Advice card: a weight input (kg) drives read-only calorie/macro suggestions.
 * Values cannot be edited directly — they are derived from weight × quota, so the
 * user gets a starting point to copy into the targets above. No fiber is suggested
 * (the quota tables don't define one).
 */
function AdviceCard({ title, tooltip, quota, weightTestId }: { title: string; tooltip: string; quota: Quota; weightTestId: string }) {
  const { t } = useTranslation()
  const [weight, setWeight] = useState(0)
  const [showTip, setShowTip] = useState(false)
  const tipRef = useRef<HTMLSpanElement>(null)
  // Click outside (or tap) the tip wrapper closes the bubble. onBlur can't do this
  // reliably on touch — the button loses focus immediately after a tap, so a later
  // tap elsewhere never fires blur, and the bubble gets stuck open.
  useEffect(() => {
    if (!showTip) return
    const onDown = (e: PointerEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) setShowTip(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showTip])
  const w = weight > 0 ? weight : 0
  const carbs = Math.round(w * quota.carbs)
  const protein = Math.round(w * quota.protein)
  const fat = Math.round(w * quota.fat)
  const calories = Math.round(w * (quota.carbs * 4 + quota.protein * 4 + quota.fat * 9))
  const ready = weight > 0
  return (
    <div className="card">
      <span className="info-wrap" ref={tipRef}>
        <strong>{title}</strong>
        <button className="info-tip" aria-label={title} title=""
          onClick={() => setShowTip(s => !s)}>
          {'!'}
          {showTip && <div className="info-bubble">{tooltip}</div>}
        </button>
      </span>
      <label className="row spread" style={{ marginTop: 8 }}>
        {t('goals.weightLabel')}
        <NumberInput testId={weightTestId} value={weight} onChange={setWeight}
          style={{ width: 100, textAlign: 'end' }} />
      </label>
      <div className="advice-readout">
        <div>{t('goals.adviceCalories')} <span className="advice-val readonly">{ready ? calories : '—'}</span></div>
        <div>{t('goals.adviceCarbs')} <span className="advice-val readonly">{ready ? carbs : '—'}</span></div>
        <div>{t('goals.adviceProtein')} <span className="advice-val readonly">{ready ? protein : '—'}</span></div>
        <div>{t('goals.adviceFat')} <span className="advice-val readonly">{ready ? fat : '—'}</span></div>
      </div>
    </div>
  )
}

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

      <AdviceCard title={t('goals.cutTitle')} tooltip={t('goals.cutTooltip')} quota={CUT} weightTestId="cut-weight" />
      <AdviceCard title={t('goals.bulkTitle')} tooltip={t('goals.bulkTooltip')} quota={BULK} weightTestId="bulk-weight" />

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
