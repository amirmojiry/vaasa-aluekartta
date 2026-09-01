import { EVENT_PROVIDER, EVENT_SOURCE_LOCALE, EVENT_TIME_ZONE } from './events-rss.mjs'

const RFC3339_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/
const OPTIONAL_STRING_FIELDS = [
  'venue',
  'addressText',
  'organizerContact',
  'organizerOrganization',
  'targetGroup',
  'sourceDatePeriod',
]

function isNonEmptyString(value) {
  return typeof value === 'string' && Boolean(value.trim())
}

function assertOptionalNonEmptyString(record, field, label) {
  if (field in record && !isNonEmptyString(record[field])) {
    throw new Error(`${label}.${field} must be a non-empty string when present`)
  }
}

function assertHelsinkiDateTime(value, label) {
  if (!isNonEmptyString(value) || !RFC3339_WITH_OFFSET.test(value)) {
    throw new Error(`${label} must be an RFC 3339 date-time with an explicit offset`)
  }
  if (!value.endsWith('+02:00') && !value.endsWith('+03:00')) {
    throw new Error(`${label} must use a valid Europe/Helsinki offset`)
  }
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} is not a valid date-time`)
}

function validateOccurrence(occurrence, eventId, index) {
  const label = `Event ${eventId} occurrence ${index}`
  if (!occurrence || typeof occurrence !== 'object') throw new Error(`${label} is invalid`)
  if (occurrence.timeZone !== EVENT_TIME_ZONE) {
    throw new Error(`${label} must use ${EVENT_TIME_ZONE}`)
  }

  if (occurrence.kind === 'timed') {
    assertHelsinkiDateTime(occurrence.startsAt, `${label}.startsAt`)
    if ('endsAt' in occurrence) {
      assertHelsinkiDateTime(occurrence.endsAt, `${label}.endsAt`)
      if (Date.parse(occurrence.endsAt) < Date.parse(occurrence.startsAt)) {
        throw new Error(`${label}.endsAt precedes startsAt`)
      }
    }
    return
  }

  if (occurrence.kind === 'all-day') {
    if (!isNonEmptyString(occurrence.localDate) || !LOCAL_DATE.test(occurrence.localDate)) {
      throw new Error(`${label}.localDate must be YYYY-MM-DD`)
    }
    if ('endLocalDate' in occurrence) {
      if (!isNonEmptyString(occurrence.endLocalDate) || !LOCAL_DATE.test(occurrence.endLocalDate)) {
        throw new Error(`${label}.endLocalDate must be YYYY-MM-DD`)
      }
      if (occurrence.endLocalDate < occurrence.localDate) {
        throw new Error(`${label}.endLocalDate precedes localDate`)
      }
    }
    return
  }

  throw new Error(`${label} has unknown kind: ${occurrence.kind}`)
}

function validateFeedSource(source, eventCount) {
  if (!source || typeof source !== 'object')
    throw new Error('Events snapshot has no source metadata')
  if (source.provider !== EVENT_PROVIDER)
    throw new Error(`Unexpected event provider: ${source.provider}`)
  if (source.municipality !== 'Vaasa' || source.municipalityId !== '2') {
    throw new Error('Events snapshot must remain scoped to Vaasa municipality id 2')
  }
  if (source.requestedLocale !== EVENT_SOURCE_LOCALE) {
    throw new Error(`Events snapshot locale must be ${EVENT_SOURCE_LOCALE}`)
  }
  if (!Number.isInteger(source.requestedLimit) || source.requestedLimit < 1) {
    throw new Error('Events snapshot requestedLimit must be a positive integer')
  }
  if (source.itemCount !== eventCount) {
    throw new Error(
      `Events source itemCount ${source.itemCount} does not match ${eventCount} events`,
    )
  }
  if (source.itemCount >= source.requestedLimit) {
    throw new Error('Events snapshot is saturated at its requested feed limit')
  }

  let feedUrl
  try {
    feedUrl = new URL(source.feedUrl)
  } catch {
    throw new Error('Events snapshot feedUrl is invalid')
  }

  if (
    feedUrl.origin !== 'https://events.osterbotten.fi' ||
    feedUrl.pathname !== '/EventService/search'
  ) {
    throw new Error('Events snapshot feedUrl is not the verified Events in Ostrobothnia endpoint')
  }
  if (feedUrl.searchParams.get('Municipalities') !== '2') {
    throw new Error('Events snapshot feedUrl must request municipality id 2')
  }
  if (feedUrl.searchParams.get('Locale') !== EVENT_SOURCE_LOCALE) {
    throw new Error(`Events snapshot feedUrl must request ${EVENT_SOURCE_LOCALE}`)
  }
  if (feedUrl.searchParams.get('Format')?.toLowerCase() !== 'rss') {
    throw new Error('Events snapshot feedUrl must request RSS format')
  }
  if (Number(feedUrl.searchParams.get('Limit')) !== source.requestedLimit) {
    throw new Error('Events snapshot feedUrl Limit does not match requestedLimit')
  }
}

function validateEvent(event, index, ids, sourceIds) {
  if (!event || typeof event !== 'object') throw new Error(`Event ${index} is invalid`)
  if (!isNonEmptyString(event.id)) throw new Error(`Event ${index} has no stable id`)
  if (!event.id.startsWith(`${EVENT_PROVIDER}:`)) {
    throw new Error(`Event ${event.id} has an invalid id namespace`)
  }
  if (ids.has(event.id)) throw new Error(`Duplicate normalized event id: ${event.id}`)
  ids.add(event.id)

  if (!event.source || event.source.provider !== EVENT_PROVIDER) {
    throw new Error(`Event ${event.id} has invalid source metadata`)
  }
  if (!isNonEmptyString(event.source.url)) throw new Error(`Event ${event.id} has no source URL`)

  let sourceUrl
  try {
    sourceUrl = new URL(event.source.url)
  } catch {
    throw new Error(`Event ${event.id} has an invalid source URL`)
  }
  if (sourceUrl.origin !== 'https://events.osterbotten.fi') {
    throw new Error(`Event ${event.id} source URL is on an unexpected host`)
  }

  if ('sourceId' in event.source) {
    if (!/^EventCalendar_\d+$/.test(event.source.sourceId)) {
      throw new Error(`Event ${event.id} has invalid sourceId: ${event.source.sourceId}`)
    }
    if (sourceIds.has(event.source.sourceId)) {
      throw new Error(`Duplicate upstream event sourceId: ${event.source.sourceId}`)
    }
    sourceIds.add(event.source.sourceId)

    if (event.id !== `${EVENT_PROVIDER}:${event.source.sourceId}`) {
      throw new Error(`Event ${event.id} does not match its sourceId namespace`)
    }
    const sourceNumericId = event.source.sourceId.slice('EventCalendar_'.length)
    const urlNumericId = sourceUrl.pathname.match(/\/show\/(\d+)(?:\/|$)/)?.[1]
    if (urlNumericId && sourceNumericId !== urlNumericId) {
      throw new Error(`Event ${event.id} sourceId does not match its canonical URL`)
    }
  }

  if (!event.title || !isNonEmptyString(event.title.source)) {
    throw new Error(`Event ${event.id} has no source title`)
  }
  if (event.title.sourceLocale !== EVENT_SOURCE_LOCALE) {
    throw new Error(`Event ${event.id} title must retain the requested source locale`)
  }
  for (const language of ['fi', 'sv', 'en']) {
    assertOptionalNonEmptyString(event.title, language, `Event ${event.id}.title`)
  }

  if (event.municipality !== 'Vaasa') throw new Error(`Event ${event.id} is outside Vaasa`)
  if (!Array.isArray(event.categories))
    throw new Error(`Event ${event.id} categories must be an array`)
  const categories = new Set()
  for (const category of event.categories) {
    if (!isNonEmptyString(category)) throw new Error(`Event ${event.id} has an empty category`)
    if (categories.has(category))
      throw new Error(`Event ${event.id} has duplicate category: ${category}`)
    categories.add(category)
  }

  if (!Array.isArray(event.occurrences) || event.occurrences.length === 0) {
    throw new Error(`Event ${event.id} has no occurrences`)
  }
  event.occurrences.forEach((occurrence, occurrenceIndex) =>
    validateOccurrence(occurrence, event.id, occurrenceIndex),
  )

  for (const field of OPTIONAL_STRING_FIELDS) {
    assertOptionalNonEmptyString(event, field, `Event ${event.id}`)
  }
  if ('online' in event && typeof event.online !== 'boolean') {
    throw new Error(`Event ${event.id}.online must be boolean when present`)
  }
  for (const field of ['publishedAt', 'closestOccurrenceAt']) {
    if (field in event) assertHelsinkiDateTime(event[field], `Event ${event.id}.${field}`)
  }
}

export function validateEventsSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Events snapshot is invalid')
  if (snapshot.schemaVersion !== 1) throw new Error('Events snapshot schemaVersion must be 1')
  if (!Array.isArray(snapshot.events)) throw new Error('Events snapshot events must be an array')

  validateFeedSource(snapshot.source, snapshot.events.length)

  const ids = new Set()
  const sourceIds = new Set()
  snapshot.events.forEach((event, index) => validateEvent(event, index, ids, sourceIds))

  return {
    events: snapshot.events.length,
    occurrences: snapshot.events.reduce((total, event) => total + event.occurrences.length, 0),
  }
}
