import { POI_CATEGORIES, type PoiFeature, type PoiFeatureCollection } from '@/domain/pois'
import type { AppLanguage } from '@/i18n'

const POI_DATA_URL = `${import.meta.env.BASE_URL}data/vaasa-pois.geojson`
let databasePromise: Promise<PoiFeatureCollection> | null = null

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPoiFeature(value: unknown): value is PoiFeature {
  if (!value || typeof value !== 'object') return false
  const feature = value as Partial<PoiFeature>
  if (feature.type !== 'Feature' || feature.geometry?.type !== 'Point') return false
  if (!Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length !== 2) {
    return false
  }
  const [longitude, latitude] = feature.geometry.coordinates
  if (!isFiniteCoordinate(longitude) || !isFiniteCoordinate(latitude)) return false
  if (!feature.properties || typeof feature.properties !== 'object') return false
  if (typeof feature.properties.id !== 'string' || typeof feature.properties.name !== 'string') {
    return false
  }
  return POI_CATEGORIES.includes(feature.properties.category)
}

export function parsePoiFeatureCollection(value: unknown): PoiFeatureCollection {
  if (!value || typeof value !== 'object') throw new Error('POI data is not an object')
  const collection = value as Partial<PoiFeatureCollection>
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error('POI data is not a GeoJSON FeatureCollection')
  }
  if (!collection.features.every(isPoiFeature))
    throw new Error('POI data contains invalid features')
  return collection as PoiFeatureCollection
}

export async function fetchPoiFeatureCollection(): Promise<PoiFeatureCollection> {
  databasePromise ??= fetch(POI_DATA_URL, { cache: 'no-cache' }).then(async (response) => {
    if (!response.ok) throw new Error(`POI data returned HTTP ${response.status}`)
    return parsePoiFeatureCollection(await response.json())
  })
  return databasePromise
}

export function localizedPoiName(feature: PoiFeature, language: AppLanguage): string {
  const names = feature.properties.names
  if (language === 'fi') return names?.fi || feature.properties.name
  if (language === 'en') return names?.en || names?.fi || feature.properties.name
  return names?.fi || names?.en || feature.properties.name
}
