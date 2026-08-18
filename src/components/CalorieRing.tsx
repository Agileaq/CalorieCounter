import type { ReactNode } from 'react'

interface Props { consumed: number; budget: number; size?: number; children?: ReactNode }

export function CalorieRing({ consumed, budget, size = 48, children }: Props) {
  const stroke = size * 0.12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = budget > 0 ? Math.min(consumed / budget, 1) : 0
  const over = budget > 0 && consumed > budget
  const color = consumed === 0 ? '#d8d8dd' : over ? 'var(--red)' : 'var(--green)'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e5ea" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      {children && <foreignObject x="0" y="0" width={size} height={size}>{children}</foreignObject>}
    </svg>
  )
}
