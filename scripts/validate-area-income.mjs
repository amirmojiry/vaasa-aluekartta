import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(scriptDir, '../public/data')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function readJson(fileName) {
  return JSON.parse(await readFile(resolve(dataDir, fileName), 'utf8'))
}

async function main() {
  const [income, statistics] = await Promise.all([
    readJson('area-income-2014.json'),
    readJson('area-statistics.json'),
  ])

  assert(income.schemaVersion === 1, 'Unsupported area income schema')
  assert(income.year === 2014, 'Area income reference year must be 2014')
  assert(income.cityAverage === 29119, 'Vaasa-wide 2014 average income must be EUR 29,119')
  assert(
    income.source?.underlyingSource?.includes('Statistics Finland'),
    'Income source is missing',
  )

  const mappedKeys = Object.keys(statistics.areas ?? {})
  const valueKeys = Object.keys(income.areas ?? {})
  const missingKeys = income.missingAreas ?? []
  const coveredKeys = [...valueKeys, ...missingKeys]

  assert(new Set(coveredKeys).size === coveredKeys.length, 'Income keys contain duplicates')
  assert(
    income.coverage?.mappedAreaRecords === mappedKeys.length,
    'Income coverage does not match mapped area statistics records',
  )
  assert(income.coverage?.values === valueKeys.length, 'Income value coverage is incorrect')
  assert(income.coverage?.missing === missingKeys.length, 'Income missing coverage is incorrect')
  assert(coveredKeys.length === mappedKeys.length, 'Income data does not cover every mapped area')

  const mappedSet = new Set(mappedKeys)
  for (const key of coveredKeys) {
    assert(mappedSet.has(key), `Income data contains unmapped area ${key}`)
  }
  for (const key of mappedKeys) {
    assert(coveredKeys.includes(key), `Income data is missing mapped area ${key}`)
  }

  for (const [key, value] of Object.entries(income.areas)) {
    assert(Number.isInteger(value) && value > 0, `${key} income must be a positive integer`)
  }

  assert(
    missingKeys.length === 1 && missingKeys[0] === 'pienalue:Sundomin saaristo',
    'Only Sundomin saaristo should be marked as lacking a usable income value',
  )

  const majorValues = Object.entries(income.areas).filter(([key]) => key.startsWith('suuralue:'))
  const minorValues = Object.entries(income.areas).filter(([key]) => key.startsWith('pienalue:'))
  assert(majorValues.length === 12, 'Income data must include all 12 major areas')
  assert(minorValues.length === 54, 'Income data must include 54 minor-area values')

  console.log(
    `Area income validated: ${majorValues.length} major + ${minorValues.length} minor values, ${missingKeys.length} mapped area without a usable value.`,
  )
}

await main()
