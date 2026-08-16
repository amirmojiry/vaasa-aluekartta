import type { AreaBoundary, BoundaryRing, PienalueBoundary } from '@/domain/areas'
import type { PostalCodeArea, PostalGeometry, PostalPosition } from '@/domain/postal'

interface Bounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

type LonLatRing = PostalPosition[]

function postalOuterRings(geometry: PostalGeometry): LonLatRing[] {
  if (geometry.type === 'Polygon') {
    const outer = geometry.coordinates[0]
    return outer ? [outer] : []
  }
  return geometry.coordinates
    .map((polygon) => polygon[0])
    .filter((ring): ring is LonLatRing => Array.isArray(ring))
}

function ringBounds(ring: BoundaryRing): Bounds {
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY
  for (const [lat, lon] of ring) {
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLon = Math.min(minLon, lon)
    maxLon = Math.max(maxLon, lon)
  }
  return { minLat, maxLat, minLon, maxLon }
}

function postalRingBounds(ring: LonLatRing): Bounds {
  return ringBounds(ring.map(([lon, lat]) => [lat, lon]))
}

function boundsOverlap(left: Bounds, right: Bounds): boolean {
  return !(
    left.maxLat < right.minLat ||
    left.minLat > right.maxLat ||
    left.maxLon < right.minLon ||
    left.minLon > right.maxLon
  )
}

function pointInLatLonRing(lat: number, lon: number, ring: BoundaryRing): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lonI] = ring[i]!
    const [latJ, lonJ] = ring[j]!
    const intersects =
      lonI > lon !== lonJ > lon &&
      lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI || Number.EPSILON) + latI
    if (intersects) inside = !inside
  }
  return inside
}

function orientation(a: [number, number], b: [number, number], c: [number, number]): number {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])
}

function onSegment(a: [number, number], b: [number, number], c: [number, number]): boolean {
  return (
    b[0] <= Math.max(a[0], c[0]) &&
    b[0] >= Math.min(a[0], c[0]) &&
    b[1] <= Math.max(a[1], c[1]) &&
    b[1] >= Math.min(a[1], c[1])
  )
}

function segmentsIntersect(
  a1: [number, number],
  a2: [number, number],
  b1: [number, number],
  b2: [number, number],
): boolean {
  const o1 = orientation(a1, a2, b1)
  const o2 = orientation(a1, a2, b2)
  const o3 = orientation(b1, b2, a1)
  const o4 = orientation(b1, b2, a2)
  if (o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0) return true
  if (Math.abs(o1) < Number.EPSILON && onSegment(a1, b1, a2)) return true
  if (Math.abs(o2) < Number.EPSILON && onSegment(a1, b2, a2)) return true
  if (Math.abs(o3) < Number.EPSILON && onSegment(b1, a1, b2)) return true
  if (Math.abs(o4) < Number.EPSILON && onSegment(b1, a2, b2)) return true
  return false
}

function ringEdgesIntersect(areaRing: BoundaryRing, postalRing: LonLatRing): boolean {
  const postalLatLon = postalRing.map(([lon, lat]) => [lat, lon] as [number, number])
  for (let i = 0; i < areaRing.length; i += 1) {
    const a1 = areaRing[i]!
    const a2 = areaRing[(i + 1) % areaRing.length]!
    for (let j = 0; j < postalLatLon.length; j += 1) {
      const b1 = postalLatLon[j]!
      const b2 = postalLatLon[(j + 1) % postalLatLon.length]!
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

function pointInPostalRing(lat: number, lon: number, ring: LonLatRing): boolean {
  return pointInLatLonRing(
    lat,
    lon,
    ring.map(([ringLon, ringLat]) => [ringLat, ringLon]),
  )
}

function ringsIntersect(areaRing: BoundaryRing, postalRing: LonLatRing): boolean {
  if (!boundsOverlap(ringBounds(areaRing), postalRingBounds(postalRing))) return false
  const firstArea = areaRing[0]
  if (firstArea && pointInPostalRing(firstArea[0], firstArea[1], postalRing)) return true
  const firstPostal = postalRing[0]
  if (firstPostal && pointInLatLonRing(firstPostal[1], firstPostal[0], areaRing)) return true
  return ringEdgesIntersect(areaRing, postalRing)
}

export function postalIntersectsBoundary(
  postal: PostalCodeArea,
  boundary: AreaBoundary | PienalueBoundary,
): boolean {
  const postalRings = postalOuterRings(postal.geometry)
  return boundary.rings.some((areaRing) =>
    postalRings.some((postalRing) => ringsIntersect(areaRing, postalRing)),
  )
}

export function pointInPostalArea(lat: number, lon: number, postal: PostalCodeArea): boolean {
  return postalOuterRings(postal.geometry).some((ring) => pointInPostalRing(lat, lon, ring))
}

export function findPostalCodeForPoint(
  lat: number,
  lon: number,
  areas: PostalCodeArea[],
): PostalCodeArea | null {
  return areas.find((area) => pointInPostalArea(lat, lon, area)) ?? null
}

export function postalRingsForLeaflet(postal: PostalCodeArea): BoundaryRing[] {
  return postalOuterRings(postal.geometry).map((ring) =>
    ring.map(([lon, lat]) => [lat, lon] as [number, number]),
  )
}
