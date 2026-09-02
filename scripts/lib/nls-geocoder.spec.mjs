import { describe, expect, it, vi } from 'vitest'

import {
  buildNlsSearchUrl,
  geocodeWithNls,
  NLS_CACHE_VERIFICATION,
  selectNlsResult,
} from './nls-geocoder.mjs'

function response(features) {
  return { type: 'FeatureCollection', features }
}

function feature(
  source,
  coordinates = [21.61, 63.1],
  label = 'Ritz (Vaasa)',
  properties = {},
) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: { source, label, municipality: '905', ...properties },
  }
}

function addressFeature(source = 'addresses', coordinates = [21.61, 63.1]) {
  return feature(source, coordinates, 'Kirjastonkatu 13 (Vaasa)')
}

describe('NLS geocoder adapter', () => {
  it('builds a v2 CRS84 query using the authoritative address source first', () => {
    const url = buildNlsSearchUrl('Kirjastonkatu 13')
    expect(url.pathname).toBe('/geocoding/v2/pelias/search')
    expect(url.searchParams.get('text')).toBe('Kirjastonkatu 13 Vaasa')
    expect(url.searchParams.get('sources')).toBe('addresses')
    expect(url.searchParams.has('crs')).toBe(false)
  })

  it('keeps explicit non-Vaasa context instead of appending Vaasa', () => {
    const postal = buildNlsSearchUrl('Dalgatan 4, 10300 KARIS')
    expect(postal.searchParams.get('text')).toBe('Dalgatan 4, 10300 KARIS')
    expect(postal.searchParams.get('options')).toContain('use_postal_code')

    const locality = buildNlsSearchUrl('Kirjastonkatu 13, Helsinki')
    expect(locality.searchParams.get('text')).toBe('Kirjastonkatu 13, Helsinki')
  })

  it('does not call the network when no API key is available', async () => {
    const fetchImpl = vi.fn()
    const result = await geocodeWithNls('Ritz Vaasa', { fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result.resolution.reason).toBe('remote-key-missing')
  })

  it('uses Basic auth and accepts a source-backed matching Vaasa address result', async () => {
    const fetchImpl = vi.fn(async (_url, options) => ({
      ok: true,
      status: 200,
      async json() {
        return response([addressFeature()])
      },
      options,
    }))

    const result = await geocodeWithNls('Kirjastonkatu 13', {
      apiKey: 'secret-key',
      fetchImpl,
      now: () => new Date('2026-09-02T00:00:00Z'),
    })

    const [, options] = fetchImpl.mock.calls[0]
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from('secret-key:').toString('base64')}`,
    )
    expect(result.resolution.geocoder).toBe('nls-geocoding-v2')
    expect(result.resolution.provenance.dataset).toBe('addresses')
    expect(result.resolution.provenance.provider).toContain('Syke')
    expect(result.cacheEntry.rawQuery).toBe('Kirjastonkatu 13')
    expect(result.cacheEntry.precision).toBe('exact-address')
    expect(result.cacheEntry.verification).toBe(NLS_CACHE_VERIFICATION)
  })

  it('rejects singleton results that do not match the source query or Vaasa municipality', () => {
    expect(
      selectNlsResult(response([feature('addresses', [21.61, 63.1], 'Wrong Street 9 (Vaasa)')]), 'Kirjastonkatu 13', 'now')
        .resolution.reason,
    ).toBe('geocoder-result-mismatch')

    expect(
      selectNlsResult(
        response([
          feature('addresses', [21.61, 63.1], 'Kirjastonkatu 13 (Helsinki)', {
            municipality: '091',
          }),
        ]),
        'Kirjastonkatu 13',
        'now',
      ).resolution.reason,
    ).toBe('geocoder-result-mismatch')
  })

  it('falls back to interpolated road addresses only when the direct address source has no result', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        async json() {
          return response([])
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        async json() {
          return response([addressFeature('interpolated-road-addresses')])
        },
      })

    const result = await geocodeWithNls('Kirjastonkatu 13', {
      apiKey: 'secret-key',
      fetchImpl,
      now: () => new Date('2026-09-02T00:00:00Z'),
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[0][0].searchParams.get('sources')).toBe('addresses')
    expect(fetchImpl.mock.calls[1][0].searchParams.get('sources')).toBe(
      'interpolated-road-addresses',
    )
    expect(result.resolution.provenance.dataset).toBe('interpolated-road-addresses')
  })

  it('does not hide ambiguity inside the authoritative address source', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return response([addressFeature(), addressFeature('addresses', [21.62, 63.1])])
      },
    }))

    const result = await geocodeWithNls('Kirjastonkatu 13', {
      apiKey: 'secret-key',
      fetchImpl,
      now: () => new Date('2026-09-02T00:00:00Z'),
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(result.resolution.reason).toBe('ambiguous-geocoder-match')
  })

  it('fails closed for multiple verified names, outside points, and unknown source datasets', () => {
    expect(
      selectNlsResult(
        response([feature('geographic-names'), feature('geographic-names', [21.62, 63.1])]),
        'Ritz',
        'now',
      ).resolution.reason,
    ).toBe('ambiguous-geocoder-match')
    expect(
      selectNlsResult(response([feature('geographic-names', [24.94, 60.17])]), 'Ritz', 'now')
        .resolution.reason,
    ).toBe('outside-vaasa-bounds')
    expect(
      selectNlsResult(response([feature('unexpected-source')]), 'Ritz', 'now').resolution.reason,
    ).toBe('unsupported-geocoder-source')
  })
})
