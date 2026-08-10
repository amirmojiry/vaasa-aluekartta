import { describe, expect, it } from 'vitest'

import type { OverpassWayElement } from '@/domain/areas'
import { stitchWaysIntoRings } from '@/services/osmBoundary'

describe('stitchWaysIntoRings', () => {
  it('joins reversed OSM way segments into a closed ring', () => {
    const ways: OverpassWayElement[] = [
      {
        type: 'way',
        id: 1,
        nodes: [1, 2, 3],
        geometry: [
          { lat: 63, lon: 21 },
          { lat: 63, lon: 22 },
          { lat: 64, lon: 22 },
        ],
      },
      {
        type: 'way',
        id: 2,
        nodes: [1, 4, 3],
        geometry: [
          { lat: 63, lon: 21 },
          { lat: 64, lon: 21 },
          { lat: 64, lon: 22 },
        ],
      },
    ]

    expect(stitchWaysIntoRings(ways)).toEqual([
      [
        [63, 21],
        [63, 22],
        [64, 22],
        [64, 21],
        [63, 21],
      ],
    ])
  })
})
