import { describe, expect, it } from 'vitest'

import { AREAS } from '@/config/areas'
import type { OverpassBoundaryResponse, OverpassWayElement } from '@/domain/areas'
import {
  buildPienalueQuery,
  parsePienalueResponse,
  stitchWaysIntoRings,
} from '@/services/osmBoundary'

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

describe('pienalue boundary loading', () => {
  it('queries the 55 known child relations and discovers Vähäkyrö level-10 relations', () => {
    const query = buildPienalueQuery(AREAS)

    expect(query).toContain('11930883')
    expect(query).toContain('11931248')
    expect(query).toContain('rel(2249140)')
    expect(query).toContain('map_to_area->.vahakyroArea')
    expect(query).toContain('["admin_level"="10"]')
    expect(query).toContain('way(r.children:"outer")')
  })

  it('assigns known child relations to their parent and discovered relations to Vähäkyrö', () => {
    const response: OverpassBoundaryResponse = {
      elements: [
        {
          type: 'relation',
          id: 11930883,
          members: [{ type: 'way', ref: 101, role: 'outer' }],
          tags: {
            boundary: 'administrative',
            admin_level: '10',
            name: 'Keskusta test',
            ref: '010',
          },
        },
        {
          type: 'relation',
          id: 99999999,
          members: [{ type: 'way', ref: 102, role: 'outer' }],
          tags: {
            boundary: 'administrative',
            admin_level: '10',
            name: 'Vähäkyrö test',
            ref: '120',
          },
        },
        {
          type: 'way',
          id: 101,
          nodes: [1, 2, 3, 1],
          geometry: [
            { lat: 63, lon: 21 },
            { lat: 63, lon: 21.1 },
            { lat: 63.1, lon: 21.1 },
            { lat: 63, lon: 21 },
          ],
        },
        {
          type: 'way',
          id: 102,
          nodes: [4, 5, 6, 4],
          geometry: [
            { lat: 63.1, lon: 22 },
            { lat: 63.1, lon: 22.1 },
            { lat: 63.2, lon: 22.1 },
            { lat: 63.1, lon: 22 },
          ],
        },
      ],
    }

    const boundaries = parsePienalueResponse(response, AREAS)

    expect(boundaries).toHaveLength(2)
    expect(boundaries.find((item) => item.relationId === 11930883)?.parentSlug).toBe('keskusta')
    expect(boundaries.find((item) => item.relationId === 99999999)?.parentSlug).toBe('vahakyro')
  })
})
