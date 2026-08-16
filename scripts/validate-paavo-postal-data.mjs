import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const CURRENT_PATH = resolve('public/data/paavo-postal-areas.geojson')
const HISTORY_PATH = resolve('public/data/paavo-postal-history.json')

function fail(message) {
  throw new Error(`Paavo snapshot validation failed: ${message}`)
}

const current = JSON.parse(await readFile(CURRENT_PATH, 'utf8'))
const history = JSON.parse(await readFile(HISTORY_PATH, 'utf8'))

if (current.type !== 'FeatureCollection' || !Array.isArray(current.features)) {
  fail('current snapshot is not a GeoJSON FeatureCollection')
}
if (current.features.length < 5)
  fail(`unexpectedly low postal area count: ${current.features.length}`)

const codes = new Set()
for (const feature of current.features) {
  const properties = feature?.properties ?? {}
  if (!/^\d{5}$/.test(properties.code ?? '')) fail(`invalid postal code ${properties.code}`)
  if (codes.has(properties.code)) fail(`duplicate postal code ${properties.code}`)
  codes.add(properties.code)
  if (!feature.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
    fail(`missing geometry for ${properties.code}`)
  }
  if (properties.statistics_year !== current.metadata?.statistics_year) {
    fail(`statistics year mismatch for ${properties.code}`)
  }
  for (const key of ['employed_share', 'unemployed_share', 'student_share']) {
    const value = properties[key]
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
      fail(`${key} is outside 0-100 for ${properties.code}`)
    }
  }
}

if (!Array.isArray(history.years) || history.years.length < 2) fail('historical years are missing')
if (!history.areas || typeof history.areas !== 'object') fail('historical area map is missing')
if (history.latest_statistics_year !== current.metadata?.statistics_year) {
  fail('current and historical latest statistics years differ')
}

for (const code of codes) {
  const observations = history.areas[code]
  if (!Array.isArray(observations) || observations.length === 0) {
    fail(`no history for current postal code ${code}`)
  }
  for (let index = 1; index < observations.length; index += 1) {
    if (observations[index].year <= observations[index - 1].year) {
      fail(`history is not strictly increasing for ${code}`)
    }
  }
}

console.log(
  `Paavo snapshots validated: ${current.features.length} current postal areas, ${history.years.length} historical years (${history.years[0]}-${history.years.at(-1)}).`,
)
