import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

interface BoundaryFeature {
  properties: {
    level: 'suuralue' | 'pienalue'
    name: string
  }
}

interface BoundaryCollection {
  features: BoundaryFeature[]
}

interface StatisticsDatabase {
  coverage: { mappedAreaRecords: number }
  areas: Record<string, unknown>
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../public/data/${relativePath}`, import.meta.url), 'utf8'),
  ) as T
}

describe('area statistics coverage', () => {
  it('contains one statistics record for every currently mapped major and minor area', () => {
    const major = readJson<BoundaryCollection>('vaasa-suuralueet.geojson')
    const minor = readJson<BoundaryCollection>('vaasa-pienalueet.geojson')
    const database = readJson<StatisticsDatabase>('area-statistics.json')
    const features = [...major.features, ...minor.features]

    expect(features).toHaveLength(67)
    expect(database.coverage.mappedAreaRecords).toBe(67)
    expect(Object.keys(database.areas)).toHaveLength(67)

    for (const feature of features) {
      const key = `${feature.properties.level}:${feature.properties.name}`
      expect(database.areas, `missing statistics for ${key}`).toHaveProperty(key)
    }
  })
})
