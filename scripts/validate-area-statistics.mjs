import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(scriptDir, '../public/data')

async function readJson(fileName) {
  return JSON.parse(await readFile(resolve(dataDir, fileName), 'utf8'))
}

async function readJsonIfPresent(fileName) {
  try {
    return await readJson(fileName)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
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

function validateDatabase(database) {
  assert(database.schemaVersion === 1, 'Unsupported area statistics schema')
  const databaseKeys = Object.keys(database.areas ?? {})
  assert(new Set(databaseKeys).size === databaseKeys.length, 'Statistics area keys are not unique')
  assert(
    database.coverage?.mappedAreaRecords === databaseKeys.length,
    `Statistics metadata expects ${database.coverage?.mappedAreaRecords} records, but the database contains ${databaseKeys.length}`,
  )

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

  return databaseKeys
}

function validateBoundaryCoverage(database, databaseKeys, major, minor) {
  assert(Array.isArray(major.features), 'Major-area GeoJSON has no features array')
  assert(Array.isArray(minor.features), 'Minor-area GeoJSON has no features array')

  const features = [...major.features, ...minor.features]
  const mappedKeys = features.map((feature) => {
    const level = feature?.properties?.level
    const name = feature?.properties?.name
    assert(level === 'suuralue' || level === 'pienalue', 'Mapped feature has an invalid area level')
    assert(typeof name === 'string' && name.length > 0, 'Mapped feature has no area name')
    return `${level}:${name}`
  })

  assert(new Set(mappedKeys).size === mappedKeys.length, 'Mapped area keys are not unique')
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

  console.log(
    `Boundary join validated: ${major.features.length} major + ${minor.features.length} minor = ${features.length} mapped records.`,
  )
}

async function main() {
  const database = await readJson('area-statistics.json')
  const databaseKeys = validateDatabase(database)
  const [major, minor] = await Promise.all([
    readJsonIfPresent('vaasa-suuralueet.geojson'),
    readJsonIfPresent('vaasa-pienalueet.geojson'),
  ])

  if (major && minor) {
    validateBoundaryCoverage(database, databaseKeys, major, minor)
  } else {
    console.log(
      'Boundary snapshots are not present in this checkout; database integrity validated without the polygon join.',
    )
  }

  console.log(`Area statistics database validated: ${databaseKeys.length} records.`)
}

await main()
