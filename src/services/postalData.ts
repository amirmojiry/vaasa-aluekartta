import type {
  PostalCodeArea,
  PostalCodeCollection,
  PostalGeometry,
  PostalMetric,
} from '@/domain/postal'

const POSTAL_WFS_URL = 'https://geo.stat.fi/geoserver/postialue/ows'
const VAASA_MUNICIPALITY_CODE = '905'
const PAAVO_STATISTICS_YEAR = 2024

interface PostalFeatureProperties {
  postinumeroalue?: string
  nimi?: string
  namn?: string
  kunta?: string | number
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
  const municipalityCode =
    feature.properties.kunta === null || feature.properties.kunta === undefined
      ? null
      : String(feature.properties.kunta).padStart(3, '0')

  return {
    code,
    nameFi: String(feature.properties.nimi ?? code),
    nameSv: String(feature.properties.namn ?? feature.properties.nimi ?? code),
    municipalityCode,
    releaseYear: numberOrNull(feature.properties.vuosi),
    statisticsYear: PAAVO_STATISTICS_YEAR,
    population: propertyNumber(feature.properties, ['he_vakiy', 'vaesto', 'population']),
    employed: propertyNumber(feature.properties, ['pt_tyoll', 'tyoll']),
    unemployed: propertyNumber(feature.properties, ['pt_tyott', 'tyot']),
    students: propertyNumber(feature.properties, ['pt_opisk', 'opisk']),
    averageIncome: propertyNumber(feature.properties, ['hr_tuy', 'hr_tulot', 'tulot']),
    geometry: feature.geometry,
  }
}

function vaasaRequestUrl(): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'postialue:pno_tilasto',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    cql_filter: `kunta='${VAASA_MUNICIPALITY_CODE}'`,
  })
  return `${POSTAL_WFS_URL}?${params.toString()}`
}

async function loadPostalCollection(): Promise<PostalCodeCollection> {
  const sourceUrl = vaasaRequestUrl()
  const response = await fetch(sourceUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Paavo postal data returned HTTP ${response.status}`)
  const payload = (await response.json()) as PostalFeatureCollection
  if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    throw new Error('Paavo postal response is not a GeoJSON FeatureCollection')
  }

  const areas = payload.features
    .map(featureToArea)
    .filter((area): area is PostalCodeArea => area !== null)
    .filter((area) => !area.municipalityCode || area.municipalityCode === VAASA_MUNICIPALITY_CODE)
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
