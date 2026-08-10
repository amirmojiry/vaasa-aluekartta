import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAJOR_AREAS = [
  { relationId: 11930886, slug: 'keskusta', ref: '01', name: 'Keskusta' },
  { relationId: 11930928, slug: 'voyrinkaupunki', ref: '02', name: 'Vöyrinkaupunki' },
  { relationId: 11931015, slug: 'vaskiluoto', ref: '03', name: 'Vaskiluoto' },
  { relationId: 11931113, slug: 'palosaari', ref: '04', name: 'Palosaari' },
  { relationId: 11931679, slug: 'gerby', ref: '05', name: 'Gerby' },
  { relationId: 11931725, slug: 'kotiranta', ref: '06', name: 'Kotiranta' },
  { relationId: 11931778, slug: 'huutoniemi', ref: '07', name: 'Huutoniemi' },
  { relationId: 11931939, slug: 'ristinummi', ref: '08', name: 'Ristinummi' },
  { relationId: 11932028, slug: 'hostvesi', ref: '09', name: 'Höstvesi' },
  { relationId: 11931139, slug: 'suvilahti', ref: '10', name: 'Suvilahti' },
  { relationId: 11931249, slug: 'sundom', ref: '11', name: 'Sundom' },
  { relationId: 2249140, slug: 'vahakyro', ref: '12', name: 'Vähäkyrö' },
]

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputDir = resolve(scriptDir, '../public/data')

function buildQuery() {
  const majorIds = MAJOR_AREAS.map((area) => area.relationId).join(',')
  return `[out:json][timeout:120];
rel(id:${majorIds})->.majors;
.majors map_to_area->.majorAreas;
rel["boundary"="administrative"]["admin_level"="10"](area.majorAreas)->.minors;
(.majors;.minors;)->.relations;
.relations out body;
way(r.relations:"outer");
out body geom;`
}

async function fetchOverpass(query) {
  let lastError

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
      })

      if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}`)
      return { endpoint, data: await response.json() }
    } catch (error) {
      lastError = error
      console.warn(
        `Boundary download failed via ${endpoint}: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not load boundary data from Overpass')
}

function asSegment(way) {
  if (!Array.isArray(way.nodes) || !Array.isArray(way.geometry)) return null
  if (way.nodes.length < 2 || way.geometry.length !== way.nodes.length) return null

  return {
    nodes: [...way.nodes],
    coordinates: way.geometry.map((point) => [point.lat, point.lon]),
  }
}

function reverseSegment(segment) {
  return {
    nodes: [...segment.nodes].reverse(),
    coordinates: [...segment.coordinates].reverse(),
  }
}

function stitchWaysIntoRings(ways) {
  const remaining = ways.map(asSegment).filter(Boolean)
  const rings = []

  while (remaining.length > 0) {
    const first = remaining.shift()
    if (!first) break

    const nodeIds = [...first.nodes]
    const coordinates = [...first.coordinates]

    while (nodeIds[0] !== nodeIds[nodeIds.length - 1]) {
      const endNode = nodeIds[nodeIds.length - 1]
      const nextIndex = remaining.findIndex((segment) => {
        const start = segment.nodes[0]
        const end = segment.nodes[segment.nodes.length - 1]
        return start === endNode || end === endNode
      })

      if (nextIndex === -1) break
      const candidate = remaining.splice(nextIndex, 1)[0]
      if (!candidate) break
      const next = candidate.nodes[0] === endNode ? candidate : reverseSegment(candidate)
      nodeIds.push(...next.nodes.slice(1))
      coordinates.push(...next.coordinates.slice(1))
    }

    if (coordinates.length >= 4 && nodeIds[0] === nodeIds[nodeIds.length - 1]) {
      rings.push(coordinates)
    }
  }

  return rings
}

function relationGeometry(relation, waysById) {
  const outerWayIds = (relation.members ?? [])
    .filter((member) => member.type === 'way' && member.role === 'outer')
    .map((member) => member.ref)
  const ways = outerWayIds.map((id) => waysById.get(id)).filter(Boolean)
  const rings = stitchWaysIntoRings(ways)
  const coordinates = rings.map((ring) => ring.map(([lat, lon]) => [lon, lat]))

  if (coordinates.length === 0) return { geometry: null, outerWayIds }
  if (coordinates.length === 1) {
    return { geometry: { type: 'Polygon', coordinates: [coordinates[0]] }, outerWayIds }
  }

  return {
    geometry: { type: 'MultiPolygon', coordinates: coordinates.map((ring) => [ring]) },
    outerWayIds,
  }
}

function firstOuterRing(geometry) {
  if (!geometry) return null
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? null
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0]?.[0] ?? null
  return null
}

function representativePoint(geometry) {
  const ring = firstOuterRing(geometry)
  if (!ring?.length) return null
  const points = ring.slice(0, -1)
  if (points.length === 0) return ring[0]
  const total = points.reduce(([x, y], [px, py]) => [x + px, y + py], [0, 0])
  return [total[0] / points.length, total[1] / points.length]
}

function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.some((polygon) => polygon?.[0] && pointInRing(point, polygon[0]))
}

function sourceFor(relation) {
  return relation.tags?.source
    ? `OpenStreetMap relation ${relation.id}; source tag: ${relation.tags.source}`
    : `OpenStreetMap relation ${relation.id}`
}

function featureCollection(features, generatedAt, endpoint) {
  return {
    type: 'FeatureCollection',
    metadata: {
      generated_at: generatedAt,
      source: 'OpenStreetMap contributors',
      licence: 'ODbL 1.0',
      overpass_endpoint: endpoint,
    },
    features,
  }
}

function sortMinorFeatures(a, b) {
  const parentOrder = String(a.properties.parent_ref).localeCompare(
    String(b.properties.parent_ref),
    undefined,
    { numeric: true },
  )
  if (parentOrder !== 0) return parentOrder
  const refOrder = String(a.properties.ref ?? '').localeCompare(
    String(b.properties.ref ?? ''),
    undefined,
    { numeric: true },
  )
  if (refOrder !== 0) return refOrder
  return String(a.properties.name).localeCompare(String(b.properties.name), 'fi')
}

async function main() {
  const { endpoint, data } = await fetchOverpass(buildQuery())
  const relations = (data.elements ?? []).filter((element) => element.type === 'relation')
  const waysById = new Map(
    (data.elements ?? [])
      .filter((element) => element.type === 'way' && Array.isArray(element.nodes))
      .map((way) => [way.id, way]),
  )
  const relationsById = new Map(relations.map((relation) => [relation.id, relation]))
  const generatedAt = new Date().toISOString()

  const majorFeatures = MAJOR_AREAS.map((definition) => {
    const relation = relationsById.get(definition.relationId)
    if (!relation) throw new Error(`Missing suuralue relation ${definition.relationId}`)
    const { geometry, outerWayIds } = relationGeometry(relation, waysById)
    if (!geometry) throw new Error(`Could not assemble ${definition.name} boundary`)

    return {
      type: 'Feature',
      id: `relation/${relation.id}`,
      properties: {
        slug: definition.slug,
        name: relation.tags?.name ?? definition.name,
        ref: relation.tags?.ref ?? definition.ref,
        level: 'suuralue',
        admin_level: 9,
        osm_relation_id: relation.id,
        outer_way_ids: outerWayIds,
        source: sourceFor(relation),
      },
      geometry,
    }
  }).sort((a, b) =>
    String(a.properties.ref).localeCompare(String(b.properties.ref), undefined, { numeric: true }),
  )

  const majorFeatureById = new Map(
    majorFeatures.map((feature) => [feature.properties.osm_relation_id, feature]),
  )
  const parentByMinorRelationId = new Map()
  for (const definition of MAJOR_AREAS) {
    const relation = relationsById.get(definition.relationId)
    for (const member of relation?.members ?? []) {
      if (member.type === 'relation' && member.role === 'subarea') {
        parentByMinorRelationId.set(member.ref, definition.relationId)
      }
    }
  }

  const minorRelations = relations.filter(
    (relation) =>
      relation.tags?.boundary === 'administrative' && relation.tags?.admin_level === '10',
  )

  const minorFeatures = minorRelations
    .map((relation) => {
      const { geometry, outerWayIds } = relationGeometry(relation, waysById)
      if (!geometry) return null

      let parentId = parentByMinorRelationId.get(relation.id)
      if (!parentId) {
        const point = representativePoint(geometry)
        const parentFeature = point
          ? majorFeatures.find((feature) => pointInGeometry(point, feature.geometry))
          : undefined
        parentId = parentFeature?.properties.osm_relation_id
      }

      const parentFeature = parentId ? majorFeatureById.get(parentId) : undefined
      if (!parentFeature) {
        throw new Error(`Could not resolve parent suuralue for pienalue relation ${relation.id}`)
      }

      return {
        type: 'Feature',
        id: `relation/${relation.id}`,
        properties: {
          name: relation.tags?.name ?? `OSM relation ${relation.id}`,
          ref: relation.tags?.ref ?? '',
          level: 'pienalue',
          admin_level: 10,
          osm_relation_id: relation.id,
          parent_slug: parentFeature.properties.slug,
          parent_name: parentFeature.properties.name,
          parent_ref: parentFeature.properties.ref,
          parent_osm_relation_id: parentFeature.properties.osm_relation_id,
          outer_way_ids: outerWayIds,
          source: sourceFor(relation),
        },
        geometry,
      }
    })
    .filter(Boolean)
    .sort(sortMinorFeatures)

  if (majorFeatures.length !== 12) {
    throw new Error(`Expected 12 suuralue features, generated ${majorFeatures.length}`)
  }
  if (minorFeatures.length !== 60) {
    throw new Error(`Expected 60 pienalue features, generated ${minorFeatures.length}`)
  }

  await mkdir(outputDir, { recursive: true })
  await writeFile(
    resolve(outputDir, 'vaasa-suuralueet.geojson'),
    `${JSON.stringify(featureCollection(majorFeatures, generatedAt, endpoint), null, 2)}\n`,
  )
  await writeFile(
    resolve(outputDir, 'vaasa-pienalueet.geojson'),
    `${JSON.stringify(featureCollection(minorFeatures, generatedAt, endpoint), null, 2)}\n`,
  )
  await writeFile(
    resolve(outputDir, 'boundary-metadata.json'),
    `${JSON.stringify(
      {
        generated_at: generatedAt,
        source: 'OpenStreetMap contributors',
        licence: 'ODbL 1.0',
        overpass_endpoint: endpoint,
        suuralue_count: majorFeatures.length,
        pienalue_count: minorFeatures.length,
      },
      null,
      2,
    )}\n`,
  )

  console.log(`Generated ${majorFeatures.length} suuralue and ${minorFeatures.length} pienalue features.`)
}

await main()
