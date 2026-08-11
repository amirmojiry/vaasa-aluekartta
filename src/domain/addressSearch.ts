import type { PienalueBoundary } from '@/domain/areas'

export interface GeocodedAddress {
  query: string
  displayName: string
  lat: number
  lon: number
}

export interface LocatedAddress extends GeocodedAddress {
  area: PienalueBoundary | null
}
