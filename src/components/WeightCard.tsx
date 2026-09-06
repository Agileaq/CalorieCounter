/**
 * Daily weigh-in card: one weight per selected day (stored canonically in kg,
 * displayed per the global weightUnit preference) plus 0..n preset event tags.
 * The kg|lb segment persists the unit globally so the trend chart and the
 * goal-weight input stay in sync. NumberInput keeps a local draft while
 * focused, so the controlled kg↔lb conversion never fights the keyboard;
 * Enter blurs to commit.
 */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { NumberInput } from './NumberInput'
import { kgToLb, lbToKg, round1 } from '../lib/weight'
import type { WeightTag } from '../types'

const TAGS: { key: WeightTag; label: string }[] = [
  { key: 'cheat', label: 'weight.tagCheat' },
  { key: 'strength', label: 'weight.tagStrength' },
  { key: 'cardio', label: 'weight.tagCardio' },
  { key: 'stress', label: 'weight.tagStress' },
  { key: 'period', label: 'weight.tagPeriod' },
]

export function WeightCard() {
  const { t } = useTranslation()
  const { day, settings, updateSettings, setDayWeight, toggleDayTag } = useApp()
  const unit = settings.weightUnit
  const stored = day.weightKg ?? null
  const shown = stored == null ? 0 : round1(unit === 'kg' ? stored : kgToLb(stored))
  return (
    <div className="card">
      <strong>{t('weight.title')}</strong>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <NumberInput testId="weight-input" value={shown} hideZero placeholder={t('weight.placeholder')}
          onChange={v => setDayWeight(v > 0 ? (unit === 'kg' ? Math.round(v * 100) / 100 : lbToKg(v)) : null)}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{ width: 100, textAlign: 'end' }} />
        <div className="row" style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {(['kg', 'lb'] as const).map(u => (
            <button key={u} type="button" data-testid={`weight-unit-${u}`} onClick={() => updateSettings({ weightUnit: u })}
              style={{
                padding: '8px 12px', border: 'none', cursor: 'pointer',
                background: unit === u ? 'var(--accent)' : 'var(--card)', color: unit === u ? '#fff' : 'inherit',
              }}>
              {t(`weight.${u}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {TAGS.map(({ key, label }) => {
          const on = (day.tags ?? []).includes(key)
          return (
            <button key={key} type="button" data-testid={`weight-tag-${key}`} onClick={() => toggleDayTag(key)}
              style={{
                padding: '6px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                background: on ? 'var(--accent)' : 'transparent',
                color: on ? '#fff' : 'inherit',
              }}>
              {t(label)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
