import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const USER_AGENT =
  'vaasa-aluekartta-wikidata-enrichment/1.0 (+https://github.com/amirmojiry/vaasa-aluekartta)'
const scriptDir = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(scriptDir, '../public/data')
const dataFiles = ['vaasa-suuralueet.geojson', 'vaasa-pienalueet.geojson']
const metadataFile = 'boundary-metadata.json'

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

function validWikidataId(value) {
  return typeof value === 'string' && /^Q\d+$/.test(value) ? value : null
}

async function fetchEntities(ids, props, languages = 'fi|en|fa') {
  const search = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props,
    languages,
    format: 'json',
  })
  const response = await fetch(`${WIKIDATA_API}?${search.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  })
  if (!response.ok) throw new Error(`Wikidata API returned HTTP ${response.status}`)
  return response.json()
}

async function fetchEntityMap(ids, props) {
  const entities = new Map()

  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50)
    const response = await fetchEntities(batch, props)
    for (const [id, entity] of Object.entries(response.entities ?? {})) {
      if (!entity?.missing) entities.set(id, entity)
    }
    await sleep(100)
  }

  return entities
}

function externalIdentifierClaims(entity) {
  const identifiers = []
  const seen = new Set()

  for (const [propertyId, claims] of Object.entries(entity?.claims ?? {})) {
    for (const claim of claims ?? []) {
      const snak = claim?.mainsnak
      if (snak?.datatype !== 'external-id') continue
      if (snak?.datavalue?.type !== 'string') continue
      const value = snak.datavalue.value
      if (typeof value !== 'string' || !value) continue

      const key = `${propertyId}:${value}`
      if (seen.has(key)) continue
      seen.add(key)
      identifiers.push({ propertyId, value })
    }
  }

  return identifiers
}

function propertyFormatter(property) {
  const claims = property?.claims?.P1630 ?? []
  const ranked = [...claims].sort((a, b) => {
    const score = { preferred: 2, normal: 1, deprecated: 0 }
    return (score[b?.rank] ?? 0) - (score[a?.rank] ?? 0)
  })

  for (const claim of ranked) {
    const value = claim?.mainsnak?.datavalue?.value
    if (typeof value === 'string' && value.includes('$1')) return value
  }

  return null
}

function formattedIdentifierUrl(formatter, value) {
  if (!formatter) return null
  const url = formatter.replaceAll('$1', encodeURIComponent(value))
  return /^https?:\/\//i.test(url) ? url : null
}

function propertyLabel(property, language) {
  return property?.labels?.[language]?.value ?? null
}

function buildExternalIdentifiers(entity, propertiesById) {
  return externalIdentifierClaims(entity)
    .map(({ propertyId, value }) => {
      const property = propertiesById.get(propertyId)
      return {
        property_id: propertyId,
        value,
        label_fi: propertyLabel(property, 'fi'),
        label_en: propertyLabel(property, 'en'),
        label_fa: propertyLabel(property, 'fa'),
        url: formattedIdentifierUrl(propertyFormatter(property), value),
      }
    })
    .sort((a, b) => {
      const aLabel = a.label_en ?? a.label_fi ?? a.property_id
      const bLabel = b.label_en ?? b.label_fi ?? b.property_id
      return aLabel.localeCompare(bLabel, 'en')
    })
}

function description(entity, language) {
  return entity?.descriptions?.[language]?.value ?? null
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

async function main() {
  const collections = await loadCollections()
  const features = collections.flatMap(({ collection }) => collection.features ?? [])
  const wikidataIds = [
    ...new Set(
      features.map((feature) => validWikidataId(feature?.properties?.wikidata_id)).filter(Boolean),
    ),
  ]

  if (wikidataIds.length === 0) {
    console.log('No Wikidata IDs found in boundary snapshots; enrichment skipped.')
    return
  }

  const entitiesById = await fetchEntityMap(wikidataIds, 'descriptions|claims')
  const propertyIds = [
    ...new Set(
      [...entitiesById.values()].flatMap((entity) =>
        externalIdentifierClaims(entity).map(({ propertyId }) => propertyId),
      ),
    ),
  ]
  const propertiesById =
    propertyIds.length > 0 ? await fetchEntityMap(propertyIds, 'labels|claims') : new Map()

  let descriptionCount = 0
  let identifierCount = 0

  for (const feature of features) {
    const wikidataId = validWikidataId(feature?.properties?.wikidata_id)
    if (!wikidataId) continue
    const entity = entitiesById.get(wikidataId)
    if (!entity) continue

    const descriptions = {
      fi: description(entity, 'fi'),
      en: description(entity, 'en'),
      fa: description(entity, 'fa'),
    }
    const identifiers = buildExternalIdentifiers(entity, propertiesById)

    feature.properties.wikidata_description_fi = descriptions.fi
    feature.properties.wikidata_description_en = descriptions.en
    feature.properties.wikidata_description_fa = descriptions.fa
    feature.properties.external_identifiers = identifiers

    if (descriptions.fi || descriptions.en || descriptions.fa) descriptionCount += 1
    identifierCount += identifiers.length
  }

  const enrichmentMetadata = {
    wikidata_description_count: descriptionCount,
    wikidata_external_identifier_count: identifierCount,
    wikidata_external_property_count: propertyIds.length,
  }

  for (const { path, collection } of collections) {
    collection.metadata = { ...(collection.metadata ?? {}), ...enrichmentMetadata }
    await writeFile(path, `${JSON.stringify(collection)}\n`)
  }

  const metadataPath = resolve(dataDir, metadataFile)
  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    await writeFile(
      metadataPath,
      `${JSON.stringify({ ...metadata, ...enrichmentMetadata }, null, 2)}\n`,
    )
  } catch (error) {
    console.warn(
      `Could not update ${metadataFile}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  console.log(
    `Wikidata enrichment added descriptions for ${descriptionCount}/${features.length} areas and ${identifierCount} external identifiers across ${propertyIds.length} properties.`,
  )
}

try {
  await main()
} catch (error) {
  console.warn(
    `Wikidata technical enrichment skipped: ${error instanceof Error ? error.message : String(error)}`,
  )
}
