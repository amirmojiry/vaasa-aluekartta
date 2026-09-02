import { isAddressLike, pointWithinVaasaBounds } from './event-location.mjs'

export const NLS_GEOCODING_ENDPOINT =
  'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v2/pelias/search'

const NLS_LICENCE_URL = 'https://www.maanmittauslaitos.fi/en/open-data-licence-version1'
const NLS_DOC_URL =
  'https://www.maanmittauslaitos.fi/en/maps-and-spatial-data/expert-users/kartta-ja-paikkatietojen-rajapintapalvelut/geokoodauspalvelu'
const SYKE_RYHTI_URL = 'https://ryhti.syke.fi/'
const POSTAL_CODE_PATTERN = /\b\d{5}\b/

export function nlsSourcesForQuery(query) {
  return isAddressLike(query) ? ['addresses'] : ['geographic-names']
}

function queryWithMunicipalityContext(query) {
  const trimmed = query.trim()
  if (/\b(?:vaasa|vasa)\b/i.test(trimmed) || POSTAL_CODE_PATTERN.test(trimmed)) return trimmed
  return `${trimmed} Vaasa`
}

export function buildNlsSearchUrl(query, sources = nlsSourcesForQuery(query)) {
  const url = new URL(NLS_GEOCODING_ENDPOINT)
  url.searchParams.set('text', queryWithMunicipalityContext(query))
  url.searchParams.set('sources', sources.join(','))
  url.searchParams.set('lang', 'fi')
  url.searchParams.set('size', '5')
  const options = ['nowildcard', 'use_any_codelist_lang_match']
  if (POSTAL_CODE_PATTERN.test(query) && sources.includes('addresses')) {
    options.push('use_postal_code')
  }
  url.searchParams.set('options', options.join(','))
  return url
}

export function provenanceForNlsSource(source) {
  if (source === 'addresses') {
    return {
      provider: 'Finnish Environment Institute (Syke) / Ryhti via NLS Geocoding Service',
      dataset: 'addresses',
      sourceUrl: SYKE_RYHTI_URL,
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      transformation:
        'NLS Geocoding Service v2 response in default CRS84; coordinates preserved in [longitude, latitude] order.',
    }
  }
  if (source === 'interpolated-road-addresses' || source === 'geographic-names') {
    return {
      provider: 'National Land Survey of Finland',
      dataset: source,
      sourceUrl: NLS_DOC_URL,
      licence: 'CC BY 4.0',
      licenceUrl: NLS_LICENCE_URL,
      transformation:
        'NLS Geocoding Service v2 response in default CRS84; coordinates preserved in [longitude, latitude] order.',
    }
  }
  return undefined
}

function normalizedFeature(feature) {
  if (feature?.geometry?.type !== 'Point') return undefined
  const [longitude, latitude] = feature.geometry.coordinates ?? []
  if (!pointWithinVaasaBounds(longitude, latitude)) return undefined

  const source = feature.properties?.source ?? feature.properties?.layer
  const provenance = provenanceForNlsSource(source)
  if (!provenance) return { unsupportedSource: source ?? 'missing' }

  return {
    longitude,
    latitude,
    label: feature.properties?.label ?? feature.properties?.name ?? undefined,
    source,
    provenance,
  }
}

export function selectNlsResult(featureCollection, query, retrievedAt) {
  if (
    featureCollection?.type !== 'FeatureCollection' ||
    !Array.isArray(featureCollection.features)
  ) {
    throw new Error('NLS geocoder response must be a GeoJSON FeatureCollection')
  }

  const normalized = featureCollection.features.map(normalizedFeature).filter(Boolean)
  const unsupported = normalized.find((candidate) => candidate.unsupportedSource)
  if (unsupported) {
    return {
      query,
      resolution: {
        precision: 'unresolved',
        reason: 'unsupported-geocoder-source',
        sourceAddress: query,
      },
    }
  }

  const candidates = normalized.filter((candidate) => !candidate.unsupportedSource)
  if (candidates.length === 0) {
    const hasPointOutsideBounds = featureCollection.features.some(
      (feature) => feature?.geometry?.type === 'Point',
    )
    return {
      query,
      resolution: {
        precision: 'unresolved',
        reason: hasPointOutsideBounds ? 'outside-vaasa-bounds' : 'no-geocoder-result',
        sourceAddress: query,
      },
    }
  }
  if (candidates.length > 1) {
    return {
      query,
      resolution: {
        precision: 'unresolved',
        reason: 'ambiguous-geocoder-match',
        sourceAddress: query,
      },
    }
  }

  const [candidate] = candidates
  const precision = isAddressLike(query) ? 'exact-address' : 'known-venue'
  return {
    query,
    resolution: {
      precision,
      longitude: candidate.longitude,
      latitude: candidate.latitude,
      ...(candidate.label ? { label: candidate.label } : {}),
      geocoder: 'nls-geocoding-v2',
      geocodedAt: retrievedAt,
      sourceAddress: query,
      provenance: {
        ...candidate.provenance,
        retrievedAt,
      },
    },
    cacheEntry: {
      rawQuery: query,
      retrievedAt,
      precision,
      longitude: candidate.longitude,
      latitude: candidate.latitude,
      ...(candidate.label ? { label: candidate.label } : {}),
      sourceDataset: candidate.source,
      provenance: {
        ...candidate.provenance,
        retrievedAt,
      },
    },
  }
}

async function fetchNlsFeatureCollection(query, sources, { apiKey, fetchImpl }) {
  const response = await fetchImpl(buildNlsSearchUrl(query, sources), {
    headers: {
      Accept: 'application/geo+json, application/json',
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`NLS geocoding request failed with HTTP ${response.status}`)
  return response.json()
}

export async function geocodeWithNls(query, { apiKey, fetchImpl = fetch, now = () => new Date() }) {
  if (!apiKey) {
    return {
      query,
      resolution: {
        precision: 'unresolved',
        reason: 'remote-key-missing',
        sourceAddress: query,
      },
    }
  }

  const retrievedAt = now().toISOString()
  const primarySources = nlsSourcesForQuery(query)
  const primary = selectNlsResult(
    await fetchNlsFeatureCollection(query, primarySources, { apiKey, fetchImpl }),
    query,
    retrievedAt,
  )

  if (!isAddressLike(query) || primary.resolution.reason !== 'no-geocoder-result') return primary

  return selectNlsResult(
    await fetchNlsFeatureCollection(query, ['interpolated-road-addresses'], {
      apiKey,
      fetchImpl,
    }),
    query,
    retrievedAt,
  )
}
