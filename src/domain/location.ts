export type LocationPrecision =
  | 'exact-address'
  | 'known-venue'
  | 'postal-area'
  | 'municipality'
  | 'multi-location'
  | 'online'
  | 'unresolved'

export type LocationResolutionReason =
  | 'ambiguous-local-match'
  | 'ambiguous-geocoder-match'
  | 'no-usable-query'
  | 'remote-key-missing'
  | 'outside-vaasa-bounds'
  | 'unsupported-geocoder-source'
  | 'no-geocoder-result'
  | 'geocoder-result-mismatch'

export interface LocationProvenance {
  provider: string
  dataset?: string
  sourceUrl?: string
  licence?: string
  licenceUrl?: string
  retrievedAt?: string
  transformation?: string
}

export interface LocationResolution {
  precision: LocationPrecision
  latitude?: number
  longitude?: number
  label?: string
  geocoder?: string
  geocodedAt?: string
  confidence?: number
  sourceAddress?: string
  reason?: LocationResolutionReason
  provenance?: LocationProvenance
}

export interface EventLocationRecord {
  eventId: string
  sourceLocationSignature: string
  query?: string
  resolution: LocationResolution
}

export interface EventLocationSnapshot {
  schemaVersion: 1
  sourceEventCount: number
  bounds: {
    provider: 'OpenStreetMap'
    relationId: 1855926
    wikidata: 'Q125080'
    adminLevel: '8'
    minLatitude: number
    minLongitude: number
    maxLatitude: number
    maxLongitude: number
  }
  locations: EventLocationRecord[]
}
