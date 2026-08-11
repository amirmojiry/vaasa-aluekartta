import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CATEGORIES = ['attractions', 'supermarkets', 'police', 'healthcare', 'libraries']
const scriptDir = dirname(fileURLToPath(import.meta.url))
const poiPath = resolve(scriptDir, '../public/data/vaasa-pois.geojson')

const data = JSON.parse(await readFile(poiPath, 'utf8'))
if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
  throw new Error('POI snapshot must be a GeoJSON FeatureCollection')
}

const ids = new Set()
const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]))

for (const [index, feature] of data.features.entries()) {
  if (feature?.type !== 'Feature' || feature.geometry?.type !== 'Point') {
    throw new Error(`POI feature ${index} is not a Point feature`)
  }

  const [longitude, latitude] = feature.geometry.coordinates ?? []
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error(`POI feature ${index} has invalid coordinates`)
  }

  const { id, category, name, osmType, osmId } = feature.properties ?? {}
  if (typeof id !== 'string' || !id) throw new Error(`POI feature ${index} has no stable id`)
  if (ids.has(id)) throw new Error(`Duplicate POI id: ${id}`)
  ids.add(id)

  if (!CATEGORIES.includes(category)) throw new Error(`Unknown POI category: ${category}`)
  counts[category] += 1
  if (typeof name !== 'string' || !name.trim()) throw new Error(`POI ${id} has no name`)
  if (!['node', 'way', 'relation'].includes(osmType) || !Number.isInteger(osmId)) {
    throw new Error(`POI ${id} has invalid OSM source identifiers`)
  }
}

for (const category of CATEGORIES) {
  if (counts[category] < 1) throw new Error(`POI snapshot has no ${category} features`)
}

if (data.source?.licence !== 'ODbL 1.0') {
  throw new Error('POI snapshot must retain the ODbL 1.0 licence metadata')
}

console.log(`Validated ${data.features.length} POIs: ${JSON.stringify(counts)}`)
