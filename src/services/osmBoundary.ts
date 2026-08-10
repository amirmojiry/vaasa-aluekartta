import type {
  AreaDefinition,
  BoundaryCoordinate,
  BoundaryRing,
  OverpassWayElement,
  OverpassWaysResponse,
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
  const remaining = ways
    .map(asSegment)
    .filter((segment): segment is Segment => segment !== null)
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

    if (coordinates.length >= 3) {
      rings.push(coordinates.map((point) => [point.lat, point.lon]))
    }
  }

  return rings
}

function buildWayQuery(wayIds: number[]): string {
  return `[out:json][timeout:30];\nway(id:${wayIds.join(',')});\nout body geom;`
}

async function fetchOverpass(query: string): Promise<OverpassWaysResponse> {
  let lastError: unknown

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
      })

      if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}`)
      return (await response.json()) as OverpassWaysResponse
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not load boundary data from Overpass')
}

export async function fetchAreaBoundary(area: AreaDefinition): Promise<BoundaryRing[]> {
  const response = await fetchOverpass(buildWayQuery(area.outerWayIds))
  const expectedIds = new Set(area.outerWayIds)
  const ways = response.elements.filter(
    (element): element is OverpassWayElement =>
      element.type === 'way' && expectedIds.has(element.id) && 'nodes' in element,
  )

  if (ways.length === 0) {
    throw new Error(`No geometry returned for ${area.name}`)
  }

  const rings = stitchWaysIntoRings(ways)
  if (rings.length === 0) {
    throw new Error(`Could not assemble the ${area.name} boundary`)
  }

  return rings
}
