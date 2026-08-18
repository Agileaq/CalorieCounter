import { describe, it, expect } from 'vitest'
import { migrate, CURRENT_SCHEMA_VERSION } from './migrations'

describe('migrations', () => {
  it('is a no-op when already current', () => {
    const input = { version: CURRENT_SCHEMA_VERSION, data: { hello: 'world' } }
    expect(migrate(input)).toEqual(input)
  })
  it('never downgrades', () => {
    const input = { version: CURRENT_SCHEMA_VERSION + 5, data: {} }
    expect(migrate(input).version).toBe(CURRENT_SCHEMA_VERSION + 5)
  })
})
