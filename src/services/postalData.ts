import type {
  PostalCodeArea,
  PostalCodeCollection,
  PostalGeometry,
  PostalHistoryDatabase,
  PostalHistoryObservation,
  PostalMetric,
} from '@/domain/postal'

const POSTAL_DATA_URL = `${import.meta.env.BASE_URL}data/paavo-postal-areas.geojson`
const POSTAL_HISTORY_URL = `${import.meta.env.BASE_URL}data/paavo-postal-history.json`

interface PostalSnapshotProperties {
  code: string
  name_fi: string
  name_sv: string
  statistics_year: number
  population: number | null
  employed: number | null
  unemployed: number | null
  students: number | null
  average_income: number | null
  employed_share: number | null
  unemployed_share: number | null
  student_share: number | null
}

interface PostalSnapshotFeature {
  type: 'Feature'
  id?: string
  properties: PostalSnapshotProperties
  geometry: PostalGeometry
}

interface PostalSnapshotCollection {
  type: 'FeatureCollection'
  metadata: {
    source_url: string
    release_year: number
    statistics_year: number
  }
  features: PostalSnapshotFeature[]
}

interface RawHistoryObservation {
  year: number
  population: number | null
  employed: number | null
  unemployed: number | null
  students: number | null
  average_income: number | null
  employed_share: number | null
  unemployed_share: number | null
  student_share: number | null
}

interface RawHistoryDatabase {
  generated_at: string
  source: string
  source_url: string
  licence: string
  latest_release_year: number
  latest_statistics_year: number
  years: number[]
  areas: Record<string, RawHistoryObservation[]>
}

let postalPromise: Promise<PostalCodeCollection> | null = null
let historyPromise: Promise<PostalHistoryDatabase> | null = null

function featureToArea(feature: PostalSnapshotFeature, releaseYear: number): PostalCodeArea {
  return {
    code: feature.properties.code,
    nameFi: feature.properties.name_fi,
    nameSv: feature.properties.name_sv,
    releaseYear,
    statisticsYear: feature.properties.statistics_year,
    population: feature.properties.population,
    employed: feature.properties.employed,
    unemployed: feature.properties.unemployed,
    students: feature.properties.students,
    averageIncome: feature.properties.average_income,
    employedShare: feature.properties.employed_share,
    unemployedShare: feature.properties.unemployed_share,
    studentShare: feature.properties.student_share,
    geometry: feature.geometry,
  }
}

function historyObservation(raw: RawHistoryObservation): PostalHistoryObservation {
  return {
    year: raw.year,
    population: raw.population,
    employed: raw.employed,
    unemployed: raw.unemployed,
    students: raw.students,
    averageIncome: raw.average_income,
    employedShare: raw.employed_share,
    unemployedShare: raw.unemployed_share,
    studentShare: raw.student_share,
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Local Paavo snapshot returned HTTP ${response.status}`)
  return (await response.json()) as T
}

async function loadPostalCollection(): Promise<PostalCodeCollection> {
  const payload = await fetchJson<PostalSnapshotCollection>(POSTAL_DATA_URL)
  if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    throw new Error('Local Paavo snapshot is not a GeoJSON FeatureCollection')
  }
  const releaseYear = Number(payload.metadata?.release_year)
  const statisticsYear = Number(payload.metadata?.statistics_year)
  if (!Number.isFinite(releaseYear) || !Number.isFinite(statisticsYear)) {
    throw new Error('Local Paavo snapshot metadata is invalid')
  }
  const areas = payload.features
    .map((feature) => featureToArea(feature, releaseYear))
    .sort((left, right) => left.code.localeCompare(right.code))
  return {
    areas,
    sourceUrl: payload.metadata.source_url,
    statisticsYear,
    releaseYear,
  }
}

async function loadHistoryDatabase(): Promise<PostalHistoryDatabase> {
  const raw = await fetchJson<RawHistoryDatabase>(POSTAL_HISTORY_URL)
  return {
    generatedAt: raw.generated_at,
    source: raw.source,
    sourceUrl: raw.source_url,
    licence: raw.licence,
    latestReleaseYear: raw.latest_release_year,
    latestStatisticsYear: raw.latest_statistics_year,
    years: raw.years,
    areas: Object.fromEntries(
      Object.entries(raw.areas).map(([code, observations]) => [
        code,
        observations.map(historyObservation).sort((left, right) => left.year - right.year),
      ]),
    ),
  }
}

export function fetchPostalCodeCollection(): Promise<PostalCodeCollection> {
  postalPromise ??= loadPostalCollection()
  return postalPromise
}

export function fetchPostalHistoryDatabase(): Promise<PostalHistoryDatabase> {
  historyPromise ??= loadHistoryDatabase()
  return historyPromise
}

export async function fetchPostalCodeArea(code: string): Promise<PostalCodeArea> {
  const collection = await fetchPostalCodeCollection()
  const area = collection.areas.find((item) => item.code === code)
  if (!area) throw new Error(`Postal code ${code} is not available in the Paavo Vaasa snapshot`)
  return area
}

export async function fetchPostalCodeHistory(code: string): Promise<PostalHistoryObservation[]> {
  const database = await fetchPostalHistoryDatabase()
  return database.areas[code] ?? []
}

export function postalMetricValue(area: PostalCodeArea, metric: PostalMetric): number | null {
  switch (metric) {
    case 'population':
      return area.population
    case 'employed':
      return area.employedShare
    case 'unemployed':
      return area.unemployedShare
    case 'students':
      return area.studentShare
    case 'income':
      return area.averageIncome
  }
}

export function postalHistoryMetricValue(
  observation: PostalHistoryObservation,
  metric: PostalMetric,
): number | null {
  switch (metric) {
    case 'population':
      return observation.population
    case 'employed':
      return observation.employedShare
    case 'unemployed':
      return observation.unemployedShare
    case 'students':
      return observation.studentShare
    case 'income':
      return observation.averageIncome
  }
}

export function postalMetricRank(
  collection: PostalCodeCollection,
  area: PostalCodeArea,
  metric: PostalMetric,
): { rank: number; total: number; value: number } | null {
  const value = postalMetricValue(area, metric)
  if (value === null) return null
  const values = collection.areas
    .map((candidate) => postalMetricValue(candidate, metric))
    .filter((candidate): candidate is number => candidate !== null)
  return {
    rank: values.filter((candidate) => candidate > value).length + 1,
    total: values.length,
    value,
  }
}
