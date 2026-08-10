import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(scriptDir, '../public/data')

async function readJson(fileName) {
  return JSON.parse(await readFile(resolve(dataDir, fileName), 'utf8'))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertPercent(value, label) {
  assert(
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100,
    `${label} must be a percentage between 0 and 100`,
  )
}

async function main() {
  const [major, minor, database] = await Promise.all([
    readJson('vaasa-suuralueet.geojson'),
    readJson('vaasa-pienalueet.geojson'),
    readJson('area-statistics.json'),
  ])

  assert(database.schemaVersion === 1, 'Unsupported area statistics schema')
  assert(Array.isArray(major.features), 'Major-area GeoJSON has no features array')
  assert(Array.isArray(minor.features), 'Minor-area GeoJSON has no features array')

  const features = [...major.features, ...minor.features]
  const databaseKeys = Object.keys(database.areas ?? {})
  const mappedKeys = features.map((feature) => {
    const level = feature?.properties?.level
    const name = feature?.properties?.name
    assert(level === 'suuralue' || level === 'pienalue', 'Mapped feature has an invalid area level')
    assert(typeof name === 'string' && name.length > 0, 'Mapped feature has no area name')
    return `${level}:${name}`
  })

  assert(new Set(mappedKeys).size === mappedKeys.length, 'Mapped area keys are not unique')
  assert(new Set(databaseKeys).size === databaseKeys.length, 'Statistics area keys are not unique')
  assert(
    database.coverage?.mappedAreaRecords === features.length,
    `Statistics metadata expects ${database.coverage?.mappedAreaRecords} mapped areas, but GeoJSON contains ${features.length}`,
  )
  assert(
    databaseKeys.length === mappedKeys.length,
    `Statistics contains ${databaseKeys.length} area records, but GeoJSON contains ${mappedKeys.length}`,
  )

  const mappedKeySet = new Set(mappedKeys)
  for (const key of mappedKeys) {
    assert(database.areas[key], `Missing statistics for mapped area ${key}`)
  }
  for (const key of databaseKeys) {
    assert(mappedKeySet.has(key), `Statistics contains an unmapped area ${key}`)
  }

  for (const [key, record] of Object.entries(database.areas)) {
    assert(
      Number.isInteger(record.p) && record.p > 0,
      `${key} population must be a positive integer`,
    )
    assertPercent(record.s, `${key} student share`)
    assertPercent(record.u, `${key} unemployment share`)
    assertPercent(record.e, `${key} employed share`)
    assert(
      Math.abs(record.e + record.u - 100) <= 0.05,
      `${key} employed and unemployment shares must add to 100`,
    )
    assert(Array.isArray(record.l) && record.l.length === 3, `${key} language shares are invalid`)
    record.l.forEach((value, index) => assertPercent(value, `${key} language share ${index + 1}`))
    assert(
      Math.abs(record.l.reduce((sum, value) => sum + value, 0) - 100) <= 0.2,
      `${key} language shares must add to approximately 100`,
    )
  }

  console.log(
    `Area statistics validated: ${major.features.length} major + ${minor.features.length} minor = ${features.length} mapped records.`,
  )
}

await main()
