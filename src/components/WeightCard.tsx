/**
 * Daily weigh-in card: one weight per selected day, in kg only (the app
 * standard), plus 0..n preset event tags. NumberInput keeps a local draft
 * while focused so typing never fights the controlled value; Enter blurs to
 * commit.
 */
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import { NumberInput } from './NumberInput'
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
  const { day, setDayWeight, toggleDayTag } = useApp()
  const stored = day.weightKg ?? null
  return (
    <div className="card">
      <strong>{t('weight.title')} ({t('weight.kg')})</strong>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <NumberInput testId="weight-input" value={stored ?? 0} hideZero placeholder={t('weight.placeholder')}
          onChange={v => setDayWeight(v > 0 ? Math.round(v * 100) / 100 : null)}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{ width: 100, textAlign: 'end' }} />
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
