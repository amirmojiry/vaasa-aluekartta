import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'vaasa-aluekartta-poi-snapshot/1.0 (+https://github.com/amirmojiry/vaasa-aluekartta)'
const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDir, '../public/data/vaasa-pois.geojson')

const query = `[out:json][timeout:90];
area["boundary"="administrative"]["admin_level"="8"]["name"="Vaasa"]->.vaasa;
(
  nwr(area.vaasa)["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|aquarium|theme_park)$"]["name"];
  nwr(area.vaasa)["shop"="supermarket"]["name"];
  nwr(area.vaasa)["amenity"="police"]["name"];
  nwr(area.vaasa)["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]["name"];
  nwr(area.vaasa)["healthcare"~"^(hospital|clinic|doctor|pharmacy)$"]["name"];
  nwr(area.vaasa)["amenity"="library"]["name"];
);
out center tags qt;`

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

async function fetchOverpass() {
  let lastError
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': USER_AGENT,
        },
        body: new URLSearchParams({ data: query }),
      })
      if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data.elements)) throw new Error('Overpass response has no elements array')
      return data.elements
    } catch (error) {
      lastError = error
      if (attempt < 4) await sleep(attempt * 2500)
    }
  }
  throw lastError
}

function categoryFor(tags) {
  if (tags.shop === 'supermarket') return 'supermarkets'
  if (tags.amenity === 'police') return 'police'
  if (tags.amenity === 'library') return 'libraries'
  if (
    ['hospital', 'clinic', 'doctors', 'pharmacy'].includes(tags.amenity) ||
    ['hospital', 'clinic', 'doctor', 'pharmacy'].includes(tags.healthcare)
  ) {
    return 'healthcare'
  }
  if (
    ['attraction', 'museum', 'gallery', 'viewpoint', 'zoo', 'aquarium', 'theme_park'].includes(
      tags.tourism,
    )
  ) {
    return 'attractions'
  }
  return null
}

function coordinatesFor(element) {
  if (Number.isFinite(element.lon) && Number.isFinite(element.lat)) {
    return [element.lon, element.lat]
  }
  if (Number.isFinite(element.center?.lon) && Number.isFinite(element.center?.lat)) {
    return [element.center.lon, element.center.lat]
  }
  return null
}

function addressFor(tags) {
  const street = tags['addr:street']
  const number = tags['addr:housenumber']
  const city = tags['addr:city']
  const streetAddress = [street, number].filter(Boolean).join(' ')
  return [streetAddress, city].filter(Boolean).join(', ') || undefined
}

function featureFor(element) {
  const tags = element.tags ?? {}
  const category = categoryFor(tags)
  const coordinates = coordinatesFor(element)
  if (!category || !coordinates || !tags.name) return null

  const properties = {
    id: `${element.type}/${element.id}`,
    category,
    name: tags.name,
    osmType: element.type,
    osmId: element.id,
  }
  const names = {
    fi: tags['name:fi'],
    sv: tags['name:sv'],
    en: tags['name:en'],
  }
  if (Object.values(names).some(Boolean)) properties.names = names

  const website = tags.website || tags['contact:website']
  if (website) properties.website = website
  if (tags.opening_hours) properties.openingHours = tags.opening_hours
  if (tags.operator) properties.operator = tags.operator
  const address = addressFor(tags)
  if (address) properties.address = address

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties,
  }
}

function buildFeatureCollection(elements) {
  const featuresById = new Map()
  for (const element of elements) {
    const feature = featureFor(element)
    if (feature) featuresById.set(feature.properties.id, feature)
  }

  const features = [...featuresById.values()].sort((left, right) => {
    const categoryOrder = left.properties.category.localeCompare(right.properties.category)
    if (categoryOrder !== 0) return categoryOrder
    const nameOrder = left.properties.name.localeCompare(right.properties.name, 'fi')
    if (nameOrder !== 0) return nameOrder
    return left.properties.id.localeCompare(right.properties.id)
  })

  if (features.length < 5) {
    throw new Error(`POI snapshot unexpectedly contains only ${features.length} features`)
  }

  return {
    type: 'FeatureCollection',
    generatedAt: new Date().toISOString(),
    source: {
      label: 'OpenStreetMap contributors via Overpass API',
      url: 'https://www.openstreetmap.org/copyright',
      licence: 'ODbL 1.0',
    },
    features,
  }
}

const elements = await fetchOverpass()
const collection = buildFeatureCollection(elements)
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(collection)}\n`, 'utf8')

const counts = Object.groupBy(collection.features, (feature) => feature.properties.category)
console.log(`Wrote ${collection.features.length} Vaasa POIs to ${outputPath}`)
for (const [category, features] of Object.entries(counts)) {
  console.log(`- ${category}: ${features.length}`)
}
