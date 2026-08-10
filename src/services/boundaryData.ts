import type {
  AreaBoundary,
  AreaDefinition,
  BoundaryRing,
  LocalizedAreaNames,
  PienalueBoundary,
  WikipediaLinks,
} from '@/domain/areas'

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
  name_fi?: string | null
  name_en?: string | null
  name_fa?: string | null
  ref: string
  level: 'suuralue' | 'pienalue'
  admin_level: number
  osm_relation_id: number
  outer_way_ids: number[]
  source: string
  wikidata_id?: string | null
  wikipedia_fi?: string | null
  wikipedia_fa?: string | null
  parent_slug?: string
  parent_name?: string
  parent_name_fi?: string | null
  parent_name_en?: string | null
  parent_name_fa?: string | null
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

function localizedNames(properties: BoundaryProperties, parent = false): LocalizedAreaNames {
  if (parent) {
    return {
      fi: properties.parent_name_fi ?? properties.parent_name ?? properties.name,
      en: properties.parent_name_en ?? null,
      fa: properties.parent_name_fa ?? null,
    }
  }

  return {
    fi: properties.name_fi ?? properties.name,
    en: properties.name_en ?? null,
    fa: properties.name_fa ?? null,
  }
}

function wikipediaLinks(properties: BoundaryProperties): WikipediaLinks {
  return {
    fi: properties.wikipedia_fi ?? null,
    fa: properties.wikipedia_fa ?? null,
  }
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

function featureToAreaBoundary(feature: BoundaryFeature): AreaBoundary | null {
  const properties = feature.properties
  if (properties.level !== 'suuralue' || !properties.slug) return null

  const rings = geometryToBoundaryRings(feature.geometry)
  if (rings.length === 0) return null

  return {
    slug: properties.slug,
    relationId: properties.osm_relation_id,
    name: properties.name,
    ref: properties.ref,
    names: localizedNames(properties),
    wikidataId: properties.wikidata_id ?? null,
    wikipedia: wikipediaLinks(properties),
    outerWayIds: properties.outer_way_ids,
    rings,
    source: properties.source,
  }
}

export async function fetchAreaRecords(
  areas: AreaDefinition[],
): Promise<Map<string, AreaBoundary>> {
  const collection = await loadSuuralueCollection()
  const allowedSlugs = new Set(areas.map((area) => area.slug))
  const boundaries = new Map<string, AreaBoundary>()

  for (const feature of collection.features) {
    const boundary = featureToAreaBoundary(feature)
    if (!boundary || !allowedSlugs.has(boundary.slug)) continue
    boundaries.set(boundary.slug, boundary)
  }

  return boundaries
}

export async function fetchAreaBoundaries(
  areas: AreaDefinition[],
): Promise<Map<string, BoundaryRing[]>> {
  const records = await fetchAreaRecords(areas)
  return new Map([...records].map(([slug, area]) => [slug, area.rings]))
}

export async function fetchAreaRecord(area: AreaDefinition): Promise<AreaBoundary> {
  const boundaries = await fetchAreaRecords([area])
  const boundary = boundaries.get(area.slug)
  if (!boundary) throw new Error(`Could not load the ${area.name} boundary snapshot`)
  return boundary
}

export async function fetchAreaBoundary(area: AreaDefinition): Promise<BoundaryRing[]> {
  return (await fetchAreaRecord(area)).rings
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
    names: localizedNames(properties),
    wikidataId: properties.wikidata_id ?? null,
    wikipedia: wikipediaLinks(properties),
    parentSlug: properties.parent_slug,
    parentName: properties.parent_name,
    parentNames: localizedNames(properties, true),
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
