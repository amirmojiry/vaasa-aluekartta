import { describe, expect, it } from 'vitest'

import type { AreaIncomeDatabase } from '@/domain/income'
import { areaIncomeKey, areaIncomeRank, incomeDifferencePercent } from '@/services/areaIncome'

const database: AreaIncomeDatabase = {
  schemaVersion: 1,
  description: 'test',
  year: 2014,
  unit: 'eur_per_year',
  populationBasis: 'residents_aged_15_plus',
  cityAverage: 29119,
  source: {
    title: 'test',
    author: 'Sanna Komsi',
    year: 2016,
    institution: 'University of Vaasa',
    underlyingSource: 'Statistics Finland (Tilastokeskus 2014b)',
    appendix: 'Appendix 8',
    thesisPage: 117,
    pdfPage: 118,
    itemUrl: 'https://example.com/item',
    pdfUrl: 'https://example.com/file.pdf',
  },
  coverage: { mappedAreaRecords: 4, values: 3, missing: 1 },
  missingAreas: ['pienalue:Missing'],
  areas: {
    'suuralue:Gerby': 36186,
    'suuralue:Keskusta': 27760,
    'pienalue:Västervikin kylä': 66650,
  },
}

describe('area income', () => {
  it('uses the same level/name lookup key as the area pages', () => {
    expect(areaIncomeKey('suuralue', 'Gerby')).toBe('suuralue:Gerby')
  })

  it('ranks values only against areas at the same level', () => {
    expect(areaIncomeRank(database, 'suuralue', 'Gerby')).toEqual({ rank: 1, total: 2 })
    expect(areaIncomeRank(database, 'suuralue', 'Keskusta')).toEqual({ rank: 2, total: 2 })
    expect(areaIncomeRank(database, 'pienalue', 'Västervikin kylä')).toEqual({ rank: 1, total: 1 })
  })

  it('does not rank an area whose source has no usable income value', () => {
    expect(areaIncomeRank(database, 'pienalue', 'Missing')).toBeNull()
  })

  it('compares income with the Vaasa-wide average', () => {
    expect(incomeDifferencePercent(29119, 29119)).toBe(0)
    expect(incomeDifferencePercent(36186, 29119)).toBeCloseTo(24.27, 2)
  })
})
