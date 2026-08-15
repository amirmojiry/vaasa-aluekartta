import { AREAS } from '@/config/areas'
import type { AreaBoundary } from '@/domain/areas'
import type {
  PostalCodeArea,
  PostalCodeCollection,
  PostalGeometry,
  PostalMetric,
} from '@/domain/postal'
import { fetchAreaRecords } from '@/services/boundaryData'
import { postalIntersectsBoundary } from '@/services/postalGeometry'

const POSTAL_WFS_URL = 'https://geo.stat.fi/geoserver/postialue/ows'
const PAAVO_RELEASE_YEAR = 2026
const PAAVO_STATISTICS_YEAR = 2024

interface PostalFeatureProperties {
  postinumeroalue?: string
  nimi?: string
  namn?: string
  vuosi?: string | number
  he_vakiy?: string | number
  pt_tyoll?: string | number
  pt_tyott?: string | number
  pt_opisk?: string | number
  hr_tuy?: string | number
  [key: string]: unknown
}

interface PostalFeature {
  type: 'Feature'
  properties: PostalFeatureProperties
  geometry: PostalGeometry
}

interface PostalFeatureCollection {
  type: 'FeatureCollection'
  features: PostalFeature[]
}

interface GeographicBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

let postalPromise: Promise<PostalCodeCollection> | null = null

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '..' || value === '...' || value === '') {
    return null
  }
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function postalCode(properties: PostalFeatureProperties): string | null {
  const candidates = [
    properties.postinumeroalue,
    properties.postinumero,
    properties.pno,
    properties.posti_alue,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && /^\d{5}$/.test(value)) return value
  }
  return null
}

function propertyNumber(properties: PostalFeatureProperties, keys: string[]): number | null {
  for (const key of keys) {
    const value = numberOrNull(properties[key])
    if (value !== null) return value
  }
  return null
}

function featureToArea(feature: PostalFeature): PostalCodeArea | null {
  const code = postalCode(feature.properties)
  if (!code || !feature.geometry) return null

  return {
    code,
    nameFi: String(feature.properties.nimi ?? code),
    nameSv: String(feature.properties.namn ?? feature.properties.nimi ?? code),
    municipalityCode: null,
    releaseYear: numberOrNull(feature.properties.vuosi) ?? PAAVO_RELEASE_YEAR,
    statisticsYear: PAAVO_STATISTICS_YEAR,
    population: propertyNumber(feature.properties, ['he_vakiy', 'vaesto', 'population']),
    employed: propertyNumber(feature.properties, ['pt_tyoll', 'tyoll']),
    unemployed: propertyNumber(feature.properties, ['pt_tyott', 'tyot']),
    students: propertyNumber(feature.properties, ['pt_opisk', 'opisk']),
    averageIncome: propertyNumber(feature.properties, ['hr_tuy', 'hr_tulot', 'tulot']),
    geometry: feature.geometry,
  }
}

function boundsForAreas(areas: AreaBoundary[]): GeographicBounds {
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY

  for (const area of areas) {
    for (const ring of area.rings) {
      for (const [lat, lon] of ring) {
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLon = Math.min(minLon, lon)
        maxLon = Math.max(maxLon, lon)
      }
    }
  }

  if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) {
    throw new Error('Could not derive a Vaasa bounding box for the Paavo request')
  }

  return { minLat, maxLat, minLon, maxLon }
}

export function postalWfsUrlForBounds(bounds: GeographicBounds): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: `postialue:pno_tilasto_${PAAVO_RELEASE_YEAR}`,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox: `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat},EPSG:4326`,
  })
  return `${POSTAL_WFS_URL}?${params.toString()}`
}

async function loadPostalCollection(): Promise<PostalCodeCollection> {
  const majorAreaMap = await fetchAreaRecords(AREAS)
  const majorAreas = [...majorAreaMap.values()]
  const sourceUrl = postalWfsUrlForBounds(boundsForAreas(majorAreas))
  const response = await fetch(sourceUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Paavo postal data returned HTTP ${response.status}`)
  const payload = (await response.json()) as PostalFeatureCollection
  if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    throw new Error('Paavo postal response is not a GeoJSON FeatureCollection')
  }

  const areas = payload.features
    .map(featureToArea)
    .filter((area): area is PostalCodeArea => area !== null)
    .filter((area) => majorAreas.some((boundary) => postalIntersectsBoundary(area, boundary)))
    .sort((left, right) => left.code.localeCompare(right.code))

  return { areas, sourceUrl, statisticsYear: PAAVO_STATISTICS_YEAR }
}

export function fetchPostalCodeCollection(): Promise<PostalCodeCollection> {
  postalPromise ??= loadPostalCollection()
  return postalPromise
}

export async function fetchPostalCodeArea(code: string): Promise<PostalCodeArea> {
  const collection = await fetchPostalCodeCollection()
  const area = collection.areas.find((item) => item.code === code)
  if (!area) throw new Error(`Postal code ${code} is not available in the Paavo Vaasa dataset`)
  return area
}

export function postalMetricValue(area: PostalCodeArea, metric: PostalMetric): number | null {
  switch (metric) {
    case 'population':
      return area.population
    case 'employed':
      return area.employed
    case 'unemployed':
      return area.unemployed
    case 'students':
      return area.students
    case 'income':
      return area.averageIncome
  }
}
