import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OVERPASS_URLS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const USER_AGENT =
  'vaasa-aluekartta-poi-snapshot/1.0 (+https://github.com/amirmojiry/vaasa-aluekartta)'
const REQUEST_TIMEOUT_MS = 45_000
const scriptDir = dirname(fileURLToPath(import.meta.url))
const boundaryPath = resolve(scriptDir, '../public/data/vaasa-suuralueet.geojson')
const outputPath = resolve(scriptDir, '../public/data/vaasa-pois.geojson')

const sleep = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

function geometryRings(geometry) {
  if (geometry?.type === 'Polygon') return geometry.coordinates ?? []
  if (geometry?.type === 'MultiPolygon') {
    return (geometry.coordinates ?? []).flatMap((polygon) => polygon)
  }
  return []
}

async function loadVaasaBoundaries() {
  let raw
  try {
    raw = await readFile(boundaryPath, 'utf8')
  } catch {
    throw new Error(
      'Vaasa boundary snapshot is missing. Generate boundaries before refreshing POIs.',
    )
  }

  const collection = JSON.parse(raw)
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error('Vaasa boundary snapshot is not a GeoJSON FeatureCollection')
  }

  const features = collection.features.filter(
    (feature) => geometryRings(feature.geometry).length > 0,
  )
  if (features.length !== 12) {
    throw new Error(`Expected 12 Vaasa major-area boundaries, found ${features.length}`)
  }
  return features
}

function boundaryBoundingBox(features) {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const feature of features) {
    for (const ring of geometryRings(feature.geometry)) {
      for (const coordinate of ring) {
        const [longitude, latitude] = coordinate
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue
        west = Math.min(west, longitude)
        south = Math.min(south, latitude)
        east = Math.max(east, longitude)
        north = Math.max(north, latitude)
      }
    }
  }

  if (![west, south, east, north].every(Number.isFinite)) {
    throw new Error('Could not calculate a bounding box from Vaasa boundaries')
  }
  return { west, south, east, north }
}

function overpassQuery({ west, south, east, north }) {
  const bbox = `${south},${west},${north},${east}`
  return `[out:json][timeout:40];
(
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|aquarium|theme_park)$"]["name"](${bbox});
  nwr["shop"="supermarket"]["name"](${bbox});
  nwr["amenity"="police"]["name"](${bbox});
  nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]["name"](${bbox});
  nwr["healthcare"~"^(hospital|clinic|doctor|pharmacy)$"]["name"](${bbox});
  nwr["amenity"="library"]["name"](${bbox});
  nwr["amenity"~"^(university|college)$"]["name"](${bbox});
  nwr["amenity"="school"]["name"](${bbox});
  nwr["amenity"~"^(kindergarten|childcare)$"]["name"](${bbox});
  nwr["railway"~"^(station|halt)$"]["name"](${bbox});
  nwr["aeroway"="aerodrome"]["name"](${bbox});
  nwr["highway"="bus_stop"]["name"](${bbox});
  nwr["amenity"="bus_station"]["name"](${bbox});
  nwr["public_transport"="platform"]["bus"="yes"]["name"](${bbox});
  nwr["amenity"="restaurant"]["name"](${bbox});
  nwr["amenity"="cafe"]["name"](${bbox});
  nwr["leisure"~"^(park|playground)$"]["name"](${bbox});
  nwr["leisure"~"^(sports_centre|fitness_centre|stadium|swimming_pool|pitch)$"]["name"](${bbox});
  nwr["shop"~"^(convenience|mall|department_store)$"]["name"](${bbox});
  nwr["amenity"="marketplace"]["name"](${bbox});
  nwr["amenity"~"^(bank|atm)$"](${bbox});
  nwr["amenity"~"^(post_office|parcel_locker)$"](${bbox});
  nwr["amenity"~"^(fuel|charging_station)$"](${bbox});
);
out center tags qt;`
}

async function fetchOverpass(query) {
  let lastError
  const attempts = OVERPASS_URLS.length * 2

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const endpoint = OVERPASS_URLS[attempt % OVERPASS_URLS.length]
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': USER_AGENT,
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`${endpoint} returned HTTP ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data.elements)) throw new Error('Overpass response has no elements array')
      return data.elements
    } catch (error) {
      lastError = error
      if (attempt + 1 < attempts) await sleep((attempt + 1) * 1500)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError
}

function categoryFor(tags) {
  if (tags.shop === 'supermarket') return 'supermarkets'
  if (tags.amenity === 'police') return 'police'
  if (tags.amenity === 'library') return 'libraries'
  if (['university', 'college'].includes(tags.amenity)) return 'universities'
  if (tags.amenity === 'school') return 'schools'
  if (['kindergarten', 'childcare'].includes(tags.amenity)) return 'daycare'
  if (['station', 'halt'].includes(tags.railway)) return 'train-stations'
  if (tags.aeroway === 'aerodrome') return 'airports'
  if (
    tags.highway === 'bus_stop' ||
    tags.amenity === 'bus_station' ||
    (tags.public_transport === 'platform' && tags.bus === 'yes')
  ) {
    return 'bus-stops'
  }
  if (tags.amenity === 'restaurant') return 'restaurants'
  if (tags.amenity === 'cafe') return 'cafes'
  if (['park', 'playground'].includes(tags.leisure)) return 'parks-playgrounds'
  if (
    ['sports_centre', 'fitness_centre', 'stadium', 'swimming_pool', 'pitch'].includes(tags.leisure)
  ) {
    return 'sports'
  }
  if (
    ['convenience', 'mall', 'department_store'].includes(tags.shop) ||
    tags.amenity === 'marketplace'
  ) {
    return 'shopping'
  }
  if (['bank', 'atm'].includes(tags.amenity)) return 'banking'
  if (['post_office', 'parcel_locker'].includes(tags.amenity)) return 'post-services'
  if (['fuel', 'charging_station'].includes(tags.amenity)) return 'fuel-charging'
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

function fallbackName(tags) {
  if (tags.amenity === 'atm') return 'Pankkiautomaatti'
  if (tags.amenity === 'bank') return 'Pankki'
  if (tags.amenity === 'post_office') return 'Posti'
  if (tags.amenity === 'parcel_locker') return 'Pakettiautomaatti'
  if (tags.amenity === 'fuel') return 'Huoltoasema'
  if (tags.amenity === 'charging_station') return 'Sähköauton latausasema'
  return undefined
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

function pointInRing([longitude, latitude], ring) {
  let inside = false
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const [currentLongitude, currentLatitude] = ring[index]
    const [previousLongitude, previousLatitude] = ring[previous]
    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude
    if (intersects) inside = !inside
  }
  return inside
}

function pointInGeometry(coordinates, geometry) {
  if (geometry?.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates ?? []
    return Boolean(
      outer &&
      pointInRing(coordinates, outer) &&
      !holes.some((ring) => pointInRing(coordinates, ring)),
    )
  }
  if (geometry?.type === 'MultiPolygon') {
    return (geometry.coordinates ?? []).some(([outer, ...holes]) =>
      Boolean(
        outer &&
        pointInRing(coordinates, outer) &&
        !holes.some((ring) => pointInRing(coordinates, ring)),
      ),
    )
  }
  return false
}

function isInsideVaasa(coordinates, boundaries) {
  return boundaries.some((feature) => pointInGeometry(coordinates, feature.geometry))
}

function addressFor(tags) {
  const street = tags['addr:street']
  const number = tags['addr:housenumber']
  const city = tags['addr:city']
  const streetAddress = [street, number].filter(Boolean).join(' ')
  return [streetAddress, city].filter(Boolean).join(', ') || undefined
}

function featureFor(element, boundaries) {
  const tags = element.tags ?? {}
  const category = categoryFor(tags)
  const coordinates = coordinatesFor(element)
  const name = tags.name || tags.brand || tags.operator || fallbackName(tags)
  if (!category || !coordinates || !name || !isInsideVaasa(coordinates, boundaries)) return null

  const properties = {
    id: `${element.type}/${element.id}`,
    category,
    name,
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

function buildFeatureCollection(elements, boundaries) {
  const featuresById = new Map()
  for (const element of elements) {
    const feature = featureFor(element, boundaries)
    if (feature) featuresById.set(feature.properties.id, feature)
  }

  const features = [...featuresById.values()].sort((left, right) => {
    const categoryOrder = left.properties.category.localeCompare(right.properties.category)
    if (categoryOrder !== 0) return categoryOrder
    const nameOrder = left.properties.name.localeCompare(right.properties.name, 'fi')
    if (nameOrder !== 0) return nameOrder
    return left.properties.id.localeCompare(right.properties.id)
  })

  if (features.length < 19) {
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

const boundaries = await loadVaasaBoundaries()
const bbox = boundaryBoundingBox(boundaries)
const elements = await fetchOverpass(overpassQuery(bbox))
const collection = buildFeatureCollection(elements, boundaries)
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(collection)}\n`, 'utf8')

const counts = Object.groupBy(collection.features, (feature) => feature.properties.category)
console.log(`Wrote ${collection.features.length} Vaasa POIs to ${outputPath}`)
for (const [category, features] of Object.entries(counts)) {
  console.log(`- ${category}: ${features.length}`)
}
