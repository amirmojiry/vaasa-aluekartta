import { describe, expect, it } from 'vitest'

import { POI_CATEGORIES, type PoiFeature } from '@/domain/pois'
import { localizedPoiName, parsePoiFeatureCollection } from '@/services/poiData'

const feature: PoiFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [21.6158, 63.0951] },
  properties: {
    id: 'node/1',
    category: 'attractions',
    name: 'Vaasan museo',
    names: { fi: 'Vaasan museo', en: 'Vaasa Museum' },
    osmType: 'node',
    osmId: 1,
  },
}

describe('POI categories', () => {
  it('includes education and public transport categories', () => {
    expect(POI_CATEGORIES).toEqual([
      'attractions',
      'supermarkets',
      'police',
      'healthcare',
      'libraries',
      'universities',
      'schools',
      'daycare',
      'train-stations',
      'airports',
      'bus-stops',
    ])
  })
})

describe('parsePoiFeatureCollection', () => {
  it('accepts a valid POI feature collection', () => {
    const collection = parsePoiFeatureCollection({
      type: 'FeatureCollection',
      features: [feature],
    })

    expect(collection.features).toHaveLength(1)
    expect(collection.features[0]?.properties.category).toBe('attractions')
  })

  it('accepts a newly supported category', () => {
    const collection = parsePoiFeatureCollection({
      type: 'FeatureCollection',
      features: [
        {
          ...feature,
          properties: { ...feature.properties, category: 'schools' },
        },
      ],
    })

    expect(collection.features[0]?.properties.category).toBe('schools')
  })

  it('rejects unknown categories', () => {
    expect(() =>
      parsePoiFeatureCollection({
        type: 'FeatureCollection',
        features: [
          {
            ...feature,
            properties: { ...feature.properties, category: 'unknown' },
          },
        ],
      }),
    ).toThrow('invalid features')
  })

  it('rejects invalid point coordinates', () => {
    expect(() =>
      parsePoiFeatureCollection({
        type: 'FeatureCollection',
        features: [
          {
            ...feature,
            geometry: { type: 'Point', coordinates: [Number.NaN, 63.0951] },
          },
        ],
      }),
    ).toThrow('invalid features')
  })
})

describe('localizedPoiName', () => {
  it('uses the requested localized name when available', () => {
    expect(localizedPoiName(feature, 'en')).toBe('Vaasa Museum')
    expect(localizedPoiName(feature, 'fi')).toBe('Vaasan museo')
  })

  it('falls back to Finnish or the base OSM name', () => {
    expect(localizedPoiName(feature, 'fa')).toBe('Vaasan museo')
  })
})
