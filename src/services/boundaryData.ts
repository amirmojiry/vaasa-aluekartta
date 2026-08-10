import type { AreaDefinition, BoundaryRing, PienalueBoundary } from '@/domain/areas'

type Position = [number, number]
type PolygonCoordinates = Position[][]
type MultiPolygonCoordinates = Position[][][]

interface GeoJsonGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: PolygonCoordinates | MultiPolygonCoordinates
}

interface BoundaryProperties {
  slug?: string
  name: string
  ref: string
  level: 'suuralue' | 'pienalue'
  admin_level: number
  osm_relation_id: number
  outer_way_ids: number[]
  source: string
  parent_slug?: string
  parent_name?: string
  parent_ref?: string
  parent_osm_relation_id?: number
}

interface BoundaryFeature {
  type: 'Feature'
  id?: string
  properties: BoundaryProperties
  geometry: GeoJsonGeometry
}

interface BoundaryFeatureCollection {
  type: 'FeatureCollection'
  features: BoundaryFeature[]
}

const SUURALUE_DATA_URL = `${import.meta.env.BASE_URL}data/vaasa-suuralueet.geojson`
const PIENALUE_DATA_URL = `${import.meta.env.BASE_URL}data/vaasa-pienalueet.geojson`

let suuraluePromise: Promise<BoundaryFeatureCollection> | null = null
let pienaluePromise: Promise<BoundaryFeatureCollection> | null = null

async function loadFeatureCollection(url: string): Promise<BoundaryFeatureCollection> {
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error(`Boundary snapshot returned HTTP ${response.status}`)

  const data = (await response.json()) as BoundaryFeatureCollection
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Boundary snapshot is not a valid GeoJSON FeatureCollection')
  }

  return data
}

function loadSuuralueCollection(): Promise<BoundaryFeatureCollection> {
  suuraluePromise ??= loadFeatureCollection(SUURALUE_DATA_URL)
  return suuraluePromise
}

function loadPienalueCollection(): Promise<BoundaryFeatureCollection> {
  pienaluePromise ??= loadFeatureCollection(PIENALUE_DATA_URL)
  return pienaluePromise
}

export function geometryToBoundaryRings(geometry: GeoJsonGeometry): BoundaryRing[] {
  if (geometry.type === 'Polygon') {
    const polygon = geometry.coordinates as PolygonCoordinates
    const outer = polygon[0]
    return outer ? [outer.map(([lon, lat]) => [lat, lon])] : []
  }

  const multipolygon = geometry.coordinates as MultiPolygonCoordinates
  return multipolygon
    .map((polygon) => polygon[0])
    .filter((ring): ring is Position[] => Array.isArray(ring))
    .map((ring) => ring.map(([lon, lat]) => [lat, lon]))
}

export async function fetchAreaBoundaries(
  areas: AreaDefinition[],
): Promise<Map<string, BoundaryRing[]>> {
  const collection = await loadSuuralueCollection()
  const allowedSlugs = new Set(areas.map((area) => area.slug))
  const boundaries = new Map<string, BoundaryRing[]>()

  for (const feature of collection.features) {
    const slug = feature.properties.slug
    if (!slug || !allowedSlugs.has(slug)) continue
    const rings = geometryToBoundaryRings(feature.geometry)
    if (rings.length > 0) boundaries.set(slug, rings)
  }

  return boundaries
}

export async function fetchAreaBoundary(area: AreaDefinition): Promise<BoundaryRing[]> {
  const boundaries = await fetchAreaBoundaries([area])
  const rings = boundaries.get(area.slug)
  if (!rings) throw new Error(`Could not load the ${area.name} boundary snapshot`)
  return rings
}

function featureToPienalueBoundary(feature: BoundaryFeature): PienalueBoundary | null {
  const properties = feature.properties
  if (properties.level !== 'pienalue') return null
  if (!properties.parent_slug || !properties.parent_name || !properties.parent_ref) return null

  const rings = geometryToBoundaryRings(feature.geometry)
  if (rings.length === 0) return null

  return {
    relationId: properties.osm_relation_id,
    name: properties.name,
    ref: properties.ref,
    parentSlug: properties.parent_slug,
    parentName: properties.parent_name,
    parentRef: properties.parent_ref,
    outerWayIds: properties.outer_way_ids,
    rings,
    source: properties.source,
  }
}

export async function fetchPienalueBoundaries(
  areas: AreaDefinition[],
): Promise<PienalueBoundary[]> {
  void areas
  const collection = await loadPienalueCollection()
  return collection.features
    .map(featureToPienalueBoundary)
    .filter((area): area is PienalueBoundary => area !== null)
}

export async function fetchPienalueBoundary(
  relationId: number,
  areas: AreaDefinition[],
): Promise<PienalueBoundary> {
  const boundaries = await fetchPienalueBoundaries(areas)
  const boundary = boundaries.find((item) => item.relationId === relationId)
  if (!boundary) {
    throw new Error(`Could not find pienalue relation ${relationId} in the local snapshot`)
  }
  return boundary
}
