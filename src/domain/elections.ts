export type ElectionType = 'municipal' | 'regional' | 'european' | 'parliamentary'
export type ElectionCoverage = 'exact' | 'partial' | 'associated'

export type CompactPartyResult = [party: string, votes: number, percent: number]

export interface CompactElectionEvent {
  id: string
  year: number
  type: ElectionType
  parties: CompactPartyResult[]
}

export interface ElectionDataset {
  coverage: ElectionCoverage
  scope: { fi: string; en: string; fa: string }
  note?: { fi: string; en: string; fa: string }
  sourceUrl: string
  featuredLatestId: string
  events: CompactElectionEvent[]
}

export interface PartyMetadata {
  fi: string
  en: string
  fa: string
}

export interface ElectionStatisticsDatabase {
  schemaVersion: number
  parties: Record<string, PartyMetadata>
  areas: Record<string, ElectionDataset>
  city?: ElectionDataset
}

export interface PartyResult {
  party: string
  votes: number
  percent: number
}

export interface ElectionEvent {
  id: string
  year: number
  type: ElectionType
  parties: PartyResult[]
}

export interface ResolvedElectionDataset extends Omit<ElectionDataset, 'events'> {
  events: ElectionEvent[]
}
