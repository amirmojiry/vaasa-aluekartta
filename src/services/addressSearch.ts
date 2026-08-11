import type { PienalueBoundary } from '@/domain/areas'
import type { GeocodedAddress, LocatedAddress } from '@/domain/addressSearch'
import type { AppLanguage } from '@/i18n'

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const requestCache = new Map<string, GeocodedAddress[]>()
let lastRequestStartedAt = 0

interface NominatimSearchResult {
  display_name?: string
  lat?: string
  lon?: string
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

async function respectRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestStartedAt
  if (elapsed < 1000) await delay(1000 - elapsed)
  lastRequestStartedAt = Date.now()
}

export function pointInPienalue(lat: number, lon: number, area: PienalueBoundary): boolean {
  return area.rings.some((ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [latI, lonI] = ring[i]!
      const [latJ, lonJ] = ring[j]!
      const intersects =
        lonI > lon !== lonJ > lon &&
        lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI || Number.EPSILON) + latI
      if (intersects) inside = !inside
    }
    return inside
  })
}

export function findPienalueForPoint(
  lat: number,
  lon: number,
  boundaries: PienalueBoundary[],
): PienalueBoundary | null {
  return boundaries.find((area) => pointInPienalue(lat, lon, area)) ?? null
}

function vaasaViewbox(boundaries: PienalueBoundary[]): string | null {
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY

  for (const area of boundaries) {
    for (const ring of area.rings) {
      for (const [lat, lon] of ring) {
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLon = Math.min(minLon, lon)
        maxLon = Math.max(maxLon, lon)
      }
    }
  }

  if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) return null
  return `${minLon},${minLat},${maxLon},${maxLat}`
}

export async function searchAddressCandidates(
  query: string,
  language: AppLanguage,
  boundaries: PienalueBoundary[],
): Promise<GeocodedAddress[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []

  const cacheKey = `${language}:${normalizedQuery.toLocaleLowerCase()}`
  const cached = requestCache.get(cacheKey)
  if (cached) return cached

  const params = new URLSearchParams({
    q: normalizedQuery,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
    countrycodes: 'fi',
    'accept-language': language,
  })
  const viewbox = vaasaViewbox(boundaries)
  if (viewbox) params.set('viewbox', viewbox)

  await respectRateLimit()
  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Address search failed with ${response.status}`)

  const payload = (await response.json()) as NominatimSearchResult[]
  const results = payload.flatMap<GeocodedAddress>((item) => {
    const lat = Number(item.lat)
    const lon = Number(item.lon)
    if (!item.display_name || !Number.isFinite(lat) || !Number.isFinite(lon)) return []
    return [{ query: normalizedQuery, displayName: item.display_name, lat, lon }]
  })
  requestCache.set(cacheKey, results)
  return results
}

export function locateBestAddressCandidate(
  candidates: GeocodedAddress[],
  boundaries: PienalueBoundary[],
): LocatedAddress | null {
  for (const candidate of candidates) {
    const area = findPienalueForPoint(candidate.lat, candidate.lon, boundaries)
    if (area) return { ...candidate, area }
  }
  return candidates[0] ? { ...candidates[0], area: null } : null
}

export async function searchAndLocateAddress(
  query: string,
  language: AppLanguage,
  boundaries: PienalueBoundary[],
): Promise<LocatedAddress | null> {
  const candidates = await searchAddressCandidates(query, language, boundaries)
  return locateBestAddressCandidate(candidates, boundaries)
}
