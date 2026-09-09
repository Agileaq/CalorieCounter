import { useEffect, useState, type CSSProperties } from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  integer?: boolean
  testId?: string
  style?: CSSProperties
  placeholder?: string
  /** When true, a value of 0 renders as an empty field so the placeholder can
   *  show through (used by the new-food serving row, where 0 means "unset").
   *  Defaults to false — NutritionFields keeps showing "0" as before. */
  hideZero?: boolean
  /** When true, focusing the field blanks it so the user can type a fresh
   *  value without clearing first (linked 数值 field). Blurring with no new
   *  input restores the external value instead of committing 0. */
  clearOnFocus?: boolean
  /** Escape hatch for key handling on the raw input (e.g. Enter-to-commit). */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

/**
 * Number input that does NOT clamp to "0" while the user is editing.
 *
 * A plain controlled `type="number"` input (`value={n}` + `onChange`) forces the
 * field back to "0" the moment the user clears it, so typing a digit afterwards
 * yields "01". This keeps a local raw-text state while focused, parses on every
 * keystroke for the persisted value, and only normalizes (empty → 0) on blur.
 *
 * With `hideZero`, an external value of 0 is shown as "" (so a placeholder can
 * read through); the user's own in-progress 0 is still displayed as "0".
 */
export function NumberInput({ value, onChange, integer, testId, style, placeholder, hideZero, clearOnFocus, onKeyDown }: Props) {
  const [text, setText] = useState(value === 0 && hideZero ? '' : String(value))
  const [focused, setFocused] = useState(false)

  // sync from an external value change (e.g. settings load/import), but never while editing
  useEffect(() => { if (!focused) setText(value === 0 && hideZero ? '' : String(value)) }, [value, focused, hideZero])

  function parse(s: string): number {
    const n = integer ? parseInt(s, 10) : parseFloat(s)
    return Number.isFinite(n) ? n : 0
  }

  return (
    <input
      data-testid={testId}
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      style={style}
      onFocus={e => { setFocused(true); setText(clearOnFocus ? '' : e.target.value) }}
      onChange={e => { setText(e.target.value); onChange(parse(e.target.value)) }}
      onKeyDown={onKeyDown}
      onBlur={() => {
        setFocused(false)
        if (clearOnFocus && text.trim() === '') {
          // nothing typed: restore the external value, don't commit a 0
          setText(value === 0 && hideZero ? '' : String(value))
          return
        }
        const n = parse(text)
        onChange(n)
        setText(n === 0 && hideZero ? '' : String(n))
      }}
    />
  )
}
