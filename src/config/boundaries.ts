import type { LatLngBoundsExpression } from 'leaflet'

import type { BoundaryLayerDefinition } from '@/domain/boundaries'

export const VAASA_BOUNDARY_BOUNDS: LatLngBoundsExpression = [
  [62.76, 20.9],
  [63.36, 22.5],
]

export const BOUNDARY_LAYERS: BoundaryLayerDefinition[] = [
  {
    id: 'suuralue',
    label: 'Suuralueet',
    description: 'Vaasa’s 12 major statistical districts.',
    areaCount: 12,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/6/66/Vaasa_major_districts_map.svg',
    sourcePageUrl:
      'https://commons.wikimedia.org/wiki/File:Vaasa_major_districts_map.svg',
    licence: 'CC BY-SA 4.0',
    author: 'Tvinnari',
    updatedAt: '2025-01-23',
  },
  {
    id: 'pienalue',
    label: 'Pienalueet',
    description: 'Vaasa’s 60 minor statistical districts, including Vähäkyrö.',
    areaCount: 60,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/a8/Vaasa_districts_%28statistical%29_with_V%C3%A4h%C3%A4kyr%C3%B6.svg',
    sourcePageUrl:
      'https://commons.wikimedia.org/wiki/File:Vaasa_districts_(statistical)_with_V%C3%A4h%C3%A4kyr%C3%B6.svg',
    licence: 'CC BY-SA 4.0',
    author: 'Tvinnari',
    updatedAt: '2026-04-30',
  },
]
