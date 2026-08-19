/**
 * A ~270° arc gauge (gap at the bottom) used by the Dashboard stat cards.
 * The white notch at 80% of the sweep marks the target: fill reaches it at
 * ratio 1 (Under) and continues past it in red up to the full sweep at
 * ratio 2 (Over). Center content is provided via children.
 */
import type { ReactNode } from 'react'

interface Props { ratio: number; size?: number; color?: string; children?: ReactNode }

const NOTCH = 0.8

/** Map a consumed/target ratio onto the fraction of the sweep to fill. */
export function ringFraction(ratio: number): number {
  if (ratio <= 0) return 0
  return Math.min(ratio, 1) * NOTCH + Math.min(Math.max(ratio - 1, 0), 1) * (1 - NOTCH)
}

export function HalfRing({ ratio, size = 120, color = 'var(--accent)', children }: Props) {
  const stroke = size * 0.1
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const start = 135
  const sweep = 270
  const frac = ringFraction(ratio)
  const p = (deg: number, rr = r): [number, number] => {
    const rad = (deg * Math.PI) / 180
    return [cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)]
  }
  const arc = (from: number, to: number) => {
    const [x1, y1] = p(from)
    const [x2, y2] = p(to)
    const large = to - from > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const notchDeg = start + sweep * NOTCH
  const underEnd = start + sweep * Math.min(frac, NOTCH)
  const overEnd = start + sweep * frac
  const [nx1, ny1] = p(notchDeg, r - stroke / 2)
  const [nx2, ny2] = p(notchDeg, r + stroke / 2)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arc(start, start + sweep)} fill="none" stroke="#e5e5ea" strokeWidth={stroke} strokeLinecap="round" />
      {frac > 0 && (
        <path data-testid="stat-ring-fill" d={arc(start, underEnd)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      )}
      {frac > NOTCH && (
        <path data-testid="stat-ring-over" d={arc(notchDeg, overEnd)} fill="none" stroke="var(--red)" strokeWidth={stroke} />
      )}
      <line data-testid="stat-ring-notch" x1={nx1} y1={ny1} x2={nx2} y2={ny2} stroke="var(--card)" strokeWidth={2} />
      {children && <foreignObject x="0" y="0" width={size} height={size}>{children}</foreignObject>}
    </svg>
  )
}
