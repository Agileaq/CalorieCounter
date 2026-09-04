import { HalfRing } from './HalfRing'

interface Props { consumed: number; budget: number; size?: number }

// Calendar day dot, as a mini version of the dashboard HalfRing gauge:
// green fills toward the budget notch, red continues past it when over,
// grey track when nothing is logged. Same progress semantics as the
// dashboard calorie arc, just sized down for the calendar grid.
export function CalorieRing({ consumed, budget, size = 48 }: Props) {
  const ratio = budget > 0 ? consumed / budget : 0
  return <HalfRing ratio={ratio} size={size} color="var(--green)" />
}
