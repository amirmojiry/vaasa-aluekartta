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

  it('uses the stable Persian area label when the Persian version is requested', () => {
    expect(localizeAreaName(names, 'Keskusta', 'fa')).toBe('مرکز شهر')
  })

  it('uses the stable Persian major-area fallback when a source translation is missing', () => {
    expect(localizeAreaName({ fi: 'Gerby', en: 'Gerby major district' }, 'Gerby', 'fa')).toBe(
      'گربو',
    )
    expect(localizeAreaName({ fi: 'Keskusta 4', en: 'Keskusta 4' }, 'Keskusta 4', 'fa')).toBe(
      'مرکز شهر ۴',
    )
    expect(localizeAreaName({ fi: 'Vähäkyrö', fa: 'قدیمی' }, 'Vähäkyrö', 'fa')).toBe('وهه‌کورو')
  })

  it('prefers the Finnish source name over an English fallback in Persian mode', () => {
    expect(
      localizeAreaName({ fi: 'Hietalahti 9', en: 'English area name' }, 'Hietalahti 9', 'fa'),
    ).toBe('Hietalahti ۹')
  })
})

describe('localeForLanguage', () => {
  it('uses Finnish locale formatting for the Finnish UI', () => {
    expect(localeForLanguage('fi')).toBe('fi-FI')
  })
})
