import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CalorieRing } from './CalorieRing'

describe('CalorieRing', () => {
  it('renders a grey ring when nothing is consumed', () => {
    const { container } = render(<CalorieRing consumed={0} budget={100} />)
    expect(container.querySelector('circle')!.getAttribute('stroke')).toBe('#d8d8dd')
  })
  it('renders a solid green ring when under or at budget', () => {
    const { container: under } = render(<CalorieRing consumed={80} budget={100} />)
    expect(under.querySelector('circle')!.getAttribute('stroke')).toBe('var(--green)')
    const { container: at } = render(<CalorieRing consumed={100} budget={100} />)
    expect(at.querySelector('circle')!.getAttribute('stroke')).toBe('var(--green)')
  })
  it('renders a solid red ring when over budget', () => {
    const { container } = render(<CalorieRing consumed={150} budget={100} />)
    expect(container.querySelector('circle')!.getAttribute('stroke')).toBe('var(--red)')
  })
})
