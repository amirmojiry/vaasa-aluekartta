import { describe, expect, it } from 'vitest'

import type { PostalCodeArea, PostalCodeCollection } from '@/domain/postal'
import { postalMetricRank, postalMetricValue } from '@/services/postalData'

const geometry = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [21.5, 63.0],
      [21.6, 63.0],
      [21.6, 63.1],
      [21.5, 63.0],
    ],
  ],
}

function area(code: string, population: number, employedShare: number): PostalCodeArea {
  return {
    code,
    nameFi: code,
    nameSv: code,
    releaseYear: 2026,
    statisticsYear: 2024,
    population,
    employed: Math.round((population * employedShare) / 100),
    unemployed: 0,
    students: 0,
    averageIncome: 30000,
    employedShare,
    unemployedShare: 0,
    studentShare: 0,
    geometry,
  }
}

describe('postal metrics', () => {
  it('uses resident shares for employment rankings', () => {
    const areas = [area('65100', 1000, 40), area('65200', 500, 60), area('65300', 800, 50)]
    const collection: PostalCodeCollection = {
      areas,
      sourceUrl: 'https://example.test',
      statisticsYear: 2024,
      releaseYear: 2026,
    }

    expect(postalMetricValue(areas[0]!, 'employed')).toBe(40)
    expect(postalMetricRank(collection, areas[0]!, 'employed')).toEqual({
      rank: 3,
      total: 3,
      value: 40,
    })
    expect(postalMetricRank(collection, areas[1]!, 'population')?.rank).toBe(3)
  })
})
