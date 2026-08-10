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

export interface OverpassRelationMember {
  type: 'node' | 'way' | 'relation'
  ref: number
  role: string
}

export interface OverpassRelationElement {
  type: 'relation'
  id: number
  members: OverpassRelationMember[]
  tags?: Record<string, string>
}

export type OverpassBoundaryElement =
  OverpassWayElement | OverpassRelationElement | { type: string; id: number }

export interface OverpassBoundaryResponse {
  elements: OverpassBoundaryElement[]
}

export type BoundaryRing = Array<[number, number]>

export interface PienalueBoundary {
  relationId: number
  name: string
  ref: string
  parentSlug: string
  parentName: string
  parentRef: string
  outerWayIds: number[]
  rings: BoundaryRing[]
  source: string
}
