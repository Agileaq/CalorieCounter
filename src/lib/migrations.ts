export const CURRENT_SCHEMA_VERSION = 1

// Each step transforms data from version N to N+1. Add steps as the schema evolves.
// Example future step:
//   1: (data) => ({ ...data, newField: [] }),
const steps: Record<number, (data: unknown) => unknown> = {}

export function migrate(raw: { version: number; data: unknown }): { version: number; data: unknown } {
  let { version, data } = raw
  while (version < CURRENT_SCHEMA_VERSION && steps[version]) {
    data = steps[version](data)
    version += 1
  }
  // If already >= current (or no step exists), return as-is without downgrading.
  return { version: Math.max(version, raw.version), data }
}
