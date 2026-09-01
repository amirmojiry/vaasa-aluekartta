export const VAASA_MUNICIPALITY_BOUNDS = Object.freeze({
  provider: 'OpenStreetMap',
  relationId: 1855926,
  wikidata: 'Q125080',
  adminLevel: '8',
  sourceUrl: 'https://www.openstreetmap.org/relation/1855926',
  licence: 'ODbL 1.0',
  minLatitude: 62.9594378,
  minLongitude: 21.0276273,
  maxLatitude: 63.178854,
  maxLongitude: 22.2423226,
})

const GENERIC_LOCATION_VALUES = new Set(['finland', 'suomi', 'vaasa', 'vasa'])
const ADDRESS_PATTERN = /\b\d{1,5}[a-z]?\b/i
const POSTAL_CODE_PATTERN = /\b\d{5}\b/

const VENUE_ALIASES = new Map([
  ['vaasan sahko arena', 'vaasan sahko areena'],
  ['vasa elektriska arena', 'vaasan sahko areena'],
])

export function normalizeLocationText(value) {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fi-FI')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function pointWithinVaasaBounds(longitude, latitude) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= VAASA_MUNICIPALITY_BOUNDS.minLongitude &&
    longitude <= VAASA_MUNICIPALITY_BOUNDS.maxLongitude &&
    latitude >= VAASA_MUNICIPALITY_BOUNDS.minLatitude &&
    latitude <= VAASA_MUNICIPALITY_BOUNDS.maxLatitude
  )
}

export function isGenericLocationText(value) {
  const normalized = normalizeLocationText(value)
  return !normalized || GENERIC_LOCATION_VALUES.has(normalized)
}

export function isAddressLike(value) {
  if (typeof value !== 'string') return false
  return ADDRESS_PATTERN.test(value) || POSTAL_CODE_PATTERN.test(value)
}

export function looksMultiLocation(value) {
  if (typeof value !== 'string') return false
  if (value.includes(';')) return true
  if (isAddressLike(value)) return false
  return (
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean).length >= 4
  )
}

function candidateId(feature) {
  return feature?.properties?.id ?? `${feature?.properties?.osmType}/${feature?.properties?.osmId}`
}

function addCandidate(index, key, feature) {
  if (!key) return
  const candidates = index.get(key) ?? new Map()
  candidates.set(candidateId(feature), feature)
  index.set(key, candidates)
}

export function buildPoiLocationIndex(poiCollection) {
  if (poiCollection?.type !== 'FeatureCollection' || !Array.isArray(poiCollection.features)) {
    throw new Error('POI source must be a GeoJSON FeatureCollection')
  }

  const names = new Map()
  const addresses = new Map()

  for (const feature of poiCollection.features) {
    if (feature?.geometry?.type !== 'Point') continue
    const [longitude, latitude] = feature.geometry.coordinates ?? []
    if (!pointWithinVaasaBounds(longitude, latitude)) continue

    const properties = feature.properties ?? {}
    const nameValues = [properties.name, ...Object.values(properties.names ?? {})]
    for (const name of nameValues) addCandidate(names, normalizeLocationText(name), feature)
    addCandidate(addresses, normalizeLocationText(properties.address), feature)
  }

  return { names, addresses }
}

function osmProvenance(matchKind, feature) {
  return {
    provider: 'OpenStreetMap contributors',
    dataset: 'public/data/vaasa-pois.geojson',
    sourceUrl: `https://www.openstreetmap.org/${feature.properties.osmType}/${feature.properties.osmId}`,
    licence: 'ODbL 1.0',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    transformation:
      matchKind === 'address'
        ? 'Exact normalized address match against the committed OSM POI snapshot; source point geometry retained in WGS84.'
        : 'Exact normalized venue-name match against the committed OSM POI snapshot; source point geometry retained in WGS84.',
  }
}

function resolveCandidateSet(candidates, query, matchKind) {
  if (!candidates || candidates.size === 0) return undefined
  if (candidates.size > 1) {
    return {
      query,
      resolution: {
        precision: 'unresolved',
        reason: 'ambiguous-local-match',
        sourceAddress: query,
      },
    }
  }

  const [feature] = candidates.values()
  const [longitude, latitude] = feature.geometry.coordinates
  if (!pointWithinVaasaBounds(longitude, latitude)) {
    return {
      query,
      resolution: {
        precision: 'unresolved',
        reason: 'outside-vaasa-bounds',
        sourceAddress: query,
      },
    }
  }

  return {
    query,
    resolution: {
      precision: matchKind === 'address' ? 'exact-address' : 'known-venue',
      longitude,
      latitude,
      label: feature.properties.name,
      sourceAddress: query,
      provenance: osmProvenance(matchKind, feature),
    },
  }
}

function aliasKey(value) {
  const normalized = normalizeLocationText(value)
  return VENUE_ALIASES.get(normalized) ?? normalized
}

export function chooseEventGeocodingQuery(event) {
  if (event.addressText && !isGenericLocationText(event.addressText))
    return event.addressText.trim()
  if (event.venue && !isGenericLocationText(event.venue)) return event.venue.trim()
  return undefined
}

export function resolveEventLocally(event, poiIndex) {
  if (event.addressText && !isGenericLocationText(event.addressText)) {
    const addressQuery = event.addressText.trim()
    const addressMatch = resolveCandidateSet(
      poiIndex.addresses.get(normalizeLocationText(addressQuery)),
      addressQuery,
      'address',
    )
    if (addressMatch) return addressMatch
  }

  if (event.venue && !isGenericLocationText(event.venue)) {
    const venueQuery = event.venue.trim()
    const venueMatch = resolveCandidateSet(
      poiIndex.names.get(aliasKey(venueQuery)),
      venueQuery,
      'name',
    )
    if (venueMatch) return venueMatch
  }

  const query = chooseEventGeocodingQuery(event)
  if (event.online === true && !query) {
    return { resolution: { precision: 'online' } }
  }
  if (looksMultiLocation(event.venue)) {
    return {
      ...(event.venue ? { query: event.venue.trim() } : {}),
      resolution: { precision: 'multi-location' },
    }
  }
  if (!query) {
    return { resolution: { precision: 'unresolved', reason: 'no-usable-query' } }
  }

  return undefined
}

export function isHighConfidenceResolution(resolution) {
  return (
    ['exact-address', 'known-venue'].includes(resolution?.precision) ||
    resolution?.geocoder === 'nls-geocoding-v2'
  )
}
