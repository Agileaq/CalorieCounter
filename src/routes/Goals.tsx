import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { exportFoods, parseFoodsImport, exportBackup, parseBackup } from '../lib/importExport'
import { download, readFileText } from '../lib/download'
import { NumberInput } from '../components/NumberInput'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { distributeBudget } from '../lib/nutrition'
import { parseSettingsBlob } from '../lib/storage'
import { extractWeighIns } from '../lib/weight'
import { calculateBmi, idealWeightRange, calculateBmr, calculateTdee, evaluateBodyComposition } from '../lib/bmi'

interface Quota { carbs?: number; carbsMin?: number; carbsMax?: number; protein: number; fat: number }
const CUT: Quota = { carbsMin: 2.5, carbsMax: 3.5, protein: 1.5, fat: 0.8 }
const BULK: Quota = { carbs: 4, protein: 2, fat: 1 }

/**
 * Advice card: a weight input (kg) drives read-only calorie/macro suggestions.
 * Values cannot be edited directly — they are derived from weight × quota, so the
 * user gets a starting point to copy into the targets above. No fiber is suggested
 * (the quota tables don't define one).
 */
function AdviceCard({ title, tooltip, quota, weightTestId, weight, onWeightChange }: { title: string; tooltip: string; quota: Quota; weightTestId: string; weight: number; onWeightChange: (v: number) => void }) {
  const { t } = useTranslation()
  const [showTip, setShowTip] = useState(false)
  const tipRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!showTip) return
    const onDown = (e: PointerEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) setShowTip(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showTip])
  const w = weight > 0 ? weight : 0
  const ready = weight > 0
  const protein = Math.round(w * quota.protein)
  const fat = Math.round(w * quota.fat)
  let carbsStr = '—'
  let caloriesStr = '—'
  if (ready) {
    if (quota.carbsMin !== undefined && quota.carbsMax !== undefined) {
      const cMin = Math.round(w * quota.carbsMin)
      const cMax = Math.round(w * quota.carbsMax)
      carbsStr = `${cMin}–${cMax}g`
      const calMin = Math.round(w * (quota.carbsMin * 4 + quota.protein * 4 + quota.fat * 9))
      const calMax = Math.round(w * (quota.carbsMax * 4 + quota.protein * 4 + quota.fat * 9))
      caloriesStr = `${calMin}–${calMax}kcal`
    } else if (quota.carbs !== undefined) {
      const c = Math.round(w * quota.carbs)
      carbsStr = `${c}g`
      const cal = Math.round(w * (quota.carbs * 4 + quota.protein * 4 + quota.fat * 9))
      caloriesStr = `${cal}kcal`
    }
  }
  return (
    <div className="card">
      <div className="row spread">
        <span className="info-wrap" ref={tipRef}>
          <button
            type="button"
            className="dashed-tip-trigger"
            aria-label={title}
            onClick={() => setShowTip(s => !s)}>
            <strong>{title}</strong>
            {showTip && <div className="info-bubble">{tooltip}</div>}
          </button>
        </span>
        <label className="row" style={{ gap: 6 }}>
          {t('goals.weightLabel')}:
          <NumberInput testId={weightTestId} value={weight} onChange={onWeightChange} clearOnFocus
            style={{ width: 80, textAlign: 'end' }} />
        </label>
      </div>
      <div className="advice-readout">
        <div className="advice-item">
          <span className="advice-label">{t('goals.adviceCalories')}</span>
          <span className="advice-val readonly">{caloriesStr}</span>
        </div>
        <div className="advice-item">
          <span className="advice-label">{t('goals.adviceCarbs')}</span>
          <span className="advice-val readonly">{carbsStr}</span>
        </div>
        <div className="advice-item">
          <span className="advice-label">{t('goals.adviceProtein')}</span>
          <span className="advice-val readonly">{ready ? `${protein}g` : '—'}</span>
        </div>
        <div className="advice-item">
          <span className="advice-label">{t('goals.adviceFat')}</span>
          <span className="advice-val readonly">{ready ? `${fat}g` : '—'}</span>
        </div>
      </div>
    </div>
  )
}

export default function Goals() {
  const { t } = useTranslation()
  const { settings, updateSettings, myFoods, allFoods, foodOverrides, days, customIcons, importFoods, replaceAll, mergeBackup, setDayWeight } = useApp()
  const [msg, setMsg] = useState('')
  const [showWeightTip, setShowWeightTip] = useState(false)
  const [showWaistTip, setShowWaistTip] = useState(false)
  const [showBodyFatTip, setShowBodyFatTip] = useState(false)
  const weightTipRef = useRef<HTMLSpanElement>(null)
  const waistTipRef = useRef<HTMLSpanElement>(null)
  const bodyFatTipRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!showWeightTip && !showWaistTip && !showBodyFatTip) return
    const onDown = (e: PointerEvent) => {
      if (showWeightTip && weightTipRef.current && !weightTipRef.current.contains(e.target as Node)) {
        setShowWeightTip(false)
      }
      if (showWaistTip && waistTipRef.current && !waistTipRef.current.contains(e.target as Node)) {
        setShowWaistTip(false)
      }
      if (showBodyFatTip && bodyFatTipRef.current && !bodyFatTipRef.current.contains(e.target as Node)) {
        setShowBodyFatTip(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showWeightTip, showWaistTip, showBodyFatTip])

  const mt = settings.macroTargets
  const setMacro = (patch: Partial<typeof mt>) => updateSettings({ macroTargets: { ...mt, ...patch } })

  // Resolve current weight: from weigh-ins (latest weigh-in), else fallback to 0
  const weighIns = extractWeighIns(days)
  const latestWeight = weighIns.length > 0 ? weighIns[weighIns.length - 1].kg : 0

  function onCurrentWeightChange(v: number) {
    setDayWeight(v > 0 ? Math.round(v * 100) / 100 : null)
  }

  const height = settings.heightCm ?? 0
  const gender = settings.gender
  const waist = settings.waistCm
  const bodyFat = settings.bodyFatPct
  const bmi = calculateBmi(height, latestWeight)
  const idealRange = idealWeightRange(height)
  const bmr = calculateBmr({ heightCm: height, weightKg: latestWeight, gender })
  const tdee = calculateTdee(bmr)

  const compResult = bmi != null
    ? evaluateBodyComposition({ bmi, gender, waistCm: waist, bodyFatPct: bodyFat })
    : null
  const displayCat = compResult ? compResult.category : null

  // Two-way macro auto-calc, purely event-driven (no watch/effect loops):
  function onBudgetChange(v: number) {
    updateSettings({ dailyBudget: v, macroTargets: { ...mt, ...distributeBudget(v) } })
  }
  function onMacroChange(field: 'carbs' | 'protein' | 'fat', v: number) {
    const next = { ...mt, [field]: v }
    const budget = 4 * next.carbs + 4 * next.protein + 9 * next.fat
    updateSettings({ dailyBudget: budget, macroTargets: next })
  }

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
  async function onMergeBackup(file?: File) {
    if (!file) return
    try { mergeBackup(parseBackup(await readFileText(file))); setMsg(t('common.done')) }
    catch (e) { setMsg(t('goals.importError', { msg: (e as Error).message })) }
  }
  async function onImportSettings(file?: File) {
    if (!file) return
    try { updateSettings(parseSettingsBlob(await readFileText(file))); setMsg(t('common.done')) }
    catch (e) { setMsg(t('goals.importError', { msg: (e as Error).message })) }
  }

  return (
    <div className="screen">
      <div className="row spread header-row">
        <h2 style={{ margin: 0 }}>{t('goals.title')}</h2>
        <LanguageSwitcher />
      </div>

      {/* Body Profile and BMI Card */}
      <div className="card">
        <div className="row" style={{ marginBottom: 12, alignItems: 'center', gap: 8 }}>
          <strong>{t('goals.profileTitle')}</strong>
          <button type="button" data-testid="gender-male"
            className={`gender-pill ${gender === 'male' ? 'active' : ''}`}
            onClick={() => updateSettings({ gender: 'male' })}>
            {t('goals.genderMale')}
          </button>
          <button type="button" data-testid="gender-female"
            className={`gender-pill ${gender === 'female' ? 'active' : ''}`}
            onClick={() => updateSettings({ gender: 'female' })}>
            {t('goals.genderFemale')}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <div className="row spread" style={{ gap: 6 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{t('goals.heightLabel')}</span>
            <NumberInput testId="height-input" value={settings.heightCm ?? 0} hideZero
              onChange={v => updateSettings({ heightCm: v > 0 ? Math.round(v * 10) / 10 : null })}
              style={{ width: 68, textAlign: 'end' }} />
          </div>
          <div className="row spread" style={{ gap: 6 }}>
            <span className="info-wrap" ref={weightTipRef}>
              <button
                type="button"
                className="dashed-tip-trigger"
                data-testid="current-weight-info-tip"
                style={{ whiteSpace: 'nowrap' }}
                onClick={(e) => {
                  e.preventDefault()
                  setShowWeightTip(s => !s)
                }}>
                {t('goals.currentWeightLabel')}
              </button>
              {showWeightTip && (
                <div className="info-bubble tip-down-end" data-testid="current-weight-tip-content">
                  {bmi != null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {displayCat != null && (
                        <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{t('goals.bmiLabel')}:</span>
                          <strong data-testid="bmi-value">{bmi}</strong>
                          <span data-testid="bmi-badge" className={`bmi-badge ${displayCat}`}>
                            {t(`goals.bmiCategory.${displayCat}`)}
                          </span>
                        </div>
                      )}

                      {idealRange != null && (
                        <div>
                          {t('goals.idealWeight')}: <strong>{idealRange.min} – {idealRange.max} kg</strong>
                        </div>
                      )}

                      {bmr != null && (
                        <div>
                          {t('goals.bmrLabel')}: <strong data-testid="bmr-value">{bmr} kcal</strong>
                        </div>
                      )}

                      {tdee != null && (
                        <div>
                          {t('goals.tdeeLabel')}: <strong data-testid="tdee-value">{tdee} kcal</strong>
                        </div>
                      )}

                      {displayCat != null && (
                        <div style={{ fontSize: 11, opacity: 0.9, lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 6 }}>
                          {displayCat === 'underweight' && t('goals.bmiSuggestionUnderweight')}
                          {displayCat === 'normal' && t('goals.bmiSuggestionNormal')}
                          {displayCat === 'overweight' && t('goals.bmiSuggestionOverweight')}
                          {displayCat === 'obese' && t('goals.bmiSuggestionObese')}
                          {displayCat === 'athletic' && (
                            <span data-testid="athletic-note">{t('goals.bmiSuggestionAthletic')}</span>
                          )}
                        </div>
                      )}

                      {compResult?.hasWaistRisk && (
                        <div style={{ fontSize: 11, color: '#ffb4b4', lineHeight: 1.3 }}>
                          {t('goals.waistRiskNote')}
                        </div>
                      )}

                      {(displayCat === 'overweight' || displayCat === 'obese') && !waist && !bodyFat && (
                        <div style={{ fontSize: 11, color: '#ffd599', lineHeight: 1.3 }}>
                          {t('goals.strengthTrainerHint')}
                        </div>
                      )}

                      {idealRange != null && (
                        <div className="row spread" style={{ marginTop: 4, alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, opacity: 0.85 }}>
                            {latestWeight > idealRange.max
                              ? `${t('goals.goalWeight')}: ≤ ${idealRange.max} kg`
                              : `${t('goals.goalWeight')}: ${idealRange.min} – ${idealRange.max} kg`}
                          </span>
                          <button
                            type="button"
                            data-testid="apply-ideal-weight-btn"
                            className="btn-outline"
                            style={{ padding: '2px 8px', fontSize: 11, background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
                            onPointerDown={(e) => {
                              e.stopPropagation()
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              updateSettings({ goalWeightKg: idealRange.max })
                            }}>
                            {t('goals.applyIdealWeight')}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>{t('goals.currentWeightTipEmpty')}</div>
                  )}
                </div>
              )}
            </span>
            <NumberInput testId="current-weight-input" value={latestWeight} hideZero
              onChange={onCurrentWeightChange}
              style={{ width: 68, textAlign: 'end' }} />
          </div>
          <div className="row spread" style={{ gap: 6 }}>
            <span className="info-wrap" ref={waistTipRef}>
              <button
                type="button"
                className="dashed-tip-trigger"
                data-testid="waist-info-tip"
                style={{ whiteSpace: 'nowrap' }}
                onClick={(e) => {
                  e.preventDefault()
                  setShowWaistTip(s => !s)
                }}>
                {t('goals.waistLabel')}
              </button>
              {showWaistTip && (
                <div className="info-bubble tip-down-start" data-testid="waist-tip-content">
                  {t('goals.waistTooltip')}
                </div>
              )}
            </span>
            <NumberInput testId="waist-input" value={settings.waistCm ?? 0} hideZero
              onChange={v => updateSettings({ waistCm: v > 0 ? Math.round(v * 10) / 10 : null })}
              style={{ width: 68, textAlign: 'end' }} />
          </div>
          <div className="row spread" style={{ gap: 6 }}>
            <span className="info-wrap" ref={bodyFatTipRef}>
              <button
                type="button"
                className="dashed-tip-trigger"
                data-testid="body-fat-info-tip"
                style={{ whiteSpace: 'nowrap' }}
                onClick={(e) => {
                  e.preventDefault()
                  setShowBodyFatTip(s => !s)
                }}>
                {t('goals.bodyFatLabel')}
              </button>
              {showBodyFatTip && (
                <div className="info-bubble tip-down-end" data-testid="body-fat-tip-content">
                  {t('goals.bodyFatTooltip')}
                </div>
              )}
            </span>
            <NumberInput testId="body-fat-input" value={settings.bodyFatPct ?? 0} hideZero
              onChange={v => updateSettings({ bodyFatPct: v > 0 ? Math.round(v * 10) / 10 : null })}
              style={{ width: 68, textAlign: 'end' }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="row spread" style={{ gap: 8 }}>
          <span>{t('goals.dailyBudget')}</span>
          <NumberInput testId="budget-input" integer value={settings.dailyBudget}
            onChange={onBudgetChange} style={{ width: 80, textAlign: 'end' }} />
        </label>
        <label className="row spread" style={{ gap: 8 }}>
          <span>{t('goals.proteinTarget')}</span>
          <NumberInput testId="protein-target" integer value={mt.protein}
            onChange={v => onMacroChange('protein', v)} style={{ width: 80, textAlign: 'end' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <label className="row spread" style={{ gap: 6 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{t('goals.carbsTarget')}</span>
            <NumberInput testId="carbs-target" integer value={mt.carbs}
              onChange={v => onMacroChange('carbs', v)} style={{ width: 68, textAlign: 'end' }} />
          </label>
          <label className="row spread" style={{ gap: 6 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{t('goals.fatTarget')}</span>
            <NumberInput testId="fat-target" integer value={mt.fat}
              onChange={v => onMacroChange('fat', v)} style={{ width: 68, textAlign: 'end' }} />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <label className="row spread" style={{ gap: 6 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{t('goals.fiberTarget')}</span>
            <NumberInput testId="fiber-target" integer value={mt.fiber}
              onChange={v => setMacro({ fiber: v })} style={{ width: 68, textAlign: 'end' }} />
          </label>
          <label className="row spread" style={{ gap: 6 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{t('goals.goalWeight')}</span>
            <NumberInput testId="goal-weight" value={settings.goalWeightKg ?? 0} hideZero
              onChange={v => updateSettings({ goalWeightKg: v > 0 ? Math.round(v * 100) / 100 : null })}
              style={{ width: 68, textAlign: 'end' }} />
          </label>
        </div>
      </div>

      <AdviceCard title={t('goals.cutTitle')} tooltip={t('goals.cutTooltip')} quota={CUT} weightTestId="cut-weight"
        weight={settings.adviceCutWeightKg} onWeightChange={v => updateSettings({ adviceCutWeightKg: v })} />
      <AdviceCard title={t('goals.bulkTitle')} tooltip={t('goals.bulkTooltip')} quota={BULK} weightTestId="bulk-weight"
        weight={settings.adviceBulkWeightKg} onWeightChange={v => updateSettings({ adviceBulkWeightKg: v })} />

      <div className="card">
        <strong>{t('goals.data')}</strong>
        <div className="muted">{t('goals.backupNote')}</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button className="btn-outline" onClick={() => download('foods.json', exportFoods(allFoods))}>{t('goals.exportFoods')}</button>
        <label className="btn-outline">{t('goals.importFoods')}
          <input type="file" accept="application/json" hidden onChange={e => onImportFoods(e.target.files?.[0] ?? undefined)} /></label>
        <button className="btn-outline" onClick={() => download('backup.json', exportBackup({ days, myFoods, settings, foodOverrides, customIcons }))}>{t('goals.exportBackup')}</button>
        <label className="btn-outline">{t('goals.mergeBackup')}
          <input type="file" accept="application/json" hidden onChange={e => onMergeBackup(e.target.files?.[0] ?? undefined)} /></label>
        <label className="btn-outline">{t('goals.replaceBackup')}
          <input type="file" accept="application/json" hidden onChange={e => onImportBackup(e.target.files?.[0] ?? undefined)} /></label>
        <button className="btn-outline" data-testid="export-settings"
          onClick={() => download('settings.json', JSON.stringify(settings, null, 2))}>{t('goals.exportSettings')}</button>
        <label className="btn-outline" data-testid="import-settings">{t('goals.importSettings')}
          <input type="file" accept="application/json" hidden onChange={e => onImportSettings(e.target.files?.[0] ?? undefined)} /></label>
        </div>
        {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
      </div>

      <div className="card row spread">
        <span className="muted">{t('dashboard.version')}: v{__APP_VERSION__} ({__GIT_SHA__})</span>
      </div>
    </div>
  )
}
