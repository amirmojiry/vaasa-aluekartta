import type { AreaLevel } from '@/domain/areas'
import type { AreaIncomeDatabase, AreaIncomeRecord } from '@/domain/income'

const AREA_INCOME_URL = `${import.meta.env.BASE_URL}data/area-income-2014.json`

let databasePromise: Promise<AreaIncomeDatabase> | null = null

export function areaIncomeKey(level: AreaLevel, areaName: string): string {
  return `${level}:${areaName}`
}

export function areaIncomeRank(
  database: AreaIncomeDatabase,
  level: AreaLevel,
  areaName: string,
): { rank: number; total: number } | null {
  const key = areaIncomeKey(level, areaName)
  const value = database.areas[key]
  if (value === undefined) return null

  const prefix = `${level}:`
  const peerValues = Object.entries(database.areas)
    .filter(([peerKey]) => peerKey.startsWith(prefix))
    .map(([, peerValue]) => peerValue)

  return {
    rank: peerValues.filter((peerValue) => peerValue > value).length + 1,
    total: peerValues.length,
  }
}

export function incomeDifferencePercent(value: number, cityAverage: number): number {
  return ((value - cityAverage) / cityAverage) * 100
}

async function loadAreaIncomeDatabase(): Promise<AreaIncomeDatabase> {
  databasePromise ??= fetch(AREA_INCOME_URL, { cache: 'no-cache' }).then(async (response) => {
    if (!response.ok) throw new Error(`Area income data returned HTTP ${response.status}`)
    const data = (await response.json()) as AreaIncomeDatabase
    if (data.schemaVersion !== 1 || !data.areas || !data.source) {
      throw new Error('Area income database has an unsupported schema')
    }
    return data
  })

  return databasePromise
}

export async function fetchAreaIncome(
  level: AreaLevel,
  areaName: string,
): Promise<AreaIncomeRecord | null> {
  const database = await loadAreaIncomeDatabase()
  const value = database.areas[areaIncomeKey(level, areaName)]
  if (value === undefined) return null

  const rank = areaIncomeRank(database, level, areaName)
  if (!rank) return null

  return {
    level,
    name: areaName,
    value,
    year: database.year,
    cityAverage: database.cityAverage,
    rank: rank.rank,
    rankTotal: rank.total,
    source: database.source,
  }
}

export async function fetchAreaIncomeDatabase(): Promise<AreaIncomeDatabase> {
  return loadAreaIncomeDatabase()
}
