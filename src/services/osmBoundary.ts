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

function buildWayQuery(wayIds: number[]): string {
  return `[out:json][timeout:45];\nway(id:${wayIds.join(',')});\nout body geom;`
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

function collectWays(response: OverpassWaysResponse): Map<number, OverpassWayElement> {
  const ways = new Map<number, OverpassWayElement>()

  for (const element of response.elements) {
    if (element.type === 'way' && 'nodes' in element) {
      ways.set(element.id, element)
    }
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
