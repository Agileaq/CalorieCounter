/**
 * A ~270° arc gauge (gap at the bottom) used by the Dashboard stat cards.
 * `pct` (0..1) fills the arc from the left; `color` is the fill stroke.
 * Center content is provided via children.
 */
import type { ReactNode } from 'react'

interface Props { pct: number; size?: number; color?: string; children?: ReactNode }

export function HalfRing({ pct, size = 120, color = 'var(--accent)', children }: Props) {
  const stroke = size * 0.1
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  // 270° sweep, gap centered at the bottom. Start at 135°, sweep clockwise to 405°(=45°).
  const start = 135
  const sweep = 270
  const clamped = Math.max(0, Math.min(pct, 1))
  const p = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const arc = (fromDeg: number, toDeg: number) => {
    const [x1, y1] = p(fromDeg)
    const [x2, y2] = p(toDeg)
    const large = toDeg - fromDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arc(start, start + sweep)} fill="none" stroke="#e5e5ea" strokeWidth={stroke} strokeLinecap="round" />
      {clamped > 0 && (
        <path d={arc(start, start + sweep * clamped)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      )}
      {children && <foreignObject x="0" y="0" width={size} height={size}>{children}</foreignObject>}
    </svg>
  )
}
