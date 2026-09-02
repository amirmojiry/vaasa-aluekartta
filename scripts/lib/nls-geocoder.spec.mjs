import { describe, expect, it, vi } from 'vitest'

import { buildNlsSearchUrl, geocodeWithNls, selectNlsResult } from './nls-geocoder.mjs'

function response(features) {
  return { type: 'FeatureCollection', features }
}

function feature(source, coordinates = [21.61, 63.1], label = 'Result') {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: { source, label },
  }
}

describe('NLS geocoder adapter', () => {
  it('builds a v2 CRS84 query using the authoritative address source first', () => {
    const url = buildNlsSearchUrl('Kirjastonkatu 13')
    expect(url.pathname).toBe('/geocoding/v2/pelias/search')
    expect(url.searchParams.get('text')).toBe('Kirjastonkatu 13 Vaasa')
    expect(url.searchParams.get('sources')).toBe('addresses')
    expect(url.searchParams.has('crs')).toBe(false)
  })

  it('keeps explicit postal-place context and enables postal-code matching', () => {
    const url = buildNlsSearchUrl('Dalgatan 4, 10300 KARIS')
    expect(url.searchParams.get('text')).toBe('Dalgatan 4, 10300 KARIS')
    expect(url.searchParams.get('options')).toContain('use_postal_code')
  })

  it('does not call the network when no API key is available', async () => {
    const fetchImpl = vi.fn()
    const result = await geocodeWithNls('Ritz Vaasa', { fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result.resolution.reason).toBe('remote-key-missing')
  })

  it('uses Basic auth and accepts one supported in-bounds address result', async () => {
    const fetchImpl = vi.fn(async (_url, options) => ({
      ok: true,
      status: 200,
      async json() {
        return response([feature('addresses')])
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
          return response([feature('interpolated-road-addresses')])
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
        return response([feature('addresses'), feature('addresses', [21.62, 63.1])])
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

  it('fails closed for multiple candidates, outside points, and unknown source datasets', () => {
    expect(
      selectNlsResult(
        response([feature('geographic-names'), feature('geographic-names')]),
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
