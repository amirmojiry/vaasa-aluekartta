import type {
  MajorAreaPopulationHistory,
  MajorAreaPopulationHistoryDatabase,
  PopulationChange,
  PopulationObservation,
  PopulationRank,
} from '@/domain/populationHistory'

const POPULATION_HISTORY_URL = `${import.meta.env.BASE_URL}data/major-area-population-history.json`

let databasePromise: Promise<MajorAreaPopulationHistoryDatabase> | null = null

function decodeObservations(values: [number, number][]): PopulationObservation[] {
  return values.map(([year, population]) => ({ year, population }))
}

export async function fetchMajorAreaPopulationHistoryDatabase(): Promise<MajorAreaPopulationHistoryDatabase> {
  databasePromise ??= fetch(POPULATION_HISTORY_URL, { cache: 'force-cache' }).then(
    async (response) => {
      if (!response.ok) throw new Error(`Population history returned HTTP ${response.status}`)
      const data = (await response.json()) as MajorAreaPopulationHistoryDatabase
      if (data.schemaVersion !== 1 || !data.areas) {
        throw new Error('Population history database has an unsupported schema')
      }
      return data
    },
  )

  return databasePromise
}

export async function fetchMajorAreaPopulationHistory(
  areaName: string,
): Promise<MajorAreaPopulationHistory | null> {
  const database = await fetchMajorAreaPopulationHistoryDatabase()
  const values = database.areas[areaName]
  return values ? { name: areaName, observations: decodeObservations(values) } : null
}

export function latestPopulationChange(
  history: MajorAreaPopulationHistory,
): PopulationChange | null {
  const current = history.observations.at(-1)
  if (!current) return null
  const previous = history.observations.at(-2) ?? null
  const percent =
    previous && previous.population > 0
      ? ((current.population - previous.population) / previous.population) * 100
      : null
  return { current, previous, percent }
}

export function majorAreaPopulationRank(
  database: MajorAreaPopulationHistoryDatabase,
  areaName: string,
): PopulationRank | null {
  const selected = database.areas[areaName]?.at(-1)
  if (!selected) return null

  const [year, population] = selected
  const comparable = Object.values(database.areas)
    .map((observations) => observations.at(-1))
    .filter((observation): observation is [number, number] => Boolean(observation))
    .filter(([observationYear]) => observationYear === year)
    .map(([, value]) => value)

  return {
    rank: comparable.filter((value) => value > population).length + 1,
    total: comparable.length,
    population,
    year,
  }
}
