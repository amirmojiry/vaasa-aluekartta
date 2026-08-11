import { describe, expect, it } from 'vitest'

import { localizeAreaName, localeForLanguage } from '@/i18n'

describe('localizeAreaName', () => {
  const names = {
    fi: 'Keskusta',
    en: 'Centre',
    fa: 'مرکز',
  }

  it('uses the English label when the English version is requested', () => {
    expect(localizeAreaName(names, 'Keskusta', 'en')).toBe('Centre')
  })

  it('uses the Finnish label when the Finnish version is requested', () => {
    expect(localizeAreaName(names, 'Centre', 'fi')).toBe('Keskusta')
  })

  it('uses the Persian label when the Persian version is requested', () => {
    expect(localizeAreaName(names, 'Keskusta', 'fa')).toBe('مرکز')
  })

  it('falls back to the Finnish OSM name when a translation is missing', () => {
    expect(localizeAreaName({ fi: 'Gerby' }, 'Gerby', 'fa')).toBe('Gerby')
  })
})

describe('localeForLanguage', () => {
  it('uses Finnish locale formatting for the Finnish UI', () => {
    expect(localeForLanguage('fi')).toBe('fi-FI')
  })
})
