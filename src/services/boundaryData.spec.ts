import { describe, expect, it } from 'vitest'

import { geometryToBoundaryRings } from '@/services/boundaryData'

describe('geometryToBoundaryRings', () => {
  it('converts GeoJSON longitude-latitude coordinates to Leaflet latitude-longitude rings', () => {
    const rings = geometryToBoundaryRings({
      type: 'Polygon',
      coordinates: [
        [
          [21, 63],
          [22, 63],
          [22, 64],
          [21, 63],
        ],
      ],
    })

    expect(rings).toEqual([
      [
        [63, 21],
        [63, 22],
        [64, 22],
        [63, 21],
      ],
    ])
  })

  it('keeps disconnected MultiPolygon outer rings as separate Leaflet rings', () => {
    const rings = geometryToBoundaryRings({
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [21, 63],
            [21.1, 63],
            [21, 63.1],
            [21, 63],
          ],
        ],
        [
          [
            [22, 64],
            [22.1, 64],
            [22, 64.1],
            [22, 64],
          ],
        ],
      ],
    })

    expect(rings).toHaveLength(2)
    expect(rings[0]?.[0]).toEqual([63, 21])
    expect(rings[1]?.[0]).toEqual([64, 22])
  })
})
