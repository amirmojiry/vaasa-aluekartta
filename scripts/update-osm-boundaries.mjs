import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAJOR_AREAS = [
  {
    relationId: 11930886,
    slug: 'keskusta',
    ref: '01',
    name: 'Keskusta',
    children: [
      11930883, 11930884, 11930876, 11930879, 11930878, 11930877, 11930882, 11930881, 11930880,
      11930885,
    ],
  },
  {
    relationId: 11930928,
    slug: 'voyrinkaupunki',
    ref: '02',
    name: 'Vöyrinkaupunki',
    children: [11930927, 11930925, 11930926],
  },
  {
    relationId: 11931015,
    slug: 'vaskiluoto',
    ref: '03',
    name: 'Vaskiluoto',
    children: [11931013, 11931012, 11931014],
  },
  {
    relationId: 11931113,
    slug: 'palosaari',
    ref: '04',
    name: 'Palosaari',
    children: [11931111, 11931110, 11931109, 11931108, 11931112],
  },
  {
    relationId: 11931679,
    slug: 'gerby',
    ref: '05',
    name: 'Gerby',
    children: [
      11931680, 11931690, 11931678, 11931689, 11931684, 11931683, 11931686, 11931687, 11931682,
      11931685, 11931681, 11931688,
    ],
  },
  {
    relationId: 11931725,
    slug: 'kotiranta',
    ref: '06',
    name: 'Kotiranta',
    children: [11931728, 11931726, 11931724, 11931727],
  },
  {
    relationId: 11931778,
    slug: 'huutoniemi',
    ref: '07',
    name: 'Huutoniemi',
    children: [11931777, 11931782, 11931781, 11931779, 11931780],
  },
  {
    relationId: 11931939,
    slug: 'ristinummi',
    ref: '08',
    name: 'Ristinummi',
    children: [11931941, 11931943, 11931942, 11931938, 11931940],
  },
  {
    relationId: 11932028,
    slug: 'hostvesi',
    ref: '09',
    name: 'Höstvesi',
    children: [11932030, 11932027, 11932029],
  },
  {
    relationId: 11931139,
    slug: 'suvilahti',
    ref: '10',
    name: 'Suvilahti',
    children: [11931137, 11931138],
  },
  {
    relationId: 11931249,
    slug: 'sundom',
    ref: '11',
    name: 'Sundom',
    children: [11931246, 11931247, 11931248],
  },
  {
    relationId: 2249140,
    slug: 'vahakyro',
    ref: '12',
    name: 'Vähäkyrö',
    children: [],
  },
]

const OSM_API = 'https://api.openstreetmap.org/api/0.6'
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const USER_AGENT =
  'vaasa-aluekartta-boundary-snapshot/1.1 (+https://github.com/amirmojiry/vaasa-aluekartta)'
const EXPECTED_PIENALUE_COUNT = 60
const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputDir = resolve(scriptDir, '../public/data')

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

async function fetchRelationFull(relationId) {
  const url = `${OSM_API}/relation/${relationId}/full.json`
  let lastError

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      })

      if (response.ok) return await response.json()
      lastError = new Error(`OSM API returned HTTP ${response.status} for relation ${relationId}`)
      if (response.status !== 429 && response.status < 500) throw lastError
    } catch (error) {
      lastError = error
    }

    await sleep(500 * attempt)
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Could not load OSM relation ${relationId}`)
}

function mergeElements(target, response) {
  for (const element of response.elements ?? []) {
    if (!element?.type || typeof element.id !== 'number') continue
    target.set(`${element.type}/${element.id}`, element)
  }
}

async function loadRequiredOsmData() {
  const relationIds = [
    ...MAJOR_AREAS.map((area) => area.relationId),
    ...MAJOR_AREAS.flatMap((area) => area.children),
  ]
  const elements = new Map()

  for (let index = 0; index < relationIds.length; index += 1) {
    const relationId = relationIds[index]
    const response = await fetchRelationFull(relationId)
    mergeElements(elements, response)
    console.log(`Loaded relation ${relationId} (${index + 1}/${relationIds.length})`)
    await sleep(80)
  }

  return [...elements.values()]
}

function validWikidataId(value) {
  return typeof value === 'string' && /^Q\d+$/.test(value) ? value : null
}

async function fetchWikidataBatch(ids) {
  const search = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|sitelinks',
    languages: 'fi|en|fa',
    sitefilter: 'fiwiki|fawiki',
    format: 'json',
  })
  const response = await fetch(`${WIKIDATA_API}?${search.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  })
  if (!response.ok) throw new Error(`Wikidata API returned HTTP ${response.status}`)
  return response.json()
}

async function loadWikidataMetadata(relations) {
  const ids = [
    ...new Set(
      relations.map((relation) => validWikidataId(relation.tags?.wikidata)).filter(Boolean),
    ),
  ]
  const entities = new Map()

  try {
    for (let offset = 0; offset < ids.length; offset += 50) {
      const batch = ids.slice(offset, offset + 50)
      const response = await fetchWikidataBatch(batch)
      for (const [id, entity] of Object.entries(response.entities ?? {})) {
        if (!entity?.missing) entities.set(id, entity)
      }
      await sleep(100)
    }
  } catch (error) {
    console.warn(
      `Wikidata enrichment skipped: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  console.log(`Loaded Wikidata metadata for ${entities.size}/${ids.length} linked entities`)
  return entities
}

function reverseSegment(segment) {
  return {
    nodes: [...segment.nodes].reverse(),
    coordinates: [...segment.coordinates].reverse(),
  }
}

function stitchWaysIntoRings(ways, nodesById) {
  const remaining = ways
    .map((way) => {
      if (!Array.isArray(way?.nodes) || way.nodes.length < 2) return null
      const coordinates = way.nodes.map((nodeId) => nodesById.get(nodeId)).filter(Boolean)
      if (coordinates.length !== way.nodes.length) return null
      return { nodes: [...way.nodes], coordinates }
    })
    .filter(Boolean)
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

function relationGeometry(relation, waysById, nodesById) {
  const outerWayIds = (relation.members ?? [])
    .filter((member) => member.type === 'way' && member.role === 'outer')
    .map((member) => member.ref)
  const ways = outerWayIds.map((id) => waysById.get(id)).filter(Boolean)

  if (ways.length !== outerWayIds.length) {
    throw new Error(`Missing outer ways for relation ${relation.id}`)
  }

  const rings = stitchWaysIntoRings(ways, nodesById)
  if (rings.length === 0) return { geometry: null, outerWayIds }

  const coordinates = rings.map((ring) => ring.map(([lat, lon]) => [lon, lat]))
  if (coordinates.length === 1) {
    return { geometry: { type: 'Polygon', coordinates: [coordinates[0]] }, outerWayIds }
  }

  return {
    geometry: { type: 'MultiPolygon', coordinates: coordinates.map((ring) => [ring]) },
    outerWayIds,
  }
}

function sourceFor(relation) {
  return relation.tags?.source
    ? `OpenStreetMap relation ${relation.id}; source tag: ${relation.tags.source}`
    : `OpenStreetMap relation ${relation.id}`
}

function wikipediaTagTitle(relation, language) {
  const direct = relation.tags?.[`wikipedia:${language}`]
  if (direct) return direct

  const tagged = relation.tags?.wikipedia
  if (!tagged) return null
  const separator = tagged.indexOf(':')
  if (separator < 1) return null
  return tagged.slice(0, separator) === language ? tagged.slice(separator + 1) : null
}

function wikipediaUrl(language, title) {
  if (!title) return null
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

function relationEnrichment(relation, wikidataById) {
  const wikidataId = validWikidataId(relation.tags?.wikidata)
  const entity = wikidataId ? wikidataById.get(wikidataId) : null
  const finnishTitle = entity?.sitelinks?.fiwiki?.title ?? wikipediaTagTitle(relation, 'fi')
  const persianTitle = entity?.sitelinks?.fawiki?.title ?? wikipediaTagTitle(relation, 'fa')

  return {
    name_fi: relation.tags?.['name:fi'] ?? relation.tags?.name ?? `OSM relation ${relation.id}`,
    name_en: relation.tags?.['name:en'] ?? entity?.labels?.en?.value ?? null,
    name_fa: relation.tags?.['name:fa'] ?? entity?.labels?.fa?.value ?? null,
    wikidata_id: wikidataId,
    wikipedia_fi: wikipediaUrl('fi', finnishTitle),
    wikipedia_fa: wikipediaUrl('fa', persianTitle),
  }
}

function snapshotMetadata(generatedAt, minorCount, wikidataCount) {
  return {
    generated_at: generatedAt,
    source: 'OpenStreetMap contributors',
    licence: 'ODbL 1.0',
    api_source: OSM_API,
    wikidata_source: WIKIDATA_API,
    wikidata_entity_count: wikidataCount,
    suuralue_count: MAJOR_AREAS.length,
    pienalue_count: minorCount,
    expected_pienalue_count: EXPECTED_PIENALUE_COUNT,
    unresolved_pienalue_count: EXPECTED_PIENALUE_COUNT - minorCount,
    unresolved_note:
      'The configured OSM hierarchy currently contains no admin_level=10 child relations for Vähäkyrö.',
  }
}

function featureCollection(features, metadata) {
  return { type: 'FeatureCollection', metadata, features }
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
  const elements = await loadRequiredOsmData()
  const relationsById = new Map(
    elements
      .filter((element) => element.type === 'relation')
      .map((relation) => [relation.id, relation]),
  )
  const waysById = new Map(
    elements.filter((element) => element.type === 'way').map((way) => [way.id, way]),
  )
  const nodesById = new Map(
    elements
      .filter((element) => element.type === 'node' && typeof element.lat === 'number')
      .map((node) => [node.id, [node.lat, node.lon]]),
  )
  const generatedAt = new Date().toISOString()
  const requiredRelations = [
    ...MAJOR_AREAS.map((area) => relationsById.get(area.relationId)),
    ...MAJOR_AREAS.flatMap((area) =>
      area.children.map((relationId) => relationsById.get(relationId)),
    ),
  ].filter(Boolean)
  const wikidataById = await loadWikidataMetadata(requiredRelations)

  const majorFeatures = MAJOR_AREAS.map((definition) => {
    const relation = relationsById.get(definition.relationId)
    if (!relation) throw new Error(`Missing suuralue relation ${definition.relationId}`)
    const { geometry, outerWayIds } = relationGeometry(relation, waysById, nodesById)
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
        ...relationEnrichment(relation, wikidataById),
      },
      geometry,
    }
  }).sort((a, b) =>
    String(a.properties.ref).localeCompare(String(b.properties.ref), undefined, { numeric: true }),
  )

  const majorFeatureById = new Map(
    majorFeatures.map((feature) => [feature.properties.osm_relation_id, feature]),
  )
  const minorFeatures = []

  for (const parent of MAJOR_AREAS) {
    const parentFeature = majorFeatureById.get(parent.relationId)
    if (!parentFeature) throw new Error(`Missing parent feature ${parent.relationId}`)

    for (const relationId of parent.children) {
      const relation = relationsById.get(relationId)
      if (!relation) throw new Error(`Missing pienalue relation ${relationId}`)
      if (relation.tags?.admin_level !== '10') {
        throw new Error(`Relation ${relationId} is no longer admin_level=10`)
      }

      const { geometry, outerWayIds } = relationGeometry(relation, waysById, nodesById)
      if (!geometry) throw new Error(`Could not assemble pienalue relation ${relationId}`)

      minorFeatures.push({
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
          parent_name_fi: parentFeature.properties.name_fi,
          parent_name_en: parentFeature.properties.name_en,
          parent_name_fa: parentFeature.properties.name_fa,
          parent_ref: parentFeature.properties.ref,
          parent_osm_relation_id: parentFeature.properties.osm_relation_id,
          outer_way_ids: outerWayIds,
          source: sourceFor(relation),
          ...relationEnrichment(relation, wikidataById),
        },
        geometry,
      })
    }
  }

  minorFeatures.sort(sortMinorFeatures)

  if (majorFeatures.length !== 12) {
    throw new Error(`Expected 12 suuralue features, generated ${majorFeatures.length}`)
  }
  if (minorFeatures.length !== 55) {
    throw new Error(
      `Expected 55 currently configured OSM pienalue features, generated ${minorFeatures.length}`,
    )
  }

  const metadata = snapshotMetadata(generatedAt, minorFeatures.length, wikidataById.size)
  await mkdir(outputDir, { recursive: true })
  await writeFile(
    resolve(outputDir, 'vaasa-suuralueet.geojson'),
    `${JSON.stringify(featureCollection(majorFeatures, metadata))}\n`,
  )
  await writeFile(
    resolve(outputDir, 'vaasa-pienalueet.geojson'),
    `${JSON.stringify(featureCollection(minorFeatures, metadata))}\n`,
  )
  await writeFile(
    resolve(outputDir, 'boundary-metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
  )

  console.log(
    `Generated ${majorFeatures.length} suuralue and ${minorFeatures.length}/${EXPECTED_PIENALUE_COUNT} pienalue features.`,
  )
}

await main()
