import { describe, expect, it } from 'vitest'

import type { MajorAreaPopulationHistoryDatabase } from '@/domain/populationHistory'
import { latestPopulationChange, majorAreaPopulationRank } from '@/services/populationHistory'

const database: MajorAreaPopulationHistoryDatabase = {
  schemaVersion: 1,
  latestAvailableYear: 2024,
  source: { title: 'test', url: 'https://example.com', accessed: '2026-08-11' },
  areas: {
    Alpha: [[2017, 100], [2024, 125]],
    Beta: [[2017, 200], [2024, 150]],
    Gamma: [[2017, 50], [2024, 50]],
  },
}

describe('population history', () => {
  it('calculates change against the previous measurement', () => {
    const change = latestPopulationChange({
      name: 'Alpha',
      observations: [
        { year: 2017, population: 100 },
        { year: 2024, population: 125 },
      ],
    })

    expect(change?.current).toEqual({ year: 2024, population: 125 })
    expect(change?.previous).toEqual({ year: 2017, population: 100 })
    expect(change?.percent).toBe(25)
  })

  it('ranks the latest population only against major areas from the same year', () => {
    expect(majorAreaPopulationRank(database, 'Beta')).toEqual({
      rank: 1,
      total: 3,
      population: 150,
      year: 2024,
    })
    expect(majorAreaPopulationRank(database, 'Alpha')?.rank).toBe(2)
  })
})
