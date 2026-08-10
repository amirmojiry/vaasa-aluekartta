import type { AreaLevel } from '@/domain/areas'
import type { AreaStatisticRecord, AreaStatisticsDatabase } from '@/domain/statistics'

const STATISTICS_DATA_URL = `${import.meta.env.BASE_URL}data/area-statistics.json`

let databasePromise: Promise<AreaStatisticsDatabase> | null = null

function statisticsKey(level: AreaLevel, areaName: string): string {
  return `${level}:${areaName}`
}

async function loadStatisticsDatabase(): Promise<AreaStatisticsDatabase> {
  databasePromise ??= fetch(STATISTICS_DATA_URL, { cache: 'force-cache' }).then(async (response) => {
    if (!response.ok) throw new Error(`Area statistics returned HTTP ${response.status}`)
    const data = (await response.json()) as AreaStatisticsDatabase
    if (data.schemaVersion !== 1 || !data.areas) {
      throw new Error('Area statistics database has an unsupported schema')
    }
    return data
  })

  return databasePromise
}

export async function fetchAreaStatistics(
  level: AreaLevel,
  areaName: string,
): Promise<AreaStatisticRecord | null> {
  const database = await loadStatisticsDatabase()
  const compact = database.areas[statisticsKey(level, areaName)]
  if (!compact) return null

  const [finnish, swedish, other] = compact.l
  return {
    level,
    name: areaName,
    population2015: compact.p,
    studentShare2013: compact.s,
    unemployment2013: compact.u,
    employedShare2013: compact.e,
    language2015: { finnish, swedish, other },
  }
}

export async function fetchStatisticsDatabase(): Promise<AreaStatisticsDatabase> {
  return loadStatisticsDatabase()
}
