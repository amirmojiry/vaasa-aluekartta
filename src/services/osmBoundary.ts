import type {
  AreaDefinition,
  BoundaryCoordinate,
  BoundaryRing,
  OverpassBoundaryElement,
  OverpassBoundaryResponse,
  OverpassRelationElement,
  OverpassWayElement,
  PienalueBoundary,
} from '@/domain/areas'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

interface Segment {
  id: number
  nodes: number[]
  coordinates: BoundaryCoordinate[]
}

function asSegment(way: OverpassWayElement): Segment | null {
  if (!way.geometry || way.geometry.length !== way.nodes.length || way.nodes.length < 2) return null

  return {
    id: way.id,
    nodes: [...way.nodes],
    coordinates: [...way.geometry],
  }
}

function reversed(segment: Segment): Segment {
  return {
    id: segment.id,
    nodes: [...segment.nodes].reverse(),
    coordinates: [...segment.coordinates].reverse(),
  }
}

export function stitchWaysIntoRings(ways: OverpassWayElement[]): BoundaryRing[] {
  const remaining = ways.map(asSegment).filter((segment): segment is Segment => segment !== null)
  const rings: BoundaryRing[] = []

  while (remaining.length > 0) {
    const first = remaining.shift()
    if (!first) break

    const nodeIds = [...first.nodes]
    const coordinates = [...first.coordinates]

    while (nodeIds[0] !== nodeIds[nodeIds.length - 1]) {
      const endNode = nodeIds[nodeIds.length - 1]
      const nextIndex = remaining.findIndex((segment) => {
        const segmentStart = segment.nodes[0]
        const segmentEnd = segment.nodes[segment.nodes.length - 1]
        return segmentStart === endNode || segmentEnd === endNode
      })

      if (nextIndex === -1) break

      const nextRaw = remaining.splice(nextIndex, 1)[0]
      if (!nextRaw) break

      const next = nextRaw.nodes[0] === endNode ? nextRaw : reversed(nextRaw)
      nodeIds.push(...next.nodes.slice(1))
      coordinates.push(...next.coordinates.slice(1))
    }

    if (coordinates.length >= 3 && nodeIds[0] === nodeIds[nodeIds.length - 1]) {
      rings.push(coordinates.map((point) => [point.lat, point.lon]))
    }
  }

  return rings
}

function isWayElement(element: OverpassBoundaryElement): element is OverpassWayElement {
  return element.type === 'way' && 'nodes' in element
}

function isRelationElement(element: OverpassBoundaryElement): element is OverpassRelationElement {
  return element.type === 'relation' && 'members' in element
}

function buildWayQuery(wayIds: number[]): string {
  return `[out:json][timeout:45];\nway(id:${wayIds.join(',')});\nout body geom;`
}

export function buildPienalueQuery(areas: AreaDefinition[]): string {
  const knownRelationIds = areas.flatMap((area) => area.subareaRelationIds)
  const vahakyro = areas.find((area) => area.slug === 'vahakyro')
  const lines = ['[out:json][timeout:60];']

  if (knownRelationIds.length > 0) {
    lines.push(`rel(id:${knownRelationIds.join(',')})->.known;`)
  }

  if (vahakyro) {
    lines.push(`rel(${vahakyro.relationId});`)
    lines.push('map_to_area->.vahakyroArea;')
    lines.push(
      'rel(area.vahakyroArea)["boundary"="administrative"]["admin_level"="10"]->.vahakyroChildren;',
    )
  }

  if (knownRelationIds.length > 0 && vahakyro) {
    lines.push('(.known;.vahakyroChildren;)->.children;')
  } else if (knownRelationIds.length > 0) {
    lines.push('.known->.children;')
  } else {
    lines.push('.vahakyroChildren->.children;')
  }

  lines.push('.children out body;')
  lines.push('way(r.children:"outer");')
  lines.push('out body geom;')
  return lines.join('\n')
}

function buildSinglePienalueQuery(relationId: number): string {
  return [
    '[out:json][timeout:45];',
    `rel(${relationId})->.children;`,
    '.children out body;',
    'way(r.children:"outer");',
    'out body geom;',
  ].join('\n')
}

async function fetchOverpass(query: string): Promise<OverpassBoundaryResponse> {
  let lastError: unknown

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
      })

      if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}`)
      return (await response.json()) as OverpassBoundaryResponse
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not load boundary data from Overpass')
}

function collectWays(response: OverpassBoundaryResponse): Map<number, OverpassWayElement> {
  const ways = new Map<number, OverpassWayElement>()

  for (const element of response.elements) {
    if (isWayElement(element)) ways.set(element.id, element)
  }

  return ways
}

export async function fetchAreaBoundaries(
  areas: AreaDefinition[],
): Promise<Map<string, BoundaryRing[]>> {
  const uniqueWayIds = [...new Set(areas.flatMap((area) => area.outerWayIds))]
  const response = await fetchOverpass(buildWayQuery(uniqueWayIds))
  const waysById = collectWays(response)
  const boundaries = new Map<string, BoundaryRing[]>()

  for (const area of areas) {
    const ways = area.outerWayIds
      .map((wayId) => waysById.get(wayId))
      .filter((way): way is OverpassWayElement => way !== undefined)
    const rings = stitchWaysIntoRings(ways)

    if (rings.length > 0) boundaries.set(area.slug, rings)
  }

  return boundaries
}

export async function fetchAreaBoundary(area: AreaDefinition): Promise<BoundaryRing[]> {
  const boundaries = await fetchAreaBoundaries([area])
  const rings = boundaries.get(area.slug)

  if (!rings) {
    throw new Error(`Could not assemble the ${area.name} boundary`)
  }

  return rings
}

export function parsePienalueResponse(
  response: OverpassBoundaryResponse,
  areas: AreaDefinition[],
): PienalueBoundary[] {
  const waysById = collectWays(response)
  const parentByRelationId = new Map<number, AreaDefinition>()

  for (const area of areas) {
    for (const relationId of area.subareaRelationIds) {
      parentByRelationId.set(relationId, area)
    }
  }

  const vahakyro = areas.find((area) => area.slug === 'vahakyro')
  const boundaries: PienalueBoundary[] = []

  for (const element of response.elements) {
    if (!isRelationElement(element)) continue
    if (element.tags?.boundary !== 'administrative' || element.tags?.admin_level !== '10') continue

    const parent = parentByRelationId.get(element.id) ?? vahakyro
    if (!parent) continue

    const outerWayIds = element.members
      .filter((member) => member.type === 'way' && member.role === 'outer')
      .map((member) => member.ref)
    const outerWays = outerWayIds
      .map((wayId) => waysById.get(wayId))
      .filter((way): way is OverpassWayElement => way !== undefined)
    const rings = stitchWaysIntoRings(outerWays)

    if (rings.length === 0) continue

    boundaries.push({
      relationId: element.id,
      name: element.tags.name ?? `OSM relation ${element.id}`,
      ref: element.tags.ref ?? '',
      parentSlug: parent.slug,
      parentName: parent.name,
      parentRef: parent.ref,
      outerWayIds,
      rings,
      source: element.tags.source
        ? `OpenStreetMap relation ${element.id}; source tag: ${element.tags.source}`
        : `OpenStreetMap relation ${element.id}`,
    })
  }

  return boundaries.sort((a, b) => {
    const parentOrder = a.parentRef.localeCompare(b.parentRef, undefined, { numeric: true })
    if (parentOrder !== 0) return parentOrder
    const refOrder = a.ref.localeCompare(b.ref, undefined, { numeric: true })
    if (refOrder !== 0) return refOrder
    return a.name.localeCompare(b.name)
  })
}

export async function fetchPienalueBoundaries(
  areas: AreaDefinition[],
): Promise<PienalueBoundary[]> {
  const response = await fetchOverpass(buildPienalueQuery(areas))
  return parsePienalueResponse(response, areas)
}

export async function fetchPienalueBoundary(
  relationId: number,
  areas: AreaDefinition[],
): Promise<PienalueBoundary> {
  const response = await fetchOverpass(buildSinglePienalueQuery(relationId))
  const boundaries = parsePienalueResponse(response, areas)
  const boundary = boundaries.find((item) => item.relationId === relationId)

  if (!boundary) {
    throw new Error(`Could not assemble pienalue relation ${relationId}`)
  }

  return boundary
}
