import { describe, expect, it } from 'vitest'

import type { PienalueBoundary } from '@/domain/areas'
import {
  findPienalueForPoint,
  locateBestAddressCandidate,
  pointInPienalue,
} from '@/services/addressSearch'

const area = {
  relationId: 101,
  name: 'Test area',
  ref: 'T1',
  names: { fi: 'Test area' },
  wikidataDescription: {},
  wikipedia: {},
  externalIdentifiers: [],
  parentSlug: 'test-major',
  parentName: 'Test major',
  parentNames: { fi: 'Test major' },
  parentRef: 'T',
  outerWayIds: [],
  rings: [
    [
      [63, 21],
      [63, 22],
      [64, 22],
      [64, 21],
      [63, 21],
    ],
  ],
  source: 'test',
} satisfies PienalueBoundary

const candidates = [
  { query: 'test', displayName: 'Outside', lat: 62, lon: 20 },
  { query: 'test', displayName: 'Inside', lat: 63.5, lon: 21.5 },
]

describe('address area matching', () => {
  it('detects whether a point is inside a minor-area polygon', () => {
    expect(pointInPienalue(63.5, 21.5, area)).toBe(true)
    expect(pointInPienalue(62, 20, area)).toBe(false)
  })

  it('finds the minor area containing a point', () => {
    expect(findPienalueForPoint(63.5, 21.5, [area])?.relationId).toBe(101)
    expect(findPienalueForPoint(62, 20, [area])).toBeNull()
  })

  it('prefers a Vaasa-area candidate over a higher-ranked outside result', () => {
    const result = locateBestAddressCandidate(candidates, [area])
    expect(result?.displayName).toBe('Inside')
    expect(result?.area?.relationId).toBe(101)
  })
})
