interface Props { consumed: number; budget: number; size?: number }

// Calendar day dot. Binary like the dashboard calorie arc:
//   no data (consumed 0) → grey track, logged under/at budget → solid green,
//   logged over budget → solid red. A full ring in either color reads at a
// glance; no proportional fill is shown.
export function CalorieRing({ consumed, budget, size = 48 }: Props) {
  const stroke = size * 0.12
  const r = (size - stroke) / 2
  const color = consumed <= 0
    ? '#d8d8dd'
    : budget > 0 && consumed > budget
      ? 'var(--red)'
      : 'var(--green)'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} />
    </svg>
  )
}
