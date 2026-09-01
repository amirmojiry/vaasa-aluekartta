export type EventProvider = 'events-in-ostrobothnia'
export type EventSourceLocale = 'en_US'
export type EventLanguage = 'fi' | 'sv' | 'en'

export interface EventLocalizedText extends Partial<Record<EventLanguage, string>> {
  source: string
  sourceLocale: EventSourceLocale
}

export type EventOccurrence =
  | {
      kind: 'timed'
      startsAt: string
      endsAt?: string
      timeZone: 'Europe/Helsinki'
    }
  | {
      kind: 'all-day'
      localDate: string
      endLocalDate?: string
      timeZone: 'Europe/Helsinki'
    }

export interface EventRecord {
  id: string
  source: {
    provider: EventProvider
    sourceId?: string
    url: string
  }
  title: EventLocalizedText
  municipality: 'Vaasa'
  categories: string[]
  occurrences: EventOccurrence[]
  venue?: string
  addressText?: string
  organizerContact?: string
  organizerOrganization?: string
  targetGroup?: string
  online?: boolean
  publishedAt?: string
  closestOccurrenceAt?: string
  sourceDatePeriod?: string
}

export interface EventsSnapshot {
  schemaVersion: 1
  source: {
    provider: EventProvider
    feedUrl: string
    municipality: 'Vaasa'
    municipalityId: '2'
    requestedLocale: EventSourceLocale
    requestedLimit: number
    itemCount: number
  }
  events: EventRecord[]
}
