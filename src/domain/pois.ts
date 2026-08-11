export const POI_CATEGORIES = [
  'attractions',
  'supermarkets',
  'police',
  'healthcare',
  'libraries',
] as const

export type PoiCategory = (typeof POI_CATEGORIES)[number]

export interface PoiFeatureProperties {
  id: string
  category: PoiCategory
  name: string
  names?: {
    fi?: string
    sv?: string
    en?: string
  }
  osmType: 'node' | 'way' | 'relation'
  osmId: number
  website?: string
  openingHours?: string
  operator?: string
  address?: string
}

export interface PoiFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: PoiFeatureProperties
}

export interface PoiFeatureCollection {
  type: 'FeatureCollection'
  generatedAt?: string
  source?: {
    label: string
    url: string
    licence: string
  }
  features: PoiFeature[]
}
