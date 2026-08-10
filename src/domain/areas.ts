export type AreaLevel = 'suuralue' | 'pienalue'

export interface AreaDefinition {
  slug: string
  name: string
  ref: string
  level: AreaLevel
  relationId: number
  outerWayIds: number[]
  subareaRelationIds: number[]
  source: string
}

export interface BoundaryCoordinate {
  lat: number
  lon: number
}

export interface OverpassWayElement {
  type: 'way'
  id: number
  nodes: number[]
  geometry?: BoundaryCoordinate[]
}

export interface OverpassWaysResponse {
  elements: Array<OverpassWayElement | { type: string; id: number }>
}

export type BoundaryRing = Array<[number, number]>
