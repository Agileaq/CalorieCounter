import { useEffect, useState, type CSSProperties } from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  integer?: boolean
  testId?: string
  style?: CSSProperties
}

/**
 * Number input that does NOT clamp to "0" while the user is editing.
 *
 * A plain controlled `type="number"` input (`value={n}` + `onChange`) forces the
 * field back to "0" the moment the user clears it, so typing a digit afterwards
 * yields "01". This keeps a local raw-text state while focused, parses on every
 * keystroke for the persisted value, and only normalizes (empty → 0) on blur.
 */
export function NumberInput({ value, onChange, integer, testId, style }: Props) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)

  // sync from an external value change (e.g. settings load/import), but never while editing
  useEffect(() => { if (!focused) setText(String(value)) }, [value, focused])

  function parse(s: string): number {
    const n = integer ? parseInt(s, 10) : parseFloat(s)
    return Number.isFinite(n) ? n : 0
  }

  return (
    <input
      data-testid={testId}
      type="number"
      inputMode="decimal"
      value={text}
      style={style}
      onFocus={e => { setFocused(true); setText(e.target.value) }}
      onChange={e => { setText(e.target.value); onChange(parse(e.target.value)) }}
      onBlur={() => {
        setFocused(false)
        const n = parse(text)
        onChange(n)
        setText(String(n))
      }}
    />
  )
}
