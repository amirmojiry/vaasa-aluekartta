import { describe, expect, it } from 'vitest'

import {
  buildPoiLocationIndex,
  looksMultiLocation,
  pointWithinVaasaBounds,
  resolveEventLocally,
} from './event-location.mjs'

function poi(id, name, coordinates, address, names) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: {
      id,
      name,
      osmType: 'way',
      osmId: Number(id.replace(/\D/g, '')),
      ...(address ? { address } : {}),
      ...(names ? { names } : {}),
    },
  }
}

const pois = {
  type: 'FeatureCollection',
  features: [
    poi(
      'way/1',
      'Vaasan pääkirjasto',
      [21.6107973, 63.0994592],
      'Kirjastonkatu 13, Vaasa',
      { en: 'Vaasa Main Library', sv: 'Vasa huvudbibliotek' },
    ),
    poi('way/2', 'Vaasan Sähkö Areena', [21.6419923, 63.0799013], 'Rinnakkaistie 1'),
    poi('way/3', 'Duplicate Hall', [21.61, 63.09]),
    poi('way/4', 'Duplicate Hall', [21.62, 63.1]),
  ],
}

const index = buildPoiLocationIndex(pois)

describe('event local location resolution', () => {
  it('resolves exact source addresses before venue names', () => {
    const result = resolveEventLocally(
      { venue: 'Unmatched venue', addressText: 'Kirjastonkatu 13, Vaasa' },
      index,
    )

    expect(result.resolution.precision).toBe('exact-address')
    expect(result.resolution.longitude).toBe(21.6107973)
    expect(result.resolution.provenance.licence).toBe('ODbL 1.0')
  })

  it('matches localized POI names and the reviewed arena spelling alias', () => {
    expect(resolveEventLocally({ venue: 'Vaasa Main Library' }, index).resolution.precision).toBe(
      'known-venue',
    )
    expect(resolveEventLocally({ venue: 'Vaasan Sähkö Arena' }, index).resolution.label).toBe(
      'Vaasan Sähkö Areena',
    )
  })

  it('does not guess when an exact local name maps to multiple points', () => {
    const result = resolveEventLocally({ venue: 'Duplicate Hall' }, index)
    expect(result.resolution).toEqual({
      precision: 'unresolved',
      reason: 'ambiguous-local-match',
      sourceAddress: 'Duplicate Hall',
    })
  })

  it('classifies online and multi-location records without inventing a marker', () => {
    expect(resolveEventLocally({ online: true }, index).resolution.precision).toBe('online')
    expect(
      resolveEventLocally({ venue: 'Keskusta, Palosaari, Gerby, Suvilahti' }, index).resolution
        .precision,
    ).toBe('multi-location')
    expect(looksMultiLocation('Raastuvankatu 30, 65100 Vaasa')).toBe(false)
  })

  it('uses the verified municipality bbox as a coarse point guard', () => {
    expect(pointWithinVaasaBounds(21.6107973, 63.0994592)).toBe(true)
    expect(pointWithinVaasaBounds(24.9384, 60.1699)).toBe(false)
  })
})
