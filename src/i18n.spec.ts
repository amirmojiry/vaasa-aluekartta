import { describe, expect, it } from 'vitest'

import { localizeAreaName } from '@/i18n'

describe('localizeAreaName', () => {
  const names = {
    fi: 'Keskusta',
    en: 'Centre',
    fa: 'مرکز',
  }

  it('uses the English label when the English version is requested', () => {
    expect(localizeAreaName(names, 'Keskusta', 'en')).toBe('Centre')
  })

  it('uses the Persian label when the Persian version is requested', () => {
    expect(localizeAreaName(names, 'Keskusta', 'fa')).toBe('مرکز')
  })

  it('falls back to the Finnish OSM name when a translation is missing', () => {
    expect(localizeAreaName({ fi: 'Gerby' }, 'Gerby', 'fa')).toBe('Gerby')
  })
})
