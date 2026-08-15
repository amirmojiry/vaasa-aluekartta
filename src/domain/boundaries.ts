export type BoundaryLevel = 'suuralue' | 'pienalue' | 'postal'

export interface BoundaryLayerDefinition {
  id: BoundaryLevel
  label: string
  description: string
  areaCount: number
  imageUrl: string
  sourcePageUrl: string
  licence: string
  author: string
  updatedAt: string
}

export const SUURALUE_NAMES = [
  'Keskusta',
  'Vöyrinkaupunki',
  'Vaskiluoto',
  'Palosaari',
  'Gerby',
  'Kotiranta',
  'Huutoniemi',
  'Ristinummi',
  'Höstvesi',
  'Suvilahti',
  'Sundom',
  'Vähäkyrö',
] as const
