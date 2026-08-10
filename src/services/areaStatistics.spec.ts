import { describe, expect, it } from 'vitest'

import { decodeAreaStatistics, statisticsKey } from '@/services/areaStatistics'

describe('area statistics', () => {
  it('uses level and Finnish area name as the stable database lookup key', () => {
    expect(statisticsKey('suuralue', 'Gerby')).toBe('suuralue:Gerby')
    expect(statisticsKey('pienalue', 'Huutoniemi')).toBe('pienalue:Huutoniemi')
  })

  it('decodes compact map-ready observations without losing reference values', () => {
    const record = decodeAreaStatistics('suuralue', 'Gerby', {
      p: 10918,
      s: 15.7,
      u: 7.1,
      e: 92.9,
      l: [62.8, 31.7, 5.5],
    })

    expect(record).toEqual({
      level: 'suuralue',
      name: 'Gerby',
      population2015: 10918,
      studentShare2013: 15.7,
      unemployment2013: 7.1,
      employedShare2013: 92.9,
      language2015: {
        finnish: 62.8,
        swedish: 31.7,
        other: 5.5,
      },
    })
  })
})
