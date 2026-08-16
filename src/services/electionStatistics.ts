import type {
  ElectionEvent,
  ElectionStatisticsDatabase,
  ResolvedElectionDataset,
} from '@/domain/elections'
import type { AreaLevel } from '@/domain/areas'

const ELECTION_STATISTICS_URL = `${import.meta.env.BASE_URL}data/election-statistics.json`
let databasePromise: Promise<ElectionStatisticsDatabase> | null = null

const PARTY_COLORS: Record<string, string> = {
  RKP: '#d6a900',
  SDP: '#c4454d',
  KOK: '#356f9f',
  PS: '#9b7a15',
  VIHR: '#4f8b57',
  VAS: '#a64d6d',
  KESK: '#5d8a65',
  KD: '#6f6aa8',
  LIIK: '#5f7780',
  LIB: '#85735b',
  VL: '#6b6b6b',
  VKK: '#7c625f',
  PIR: '#765987',
  KRIP: '#8b6d7a',
}

export interface PartyWikipediaLinks {
  en?: string
  fa?: string
  fi?: string
}

const PARTY_WIKIPEDIA: Record<string, PartyWikipediaLinks> = {
  RKP: {
    en: 'https://en.wikipedia.org/wiki/Swedish_People%27s_Party_of_Finland',
    fa: 'https://fa.wikipedia.org/wiki/حزب_سوئدی‌های_فنلاند',
    fi: 'https://fi.wikipedia.org/wiki/Suomen_ruotsalainen_kansanpuolue',
  },
  SDP: {
    en: 'https://en.wikipedia.org/wiki/Social_Democratic_Party_of_Finland',
    fa: 'https://fa.wikipedia.org/wiki/حزب_سوسیال_دموکرات_فنلاند',
    fi: 'https://fi.wikipedia.org/wiki/Suomen_Sosialidemokraattinen_Puolue',
  },
  KOK: {
    en: 'https://en.wikipedia.org/wiki/National_Coalition_Party',
    fa: 'https://fa.wikipedia.org/wiki/حزب_ائتلاف_ملی',
    fi: 'https://fi.wikipedia.org/wiki/Kansallinen_Kokoomus',
  },
  PS: {
    en: 'https://en.wikipedia.org/wiki/Finns_Party',
    fa: 'https://fa.wikipedia.org/wiki/فنلاندی‌های_واقعی',
    fi: 'https://fi.wikipedia.org/wiki/Perussuomalaiset',
  },
  VIHR: {
    en: 'https://en.wikipedia.org/wiki/Green_League',
    fa: 'https://fa.wikipedia.org/wiki/لیگ_سبز_(فنلاند)',
    fi: 'https://fi.wikipedia.org/wiki/Vihreä_liitto',
  },
  VAS: {
    en: 'https://en.wikipedia.org/wiki/Left_Alliance_(Finland)',
    fa: 'https://fa.wikipedia.org/wiki/ائتلاف_چپ_(فنلاند)',
    fi: 'https://fi.wikipedia.org/wiki/Vasemmistoliitto',
  },
  KESK: {
    en: 'https://en.wikipedia.org/wiki/Centre_Party_(Finland)',
    fa: 'https://fa.wikipedia.org/wiki/حزب_مرکز_(فنلاند)',
    fi: 'https://fi.wikipedia.org/wiki/Suomen_Keskusta',
  },
  KD: {
    en: 'https://en.wikipedia.org/wiki/Christian_Democrats_(Finland)',
    fa: 'https://fa.wikipedia.org/wiki/حزب_دموکرات‌های_مسیحی_فنلاند',
    fi: 'https://fi.wikipedia.org/wiki/Suomen_Kristillisdemokraatit',
  },
  LIIK: {
    en: 'https://en.wikipedia.org/wiki/Movement_Now',
    fi: 'https://fi.wikipedia.org/wiki/Liike_Nyt',
  },
}

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
  return (
    dataset.events.find((event) => event.id === dataset.featuredLatestId) ??
    dataset.events.at(-1) ??
    null
  )
}

export function topParties(event: ElectionEvent, count = 3) {
  return [...event.parties].sort((a, b) => b.percent - a.percent).slice(0, count)
}

export function chartParties(dataset: ResolvedElectionDataset, count = 6): string[] {
  const latest = featuredElection(dataset)
  if (!latest) return []
  return topParties(latest, count).map((result) => result.party)
}

export function partyColor(party: string): string {
  return PARTY_COLORS[party] ?? '#64736f'
}

export function partyWikipediaLinks(party: string): PartyWikipediaLinks {
  return PARTY_WIKIPEDIA[party] ?? {}
}
