import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const USER_AGENT =
  'vaasa-aluekartta-wikipedia-localization/1.0 (+https://github.com/amirmojiry/vaasa-aluekartta)'
const scriptDir = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(scriptDir, '../public/data')
const dataFiles = ['vaasa-suuralueet.geojson', 'vaasa-pienalueet.geojson']

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

function validWikidataId(value) {
  return typeof value === 'string' && /^Q\d+$/.test(value) ? value : null
}

function wikipediaUrl(language, title) {
  if (!title) return null
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

async function fetchEntities(ids) {
  const entities = new Map()

  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50)
    const search = new URLSearchParams({
      action: 'wbgetentities',
      ids: batch.join('|'),
      props: 'labels|sitelinks',
      languages: 'fi|fa',
      sitefilter: 'fiwiki|fawiki',
      format: 'json',
    })
    const response = await fetch(`${WIKIDATA_API}?${search.toString()}`, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    })
    if (!response.ok) throw new Error(`Wikidata API returned HTTP ${response.status}`)

    const payload = await response.json()
    for (const [id, entity] of Object.entries(payload.entities ?? {})) {
      if (!entity?.missing) entities.set(id, entity)
    }
    await sleep(100)
  }

  return entities
}

async function loadCollections() {
  return Promise.all(
    dataFiles.map(async (fileName) => {
      const path = resolve(dataDir, fileName)
      const collection = JSON.parse(await readFile(path, 'utf8'))
      return { fileName, path, collection }
    }),
  )
}

function areaSummary(feature) {
  const properties = feature.properties ?? {}
  return {
    level: properties.level ?? 'unknown',
    ref: properties.ref ?? '',
    name: properties.name_fi ?? properties.name ?? '',
    nameFa: properties.name_fa ?? null,
    wikidataId: properties.wikidata_id ?? null,
    wikipediaFi: properties.wikipedia_fi ?? null,
    wikipediaFa: properties.wikipedia_fa ?? null,
  }
}

function sortAreas(a, b) {
  const levelOrder = String(a.level).localeCompare(String(b.level))
  if (levelOrder !== 0) return levelOrder
  const refOrder = String(a.ref).localeCompare(String(b.ref), undefined, { numeric: true })
  if (refOrder !== 0) return refOrder
  return String(a.name).localeCompare(String(b.name), 'fi')
}

async function main() {
  const collections = await loadCollections()
  const features = collections.flatMap(({ collection }) => collection.features ?? [])
  const wikidataIds = [
    ...new Set(
      features.map((feature) => validWikidataId(feature?.properties?.wikidata_id)).filter(Boolean),
    ),
  ]
  const entitiesById = await fetchEntities(wikidataIds)

  const newlyAvailablePersian = []
  let linkUpdates = 0
  let nameUpdates = 0

  for (const feature of features) {
    const properties = feature.properties ?? {}
    const wikidataId = validWikidataId(properties.wikidata_id)
    const entity = wikidataId ? entitiesById.get(wikidataId) : null
    if (!entity) continue

    const finnishTitle = entity?.sitelinks?.fiwiki?.title ?? null
    const persianTitle = entity?.sitelinks?.fawiki?.title ?? null

    if (finnishTitle) {
      const finnishUrl = wikipediaUrl('fi', finnishTitle)
      if (finnishUrl && properties.wikipedia_fi !== finnishUrl) {
        properties.wikipedia_fi = finnishUrl
        linkUpdates += 1
      }
    }

    if (!persianTitle) continue

    const persianUrl = wikipediaUrl('fa', persianTitle)
    const hadPersianLink = Boolean(properties.wikipedia_fa)
    if (persianUrl && properties.wikipedia_fa !== persianUrl) {
      properties.wikipedia_fa = persianUrl
      linkUpdates += 1
    }

    const persianName = entity?.labels?.fa?.value ?? persianTitle
    if (persianName && properties.name_fa !== persianName) {
      properties.name_fa = persianName
      nameUpdates += 1
    }

    if (!hadPersianLink && properties.wikipedia_fa) {
      newlyAvailablePersian.push(areaSummary(feature))
    }
  }

  const majorPersianNames = new Map(
    features
      .filter((feature) => feature?.properties?.level === 'suuralue')
      .map((feature) => [feature.properties.slug, feature.properties.name_fa ?? null]),
  )

  for (const feature of features) {
    const properties = feature.properties ?? {}
    if (properties.level !== 'pienalue' || !properties.parent_slug) continue
    const parentNameFa = majorPersianNames.get(properties.parent_slug)
    if (parentNameFa && properties.parent_name_fa !== parentNameFa) {
      properties.parent_name_fa = parentNameFa
      nameUpdates += 1
    }
  }

  const remainingFinnishOnly = features
    .filter((feature) => feature?.properties?.wikipedia_fi && !feature?.properties?.wikipedia_fa)
    .map(areaSummary)
    .sort(sortAreas)

  for (const { path, collection } of collections) {
    collection.metadata = {
      ...(collection.metadata ?? {}),
      wikipedia_localization_checked_at: new Date().toISOString(),
      wikipedia_persian_link_count: features.filter((feature) => feature?.properties?.wikipedia_fa)
        .length,
      wikipedia_finnish_only_count: remainingFinnishOnly.length,
    }
    await writeFile(path, `${JSON.stringify(collection)}\n`)
  }

  console.log(`Checked ${features.length} Vaasa area records against current Wikidata sitelinks.`)
  console.log(`Updated ${linkUpdates} Wikipedia link fields and ${nameUpdates} Persian name fields.`)

  if (newlyAvailablePersian.length > 0) {
    console.log('Persian Wikipedia pages newly available relative to the committed snapshot:')
    for (const area of newlyAvailablePersian.sort(sortAreas)) {
      console.log(`- ${area.level} ${area.ref} ${area.name} -> ${area.nameFa} (${area.wikipediaFa})`)
    }
  } else {
    console.log('No newly available Persian Wikipedia pages were found relative to the committed snapshot.')
  }

  if (remainingFinnishOnly.length > 0) {
    console.log('Areas that still have Finnish Wikipedia but no Persian Wikipedia:')
    for (const area of remainingFinnishOnly) {
      console.log(`- ${area.level} ${area.ref} ${area.name} [${area.wikidataId ?? 'no Wikidata ID'}]`)
    }
  } else {
    console.log('Every area with a Finnish Wikipedia page also has a Persian Wikipedia page.')
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
