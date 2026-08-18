import { describe, it, expect } from 'vitest'
import en from './locales/en.json'
import zh from './locales/zh.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import ru from './locales/ru.json'
import { applyDir } from './index'

function keyPaths(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`])
}

describe('i18n', () => {
  it('every locale has the same keys as en', () => {
    const base = keyPaths(en).sort()
    for (const [name, loc] of [['zh', zh], ['es', es], ['fr', fr], ['ar', ar], ['ru', ru]] as const) {
      expect({ [name]: keyPaths(loc).sort() }).toEqual({ [name]: base })
    }
  })
  it('applyDir sets rtl for ar and ltr otherwise', () => {
    applyDir('ar'); expect(document.documentElement.dir).toBe('rtl')
    applyDir('en'); expect(document.documentElement.dir).toBe('ltr')
  })
})
