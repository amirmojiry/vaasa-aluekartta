import type {
  ElectionEvent,
  ElectionStatisticsDatabase,
  ResolvedElectionDataset,
} from '@/domain/elections'
import type { AreaLevel } from '@/domain/areas'

const ELECTION_STATISTICS_URL = `${import.meta.env.BASE_URL}data/election-statistics.json`
let databasePromise: Promise<ElectionStatisticsDatabase> | null = null

export async function fetchElectionStatisticsDatabase(): Promise<ElectionStatisticsDatabase> {
  databasePromise ??= fetch(ELECTION_STATISTICS_URL, { cache: 'force-cache' }).then(
    async (response) => {
      if (!response.ok) throw new Error(`Election statistics returned HTTP ${response.status}`)
      const data = (await response.json()) as ElectionStatisticsDatabase
      if (data.schemaVersion !== 1 || !data.areas || !data.parties) {
        throw new Error('Election statistics database has an unsupported schema')
      }
      return data
    },
  )
  return databasePromise
}

function resolveDataset(
  dataset: ElectionStatisticsDatabase['areas'][string] | ElectionStatisticsDatabase['city'],
): ResolvedElectionDataset | null {
  if (!dataset) return null
  return {
    ...dataset,
    events: dataset.events.map((event) => ({
      ...event,
      parties: event.parties.map(([party, votes, percent]) => ({ party, votes, percent })),
    })),
  }
}

export async function fetchAreaElectionStatistics(
  level: AreaLevel,
  areaName: string,
): Promise<ResolvedElectionDataset | null> {
  const database = await fetchElectionStatisticsDatabase()
  return resolveDataset(database.areas[`${level}:${areaName}`])
}

export async function fetchCityElectionStatistics(): Promise<ResolvedElectionDataset | null> {
  const database = await fetchElectionStatisticsDatabase()
  return resolveDataset(database.city)
}

export function featuredElection(dataset: ResolvedElectionDataset): ElectionEvent | null {
  return dataset.events.find((event) => event.id === dataset.featuredLatestId) ?? dataset.events.at(-1) ?? null
}

export function topParties(event: ElectionEvent, count = 3) {
  return [...event.parties].sort((a, b) => b.percent - a.percent).slice(0, count)
}

export function chartParties(dataset: ResolvedElectionDataset, count = 6): string[] {
  const latest = featuredElection(dataset)
  if (!latest) return []
  return topParties(latest, count).map((result) => result.party)
}
