import type { LocalizedText } from '@/domain/areas'

const PARTY_PROFILES_URL = `${import.meta.env.BASE_URL}data/party-profiles.json`

export interface PartyProfileItem {
  topic: LocalizedText
  text: LocalizedText
  sourceUrl: string
}

export interface PartyProfile {
  items: PartyProfileItem[]
}

export interface PartyProfileDatabase {
  schemaVersion: number
  updated: string
  profiles: Record<string, PartyProfile>
}

let databasePromise: Promise<PartyProfileDatabase> | null = null

export async function fetchPartyProfileDatabase(): Promise<PartyProfileDatabase> {
  databasePromise ??= fetch(PARTY_PROFILES_URL, { cache: 'force-cache' }).then(async (response) => {
    if (!response.ok) throw new Error(`Party profiles returned HTTP ${response.status}`)
    const data = (await response.json()) as PartyProfileDatabase
    if (data.schemaVersion !== 1 || !data.profiles) {
      throw new Error('Party profile database has an unsupported schema')
    }
    return data
  })
  return databasePromise
}

export async function fetchPartyProfile(party: string): Promise<PartyProfile | null> {
  const database = await fetchPartyProfileDatabase()
  return database.profiles[party] ?? null
}
