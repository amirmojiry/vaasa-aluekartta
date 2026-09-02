import { describe, expect, it } from 'vitest'

import {
  buildPoiLocationIndex,
  canonicalStreetAddressKey,
  eventLocationSignature,
  isVaasaCompatibleAddressContext,
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
    poi('way/1', 'Vaasan pääkirjasto', [21.6107973, 63.0994592], 'Kirjastonkatu 13, Vaasa', {
      en: 'Vaasa Main Library',
      sv: 'Vasa huvudbibliotek',
    }),
    poi('way/2', 'Vaasan Sähkö Areena', [21.6419923, 63.0799013], 'Rinnakkaistie 1'),
    poi('way/3', 'Duplicate Hall', [21.61, 63.09]),
    poi('way/4', 'Duplicate Hall', [21.62, 63.1]),
    poi('way/5', 'Shared Address A', [21.63, 63.09], 'Shared Street 1, Vaasa'),
    poi('way/6', 'Shared Address B', [21.64, 63.09], 'Shared Street 1, Vaasa'),
  ],
}

const index = buildPoiLocationIndex(pois)

describe('event local location resolution', () => {
  it('resolves exact source addresses before venue names without borrowing the POI label', () => {
    const result = resolveEventLocally(
      { venue: 'Unmatched venue', addressText: 'Kirjastonkatu 13, Vaasa' },
      index,
    )

    expect(result.resolution.precision).toBe('exact-address')
    expect(result.resolution.longitude).toBe(21.6107973)
    expect(result.resolution.label).toBeUndefined()
    expect(result.resolution.provenance.licence).toBe('ODbL 1.0')
  })

  it('matches the same street and house number when suffix context is explicitly Vaasa-compatible', () => {
    const result = resolveEventLocally(
      { addressText: 'Kirjastonkatu 13, 65100 Vaasa, Suomi' },
      index,
    )

    expect(canonicalStreetAddressKey('Kirjastonkatu 13, 65100 Vaasa, Suomi')).toBe(
      'kirjastonkatu 13',
    )
    expect(isVaasaCompatibleAddressContext('Kirjastonkatu 13, 65100 Vaasa, Suomi')).toBe(true)
    expect(result.resolution.precision).toBe('exact-address')
    expect(result.resolution.longitude).toBe(21.6107973)
    expect(result.resolution.provenance.transformation).toContain('street-and-house-number')
  })

  it('does not strip conflicting postal/locality context into a Vaasa POI match', () => {
    expect(isVaasaCompatibleAddressContext('Kirjastonkatu 13, 00100 Helsinki')).toBe(false)
    expect(isVaasaCompatibleAddressContext('Kirjastonkatu 13, Helsinki')).toBe(false)
    expect(isVaasaCompatibleAddressContext('Kirjastonkatu 13, 00100')).toBe(false)

    expect(
      resolveEventLocally(
        { venue: 'Vaasa Main Library', addressText: 'Kirjastonkatu 13, 00100 Helsinki' },
        index,
      ),
    ).toBeUndefined()
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

  it('uses a unique venue to disambiguate a shared address', () => {
    const result = resolveEventLocally(
      { venue: 'Shared Address B', addressText: 'Shared Street 1, 65100 Vaasa, Finland' },
      index,
    )

    expect(result.resolution.precision).toBe('known-venue')
    expect(result.resolution.label).toBe('Shared Address B')
  })

  it('classifies online and multi-location records without inventing a marker', () => {
    expect(resolveEventLocally({ online: true }, index).resolution.precision).toBe('online')
    expect(
      resolveEventLocally(
        { online: true, venue: 'Online event', addressText: 'Marenvägen 294, 65410 Vasa' },
        index,
      ).resolution.precision,
    ).toBe('online')
    expect(
      resolveEventLocally({ venue: 'Keskusta, Palosaari, Gerby, Suvilahti' }, index).resolution
        .precision,
    ).toBe('multi-location')
    expect(looksMultiLocation('Raastuvankatu 30, 65100 Vaasa')).toBe(false)
  })

  it('signs the source location fields so stale resolution snapshots can be rejected', () => {
    const original = eventLocationSignature({
      venue: 'Vaasa Main Library',
      addressText: 'Kirjastonkatu 13, Vaasa',
      online: false,
    })
    const moved = eventLocationSignature({
      venue: 'Vaasa Main Library',
      addressText: 'Another street 1, Vaasa',
      online: false,
    })

    expect(original).toMatch(/^[a-f0-9]{64}$/)
    expect(moved).not.toBe(original)
  })

  it('uses the verified municipality bbox as a coarse point guard', () => {
    expect(pointWithinVaasaBounds(21.6107973, 63.0994592)).toBe(true)
    expect(pointWithinVaasaBounds(24.9384, 60.1699)).toBe(false)
  })
})
