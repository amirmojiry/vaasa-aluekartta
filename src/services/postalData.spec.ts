import { describe, expect, it } from 'vitest'

import { postalWfsUrlForBounds } from '@/services/postalData'

describe('postalWfsUrlForBounds', () => {
  it('uses the versioned 2026 Paavo layer and a geographic bbox', () => {
    const url = new URL(
      postalWfsUrlForBounds({ minLat: 63, maxLat: 63.2, minLon: 21.4, maxLon: 21.8 }),
    )

    expect(url.searchParams.get('typeNames')).toBe('postialue:pno_tilasto_2026')
    expect(url.searchParams.get('bbox')).toBe('21.4,63,21.8,63.2,EPSG:4326')
    expect(url.searchParams.has('cql_filter')).toBe(false)
  })
})
