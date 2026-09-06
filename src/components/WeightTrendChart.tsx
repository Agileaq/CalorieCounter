/**
 * Goals-page weight trend chart: one LTR SVG holding three X-aligned sections
 * (main three-layer plot, event lane, deficit + weekly-rate sub-charts) under
 * a fixed readout row. Hit-testing maps client coords through the SVG's own
 * CTM (rect-ratio fallback) so an outer dir="rtl" can never mirror columns.
 * All math comes from the pure helpers in ../lib/weight; see the spec for the
 * locked semantics (7-day SMA with carry-forward fuse, funnel corridor,
 * completed-week rates, budget-based deficit).
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state/useApp'
import {
  extractWeighIns, dailySeries, safeCorridor, deficitSeries,
  padBounds, symmetricBounds, round1,
  TAG_COLORS, type Range,
} from '../lib/weight'
import { daysBetween, fromDateKey } from '../lib/date'

const W = 360
const PAD_L = 36
const PAD_R = 6
const INNER = W - PAD_L - PAD_R
const MAIN_TOP = 10
const MAIN_BOT = 190
const LANE_CY = 210
const DEF_LABEL_Y = 236
const DEF_ZERO = 276
const DEF_HALF = 28
const H = 320

export function WeightTrendChart() {
  const { t, i18n } = useTranslation()
  const { days, settings } = useApp()
  const [range, setRange] = useState<Range>(90)
  const [sel, setSel] = useState<string | null>(null)

  const weighIns = useMemo(() => extractWeighIns(days), [days])
  const s = useMemo(() => dailySeries(days, range), [days, range])
  const corr = useMemo(() => safeCorridor(weighIns, s, settings.goalWeightKg), [weighIns, s, settings.goalWeightKg])
  const deficits = useMemo(() => deficitSeries(days, s, settings.dailyBudget), [days, s, settings.dailyBudget])

  if (weighIns.length === 0) {
    return (
      <div className="card">
        <strong>{t('weight.trendTitle')}</strong>
        <div className="muted" style={{ marginTop: 6 }}>{t('weight.empty0')}</div>
      </div>
    )
  }

  const conv = (kg: number) => round1(kg)
  const unitLabel = t('weight.kg')
  const fmtDate = (date: string) =>
    Intl.DateTimeFormat(i18n.language, { month: 'numeric', day: 'numeric' }).format(fromDateKey(date))
  const total = Math.max(1, daysBetween(s.start, s.end))
  const x = (date: string) => PAD_L + (daysBetween(s.start, date) / total) * INNER

  const showTrend = weighIns.length >= 3
  const showSubs = showTrend

  // main Y bounds: dots + trend + corridor rails, 20% pad with a 0.5 floor
  const mainVals = s.points.flatMap(p => [p.kg, p.trend]).filter((v): v is number => v != null)
  if (corr) {
    for (const r of [...corr.slow, ...corr.fast]) mainVals.push(r.v)
  }
  const b = padBounds(Math.min(...mainVals), Math.max(...mainVals))
  const yMain = (kg: number) => MAIN_BOT - ((kg - b.lo) / (b.hi - b.lo)) * (MAIN_BOT - MAIN_TOP)

  const bDef = symmetricBounds(deficits.map(p => p.deficit), 1)
  const subBar = (v: number, zero: number, half: number, bound: { lo: number; hi: number }) => {
    const h = Math.min(Math.abs(v) / (-bound.lo), 1) * half
    return { y: v < 0 ? zero : zero - h, height: Math.max(h, 0.5) }
  }

  // trend path: new M-segment after every fused gap
  let trendPath = ''
  let pen = false
  for (const p of s.points) {
    if (p.trend == null) { pen = false; continue }
    trendPath += `${pen ? 'L' : 'M'}${x(p.date).toFixed(1)},${yMain(p.trend).toFixed(1)} `
    pen = true
  }

  // readout: tapped column wins, else the latest in-range weigh-in
  const latest = [...weighIns].reverse().find(w => w.date >= s.start && w.date <= s.end)
  const ro = (sel && s.points.find(p => p.date === sel))
    || (latest ? s.points.find(p => p.date === latest.date) : undefined)
  const tagLabel = (tag: string) => t(`weight.tag${tag.charAt(0).toUpperCase()}${tag.slice(1)}`)

  function onPick(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget
    let vx: number
    const ctm = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null
    if (ctm) {
      // manual affine inverse — element-based mapping, immune to dir="rtl"
      const inv = ctm.inverse()
      vx = inv.a * e.clientX + inv.c * e.clientY + inv.e
    } else {
      const r = svg.getBoundingClientRect()
      vx = (e.clientX - r.left) * (W / (r.width || W))
    }
    const frac = (vx - PAD_L) / INNER
    const p = s.points[Math.max(0, Math.min(s.points.length - 1, Math.round(frac * total)))]
    if (p) setSel(p.date)
  }

  const ticks = [0, 1, 2, 3, 4].map(k => s.points[Math.round((k * total) / 4)]).filter(Boolean)
  const inRange = weighIns.filter(w => w.date >= s.start && w.date <= s.end)

  return (
    <div className="card">
      <div className="row spread">
        <strong>{t('weight.trendTitle')}</strong>
        <div className="row" style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {([30, 90, 'all'] as Range[]).map(r => (
            <button key={String(r)} type="button" data-testid={`range-${r}`} onClick={() => { setRange(r); setSel(null) }}
              style={{
                padding: '6px 10px', border: 'none', cursor: 'pointer', fontSize: 12,
                background: range === r ? 'var(--accent)' : 'var(--card)', color: range === r ? '#fff' : 'inherit',
              }}>
              {t(r === 30 ? 'weight.range30' : r === 90 ? 'weight.range90' : 'weight.rangeAll')}
            </button>
          ))}
        </div>
      </div>

      <div data-testid="trend-readout" className="muted" style={{ fontSize: 12, marginTop: 6, minHeight: 18 }}>
        {ro && ro.kg != null ? (
          <>
            {fmtDate(ro.date)} · {t('weight.readoutWeight')} {conv(ro.kg)} {unitLabel}
            {ro.trend != null && <> · {t('weight.readoutTrend')} {conv(ro.trend)}</>}
            {(ro.date === days[ro.date]?.date && (days[ro.date]?.tags ?? []).length > 0)
              && <> · {(days[ro.date].tags as string[]).map(tagLabel).join(' · ')}</>}
          </>
        ) : t('weight.noData')}
      </div>

      <svg data-testid="weight-trend-svg" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', marginTop: 4 }}
        onPointerDown={onPick}>
        {/* corridor fill + rails (behind everything) */}
        {corr && (
          <>
            <polygon data-testid="corridor-fill"
              points={corr.fast.map(p => `${x(p.date)},${yMain(p.v)}`)
                .concat(corr.slow.slice(0, corr.fast.length).reverse().map(p => `${x(p.date)},${yMain(p.v)}`))
                .join(' ')}
              fill="var(--green)" opacity={0.08} />
            <polyline data-testid="corridor-rail-slow" points={corr.slow.map(p => `${x(p.date)},${yMain(p.v)}`).join(' ')}
              fill="none" stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" />
            <polyline data-testid="corridor-rail-fast" points={corr.fast.map(p => `${x(p.date)},${yMain(p.v)}`).join(' ')}
              fill="none" stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" />
          </>
        )}

        {/* main gridlines + y labels */}
        {[b.lo, (b.lo + b.hi) / 2, b.hi].map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yMain(v)} y2={yMain(v)} stroke="var(--line)" strokeWidth={0.5} />
            <text x={PAD_L - 4} y={yMain(v) + 3} fontSize={9} fill="var(--muted)" textAnchor="end">{conv(v).toFixed(1)}</text>
          </g>
        ))}

        {/* raw weigh-in dots */}
        {inRange.map(w => (
          <circle key={w.date} data-testid={`trend-dot-${w.date}`} cx={x(w.date)} cy={yMain(w.kg)} r={3}
            fill="#b0b0b5" opacity={0.55} />
        ))}

        {/* 7-day average line */}
        {showTrend && (
          <path data-testid="trend-line" d={trendPath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" />
        )}

        {/* x labels */}
        {ticks.map(p => (
          <text key={p.date} x={x(p.date)} y={H - 6} fontSize={9} fill="var(--muted)" textAnchor="middle">
            {fmtDate(p.date)}
          </text>
        ))}

        {/* event lane */}
        {inRange.filter(w => (days[w.date]?.tags ?? []).length > 0).map(w => {
          const tags = days[w.date].tags as string[]
          return tags.length === 1 ? (
            <circle key={w.date} data-testid={`event-dot-${w.date}`} cx={x(w.date)} cy={LANE_CY} r={4} fill={TAG_COLORS[tags[0] as keyof typeof TAG_COLORS]} />
          ) : (
            <g key={w.date}>
              <circle data-testid={`event-multi-${w.date}`} cx={x(w.date)} cy={LANE_CY} r={5}
                fill="var(--card)" stroke="var(--accent)" strokeWidth={1.5} />
              <text x={x(w.date)} y={LANE_CY + 3} fontSize={8} fill="var(--accent)" textAnchor="middle">+</text>
            </g>
          )
        })}

        {/* deficit sub-chart */}
        {showSubs && (
          <>
            <text x={2} y={DEF_LABEL_Y} fontSize={9} fill="var(--muted)">{t('weight.deficitSub')}</text>
            <line x1={PAD_L} x2={W - PAD_R} y1={DEF_ZERO} y2={DEF_ZERO} stroke="var(--line)" strokeWidth={0.5} />
            {deficits.map(p => {
              const { y, height } = subBar(p.deficit, DEF_ZERO, DEF_HALF, bDef)
              return <rect key={p.date} data-testid={`deficit-bar-${p.date}`} x={x(p.date) - (INNER / total) * 0.35}
                width={(INNER / total) * 0.7} y={y} height={height}
                fill={p.deficit < 0 ? 'var(--green)' : 'var(--red)'} />
            })}
          </>
        )}
      </svg>

      <div className="muted" style={{ fontSize: 11, display: 'flex', gap: 32, marginTop: 6, justifyContent: 'center' }}>
        <span style={{ color: '#b0b0b5' }}>● {t('weight.legendDot')}</span>
        <span style={{ color: 'var(--accent)' }}>— {t('weight.legendTrend')}</span>
        <span>╌ {t('weight.legendCorridor')}</span>
      </div>

      {weighIns.length < 3 && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t('weight.empty1')}</div>}
      {!corr && weighIns.length >= 3 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {settings.goalWeightKg == null ? t('weight.corridorNoGoal') : t('weight.corridorBadGoal')}
        </div>
      )}
    </div>
  )
}
