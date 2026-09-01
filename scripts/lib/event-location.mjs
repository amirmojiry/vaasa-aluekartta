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

const ONLINE_LOCATION_VALUES = new Set([
  'online',
  'online event',
  'online evenemang',
  'online tapahtuma',
  'verkkotapahtuma',
  'digital event',
])

const GENERIC_LOCATION_VALUES = new Set([
  'finland',
  'suomi',
  'vaasa',
  'vasa',
  'enter address',
  'address',
  'osoite',
  'adress',
  'location',
  'venue',
  'verkossa',
  'pa natet',
  ...ONLINE_LOCATION_VALUES,
])
const ADDRESS_PATTERN = /\b\d{1,5}[a-z]?\b/i
const HOUSE_NUMBER_PATTERN = /\b\d{1,4}[a-z]?(?:\s*-\s*\d{1,4}[a-z]?)?\b/i
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

export function canonicalStreetAddressKey(value) {
  if (typeof value !== 'string') return undefined

  const segments = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  for (const segment of segments) {
    if (
      POSTAL_CODE_PATTERN.test(segment) &&
      !HOUSE_NUMBER_PATTERN.test(segment.replace(POSTAL_CODE_PATTERN, ''))
    ) {
      continue
    }

    const match = segment.match(HOUSE_NUMBER_PATTERN)
    if (!match || match.index === undefined) continue

    const throughHouseNumber = segment.slice(0, match.index + match[0].length)
    const normalized = normalizeLocationText(throughHouseNumber)
    if (normalized && /\p{L}/u.test(normalized)) return normalized
  }

  return undefined
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

export function isOnlineLocationText(value) {
  return ONLINE_LOCATION_VALUES.has(normalizeLocationText(value))
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
  const streetAddresses = new Map()

  for (const feature of poiCollection.features) {
    if (feature?.geometry?.type !== 'Point') continue
    const [longitude, latitude] = feature.geometry.coordinates ?? []
    if (!pointWithinVaasaBounds(longitude, latitude)) continue

    const properties = feature.properties ?? {}
    const nameValues = [properties.name, ...Object.values(properties.names ?? {})]
    for (const name of nameValues) addCandidate(names, normalizeLocationText(name), feature)

    addCandidate(addresses, normalizeLocationText(properties.address), feature)
    addCandidate(streetAddresses, canonicalStreetAddressKey(properties.address), feature)
  }

  return { names, addresses, streetAddresses }
}

function osmProvenance(matchKind, feature) {
  let transformation
  if (matchKind === 'address-exact') {
    transformation =
      'Exact normalized full-address match against the committed OSM POI snapshot; source point geometry retained in WGS84.'
  } else if (matchKind === 'address-street-house') {
    transformation =
      'Exact normalized street-and-house-number match after removing postal/locality/country suffixes from both source strings; source point geometry retained in WGS84.'
  } else {
    transformation =
      'Exact normalized venue-name match against the committed OSM POI snapshot; source point geometry retained in WGS84.'
  }

  return {
    provider: 'OpenStreetMap contributors',
    dataset: 'public/data/vaasa-pois.geojson',
    sourceUrl: `https://www.openstreetmap.org/${feature.properties.osmType}/${feature.properties.osmId}`,
    licence: 'ODbL 1.0',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    transformation,
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
      precision: matchKind.startsWith('address') ? 'exact-address' : 'known-venue',
      longitude,
      latitude,
      label: feature.properties.name,
      sourceAddress: query,
      provenance: osmProvenance(matchKind, feature),
    },
  }
}

function resolvedPoint(result) {
  return result && result.resolution.precision !== 'unresolved'
}

function aliasKey(value) {
  const normalized = normalizeLocationText(value)
  return VENUE_ALIASES.get(normalized) ?? normalized
}

export function chooseEventGeocodingQuery(event) {
  if (event.addressText && !isGenericLocationText(event.addressText)) {
    return event.addressText.trim()
  }
  if (event.venue && !isGenericLocationText(event.venue)) return event.venue.trim()
  return undefined
}

export function resolveEventLocally(event, poiIndex) {
  if (event.online === true && isOnlineLocationText(event.venue)) {
    return { resolution: { precision: 'online' } }
  }

  let ambiguousAddress
  if (event.addressText && !isGenericLocationText(event.addressText)) {
    const addressQuery = event.addressText.trim()
    const exactAddressMatch = resolveCandidateSet(
      poiIndex.addresses.get(normalizeLocationText(addressQuery)),
      addressQuery,
      'address-exact',
    )
    if (resolvedPoint(exactAddressMatch)) return exactAddressMatch
    ambiguousAddress = exactAddressMatch

    const streetAddressKey = canonicalStreetAddressKey(addressQuery)
    if (streetAddressKey) {
      const streetAddressMatch = resolveCandidateSet(
        poiIndex.streetAddresses.get(streetAddressKey),
        addressQuery,
        'address-street-house',
      )
      if (resolvedPoint(streetAddressMatch)) return streetAddressMatch
      ambiguousAddress ??= streetAddressMatch
    }
  }

  let ambiguousVenue
  if (event.venue && !isGenericLocationText(event.venue) && !isOnlineLocationText(event.venue)) {
    const venueQuery = event.venue.trim()
    const venueMatch = resolveCandidateSet(
      poiIndex.names.get(aliasKey(venueQuery)),
      venueQuery,
      'name',
    )
    if (resolvedPoint(venueMatch)) return venueMatch
    ambiguousVenue = venueMatch
  }

  if (ambiguousVenue) return ambiguousVenue
  if (ambiguousAddress) return ambiguousAddress

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
