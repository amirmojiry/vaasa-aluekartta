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

export interface LocalizedText {
  fi?: string | null
  en?: string | null
  fa?: string | null
}

export interface LocalizedAreaNames extends LocalizedText {
  fi: string
}

export interface WikipediaLinks {
  fi?: string | null
  fa?: string | null
}

export interface ExternalIdentifier {
  propertyId: string
  value: string
  labels: LocalizedText
  url?: string | null
}

export interface AreaBoundary {
  slug: string
  relationId: number
  name: string
  ref: string
  names: LocalizedAreaNames
  wikidataId?: string | null
  wikidataDescription: LocalizedText
  wikipedia: WikipediaLinks
  externalIdentifiers: ExternalIdentifier[]
  outerWayIds: number[]
  rings: BoundaryRing[]
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
  names: LocalizedAreaNames
  wikidataId?: string | null
  wikidataDescription: LocalizedText
  wikipedia: WikipediaLinks
  externalIdentifiers: ExternalIdentifier[]
  parentSlug: string
  parentName: string
  parentNames: LocalizedAreaNames
  parentRef: string
  outerWayIds: number[]
  rings: BoundaryRing[]
  source: string
}
