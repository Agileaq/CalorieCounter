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
  const [showBmiTip, setShowBmiTip] = useState(false)
  const [showWaistTip, setShowWaistTip] = useState(false)
  const bmiTipRef = useRef<HTMLSpanElement>(null)
  const waistTipRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!showBmiTip && !showWaistTip) return
    const onDown = (e: PointerEvent) => {
      if (showBmiTip && bmiTipRef.current && !bmiTipRef.current.contains(e.target as Node)) {
        setShowBmiTip(false)
      }
      if (showWaistTip && waistTipRef.current && !waistTipRef.current.contains(e.target as Node)) {
        setShowWaistTip(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showBmiTip, showWaistTip])

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
        <div className="row spread" style={{ marginBottom: 12 }}>
          <strong>{t('goals.profileTitle')}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <label className="row spread">
            {t('goals.heightLabel')}
            <NumberInput testId="height-input" value={settings.heightCm ?? 0} hideZero
              onChange={v => updateSettings({ heightCm: v > 0 ? Math.round(v * 10) / 10 : null })}
              style={{ width: 64, textAlign: 'end' }} />
          </label>
          <label className="row spread">
            {t('goals.currentWeightLabel')}
            <NumberInput testId="current-weight-input" value={latestWeight} hideZero
              onChange={onCurrentWeightChange}
              style={{ width: 64, textAlign: 'end' }} />
          </label>
          <label className="row spread">
            <span className="info-wrap" ref={waistTipRef}>
              <button
                type="button"
                className="dashed-tip-trigger"
                data-testid="waist-info-tip"
                onClick={(e) => {
                  e.preventDefault()
                  setShowWaistTip(s => !s)
                }}>
                {t('goals.waistLabel')}
                {showWaistTip && (
                  <div className="info-bubble" data-testid="waist-tip-content">
                    {t('goals.waistTooltip')}
                  </div>
                )}
              </button>
            </span>
            <NumberInput testId="waist-input" value={settings.waistCm ?? 0} hideZero
              onChange={v => updateSettings({ waistCm: v > 0 ? Math.round(v * 10) / 10 : null })}
              style={{ width: 64, textAlign: 'end' }} />
          </label>
          <label className="row spread">
            {t('goals.bodyFatLabel')}
            <NumberInput testId="body-fat-input" value={settings.bodyFatPct ?? 0} hideZero
              onChange={v => updateSettings({ bodyFatPct: v > 0 ? Math.round(v * 10) / 10 : null })}
              style={{ width: 64, textAlign: 'end' }} />
          </label>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12, alignItems: 'center' }}>
          <span className="muted">{t('goals.genderLabel')}:</span>
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

        {/* BMI & Health Recommendations Readout */}
        {(bmi != null || idealRange != null) && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row spread" style={{ flexWrap: 'wrap', gap: 8 }}>
              {bmi != null && displayCat != null && (
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="info-wrap" ref={bmiTipRef}>
                    <button
                      type="button"
                      className="dashed-tip-trigger"
                      data-testid="bmi-info-tip"
                      onClick={() => setShowBmiTip(s => !s)}>
                      <span className="muted">{t('goals.bmiLabel')}:</span>
                      {showBmiTip && (
                        <div className="info-bubble" data-testid="bmi-tip-content">
                          {idealRange != null
                            ? t('goals.idealWeightTooltip', { range: `${idealRange.min} – ${idealRange.max}` })
                            : `${t('goals.bmiLabel')}: ${bmi}`}
                        </div>
                      )}
                    </button>
                  </span>
                  <strong data-testid="bmi-value" style={{ fontSize: '1.2em' }}>{bmi}</strong>
                  <span data-testid="bmi-badge" className={`bmi-badge ${displayCat}`}>
                    {t(`goals.bmiCategory.${displayCat}`)}
                  </span>
                </div>
              )}
            </div>

            {/* Scientific BMR / TDEE Reference */}
            {bmr != null && (
              <div className="row spread" style={{ flexWrap: 'wrap', gap: 8, fontSize: 13, background: 'var(--bg)', padding: '8px 12px', borderRadius: 10 }}>
                <div>
                  <span className="muted">{t('goals.bmrLabel')}: </span>
                  <strong data-testid="bmr-value">{bmr} kcal</strong>
                </div>
                {tdee != null && (
                  <div>
                    <span className="muted">{t('goals.tdeeLabel')}: </span>
                    <strong data-testid="tdee-value">{tdee} kcal</strong>
                  </div>
                )}
              </div>
            )}

            {/* Smart Suggestions & Muscle / Central Adiposity Indicators */}
            {displayCat != null && (
              <div className="profile-stat-box">
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {displayCat === 'underweight' && t('goals.bmiSuggestionUnderweight')}
                  {displayCat === 'normal' && t('goals.bmiSuggestionNormal')}
                  {displayCat === 'overweight' && t('goals.bmiSuggestionOverweight')}
                  {displayCat === 'obese' && t('goals.bmiSuggestionObese')}
                  {displayCat === 'athletic' && (
                    <span data-testid="athletic-note">{t('goals.bmiSuggestionAthletic')}</span>
                  )}
                </div>

                {compResult?.hasWaistRisk && (
                  <div className="risk-banner" style={{ marginTop: 6 }}>
                    {t('goals.waistRiskNote')}
                  </div>
                )}

                {/* Helpful note for strength lifters if waist and body fat are empty and BMI is high */}
                {(displayCat === 'overweight' || displayCat === 'obese') && !waist && !bodyFat && (
                  <div className="hint-banner" style={{ marginTop: 6 }}>
                    {t('goals.strengthTrainerHint')}
                  </div>
                )}

                {idealRange != null && (
                  <div className="row spread" style={{ marginTop: 8 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {latestWeight > idealRange.max
                        ? `${t('goals.goalWeight')}: ≤ ${idealRange.max} kg`
                        : `${t('goals.goalWeight')}: ${idealRange.min} – ${idealRange.max} kg`}
                    </span>
                    <button type="button" data-testid="apply-ideal-weight-btn" className="btn-outline"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => updateSettings({ goalWeightKg: idealRange.max })}>
                      {t('goals.applyIdealWeight')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <label className="row spread">{t('goals.dailyBudget')}
          <NumberInput testId="budget-input" integer value={settings.dailyBudget}
            onChange={onBudgetChange} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.carbsTarget')}
          <NumberInput testId="carbs-target" integer value={mt.carbs}
            onChange={v => onMacroChange('carbs', v)} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.proteinTarget')}
          <NumberInput testId="protein-target" integer value={mt.protein}
            onChange={v => onMacroChange('protein', v)} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.fatTarget')}
          <NumberInput testId="fat-target" integer value={mt.fat}
            onChange={v => onMacroChange('fat', v)} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.fiberTarget')}
          <NumberInput testId="fiber-target" integer value={mt.fiber}
            onChange={v => setMacro({ fiber: v })} style={{ width: 100, textAlign: 'end' }} /></label>
        <label className="row spread">{t('goals.goalWeight')}
          <NumberInput testId="goal-weight" value={settings.goalWeightKg ?? 0} hideZero
            onChange={v => updateSettings({ goalWeightKg: v > 0 ? Math.round(v * 100) / 100 : null })}
            style={{ width: 100, textAlign: 'end' }} /></label>
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
