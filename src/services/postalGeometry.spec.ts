import { describe, expect, it } from 'vitest'

import type { PienalueBoundary } from '@/domain/areas'
import type { PostalCodeArea } from '@/domain/postal'
import {
  findPostalCodeForPoint,
  postalIntersectsBoundary,
  postalRingsForLeaflet,
} from '@/services/postalGeometry'

const postal: PostalCodeArea = {
  code: '65100',
  nameFi: 'Vaasa keskusta',
  nameSv: 'Vasa centrum',
  releaseYear: 2026,
  statisticsYear: 2024,
  population: 100,
  employed: 50,
  unemployed: 5,
  students: 10,
  averageIncome: 30000,
  employedShare: 50,
  unemployedShare: 5,
  studentShare: 10,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [21.6, 63.08],
        [21.64, 63.08],
        [21.64, 63.12],
        [21.6, 63.12],
        [21.6, 63.08],
      ],
    ],
  },
}

function boundary(rings: PienalueBoundary['rings']): PienalueBoundary {
  return { rings } as PienalueBoundary
}

describe('postal geometry', () => {
  it('detects overlapping municipal and postal polygons', () => {
    const area = boundary([
      [
        [63.09, 21.61],
        [63.09, 21.63],
        [63.11, 21.63],
        [63.11, 21.61],
      ],
    ])

    expect(postalIntersectsBoundary(postal, area)).toBe(true)
  })

  it('rejects separated polygons', () => {
    const area = boundary([
      [
        [62.9, 21.2],
        [62.9, 21.3],
        [63, 21.3],
        [63, 21.2],
      ],
    ])

    expect(postalIntersectsBoundary(postal, area)).toBe(false)
  })

  it('converts GeoJSON longitude-latitude coordinates for Leaflet', () => {
    expect(postalRingsForLeaflet(postal)[0]?.[0]).toEqual([63.08, 21.6])
  })

  it('finds the postal area containing an address point', () => {
    expect(findPostalCodeForPoint(63.1, 21.62, [postal])?.code).toBe('65100')
    expect(findPostalCodeForPoint(62.9, 21.2, [postal])).toBeNull()
  })
})
