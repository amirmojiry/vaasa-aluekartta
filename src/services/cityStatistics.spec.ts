import { describe, expect, it } from 'vitest'

import type { MajorAreaPopulationHistoryDatabase } from '@/domain/populationHistory'
import type { AreaStatisticsDatabase } from '@/domain/statistics'
import { buildCityStatisticsSnapshot } from '@/services/cityStatistics'

const statisticsDatabase: AreaStatisticsDatabase = {
  schemaVersion: 1,
  description: 'test data',
  sources: {},
  datasets: {},
  coverage: {},
  areas: {
    'suuralue:A': { p: 100, s: 10, u: 20, e: 80, l: [50, 30, 20] },
    'suuralue:B': { p: 300, s: 30, u: 10, e: 90, l: [70, 20, 10] },
    'pienalue:Ignored': { p: 1000, s: 99, u: 99, e: 1, l: [1, 1, 98] },
  },
}

const populationDatabase: MajorAreaPopulationHistoryDatabase = {
  schemaVersion: 1,
  latestAvailableYear: 2024,
  source: {
    title: 'test source',
    url: 'https://example.com',
    accessed: '2026-08-11',
  },
  areas: {
    A: [
      [2002, 90],
      [2015, 100],
      [2017, 110],
      [2024, 120],
    ],
    B: [
      [2002, 200],
      [2015, 300],
      [2017, 330],
      [2024, 360],
    ],
  },
}

describe('buildCityStatisticsSnapshot', () => {
  it('aggregates comparable population history and ignores minor areas', () => {
    const snapshot = buildCityStatisticsSnapshot(statisticsDatabase, populationDatabase)

    expect(snapshot.populationHistory).toEqual([
      { year: 2015, population: 400 },
      { year: 2017, population: 440 },
      { year: 2024, population: 480 },
    ])
    expect(snapshot.population).toBe(480)
    expect(snapshot.populationYear).toBe(2024)
  })

  it('uses population-weighted estimates for percentage metrics', () => {
    const snapshot = buildCityStatisticsSnapshot(statisticsDatabase, populationDatabase)

    expect(snapshot.studentShare2013).toBe(25)
    expect(snapshot.unemployment2013).toBe(12.5)
    expect(snapshot.employedShare2013).toBe(87.5)
    expect(snapshot.language2015).toEqual({ finnish: 65, swedish: 22.5, other: 12.5 })
  })
})
