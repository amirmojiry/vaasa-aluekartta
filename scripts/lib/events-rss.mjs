export const EVENT_PROVIDER = 'events-in-ostrobothnia'
export const EVENT_SOURCE_LOCALE = 'en_US'
export const EVENT_TIME_ZONE = 'Europe/Helsinki'

const MONTHS = new Map(
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
    (month, index) => [month, String(index + 1).padStart(2, '0')],
  ),
)

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeXmlEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function unwrapCdata(value) {
  const trimmed = value.trim()
  if (trimmed.startsWith('<![CDATA[') && trimmed.endsWith(']]>')) {
    return trimmed.slice(9, -3)
  }
  return trimmed
}

function extractElementValues(xml, tagName) {
  const escapedTag = escapeRegExp(tagName)
  const paired = new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'g')
  return [...xml.matchAll(paired)].map((match) => decodeXmlEntities(unwrapCdata(match[1])))
}

function extractElementBlocks(xml, tagName) {
  const escapedTag = escapeRegExp(tagName)
  const paired = new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'g')
  return [...xml.matchAll(paired)].map((match) => match[1])
}

function firstText(xml, tagName) {
  const value = extractElementValues(xml, tagName)[0]
  return value?.trim() || undefined
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function parseRssDateTime(value) {
  if (!value) return undefined

  const match = value
    .trim()
    .match(
      /^(?:[A-Z][a-z]{2},\s+)?(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-])(\d{2})(\d{2})$/,
    )
  if (!match) throw new Error(`Unsupported RSS date-time: ${value}`)

  const [, day, monthName, year, hour, minute, second, sign, offsetHour, offsetMinute] = match
  const month = MONTHS.get(monthName)
  if (!month) throw new Error(`Unsupported RSS month: ${monthName}`)

  const normalized = `${year}-${month}-${day.padStart(2, '0')}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMinute}`
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(`Invalid RSS date-time: ${value}`)
  }
  return normalized
}

function parseExtendedOccurrences(itemXml) {
  const container = extractElementBlocks(itemXml, 'event:dates-ext')[0]
  if (!container) return []

  return extractElementBlocks(container, 'event:date')
    .map((dateXml) => {
      const startsAt = parseRssDateTime(firstText(dateXml, 'event:start'))
      if (!startsAt) return undefined
      const endsAt = parseRssDateTime(firstText(dateXml, 'event:end'))
      return {
        kind: 'timed',
        startsAt,
        ...(endsAt ? { endsAt } : {}),
        timeZone: EVENT_TIME_ZONE,
      }
    })
    .filter(Boolean)
}

function parseFallbackOccurrences(itemXml) {
  const container = extractElementBlocks(itemXml, 'event:dates')[0]
  if (!container) return []

  return extractElementValues(container, 'event:date').map((value) => ({
    kind: 'timed',
    startsAt: parseRssDateTime(value),
    timeZone: EVENT_TIME_ZONE,
  }))
}

function occurrenceKey(occurrence) {
  return `${occurrence.startsAt}\u0000${occurrence.endsAt ?? ''}`
}

function normalizeOccurrences(itemXml) {
  const parsed = parseExtendedOccurrences(itemXml)
  const occurrences = parsed.length > 0 ? parsed : parseFallbackOccurrences(itemXml)
  const unique = new Map()

  for (const occurrence of occurrences) {
    if (!occurrence.startsAt) continue
    unique.set(occurrenceKey(occurrence), occurrence)
  }

  return [...unique.values()].sort((left, right) => {
    const startDifference = Date.parse(left.startsAt) - Date.parse(right.startsAt)
    if (startDifference !== 0) return startDifference
    return (left.endsAt ?? '').localeCompare(right.endsAt ?? '')
  })
}

function assertIdentityConsistency(guid, url) {
  if (!guid) return
  const guidMatch = guid.match(/^EventCalendar_(\d+)$/)
  const urlMatch = url.match(/\/show\/(\d+)(?:[/?#]|$)/)
  if (guidMatch && urlMatch && guidMatch[1] !== urlMatch[1]) {
    throw new Error(`Event identity mismatch: ${guid} does not match ${url}`)
  }
}

function normalizeOnlineFlag(value) {
  if (!value) return undefined
  if (value === '1') return true
  if (value === '0') return false
  throw new Error(`Unsupported event:onlineevent value: ${value}`)
}

function normalizeEvent(itemXml) {
  const guid = firstText(itemXml, 'guid')
  const url = firstText(itemXml, 'link')
  const title = firstText(itemXml, 'title')
  const municipality = firstText(itemXml, 'municipality')

  if (!url) throw new Error('Event item has no canonical link')
  if (!title) throw new Error(`Event item ${guid ?? url} has no title`)
  if (municipality !== 'Vaasa') {
    throw new Error(`Event item ${guid ?? url} is outside Vaasa: ${municipality ?? 'missing'}`)
  }

  assertIdentityConsistency(guid, url)

  const sourceKey = guid ?? `url:${url}`
  const occurrences = normalizeOccurrences(itemXml)
  if (occurrences.length === 0) {
    throw new Error(`Event item ${sourceKey} has no structured occurrences`)
  }

  const categories = uniqueNonEmpty(extractElementValues(itemXml, 'category'))
  const online = normalizeOnlineFlag(firstText(itemXml, 'event:onlineevent'))
  const publishedAt = parseRssDateTime(firstText(itemXml, 'pubDate'))
  const closestOccurrenceAt = parseRssDateTime(firstText(itemXml, 'event:closestDate'))
  const venue = firstText(itemXml, 'event:location')
  const addressText = firstText(itemXml, 'event:address')
  const organizerContact = firstText(itemXml, 'event:organizer')
  const organizerOrganization = firstText(itemXml, 'event:association')
  const targetGroup = firstText(itemXml, 'event:targetgroup')
  const sourceDatePeriod = firstText(itemXml, 'event:dateperiod')

  return {
    id: `${EVENT_PROVIDER}:${sourceKey}`,
    source: {
      provider: EVENT_PROVIDER,
      ...(guid ? { sourceId: guid } : {}),
      url,
    },
    title: {
      source: title,
      sourceLocale: EVENT_SOURCE_LOCALE,
    },
    municipality: 'Vaasa',
    categories,
    occurrences,
    ...(venue ? { venue } : {}),
    ...(addressText ? { addressText } : {}),
    ...(organizerContact ? { organizerContact } : {}),
    ...(organizerOrganization ? { organizerOrganization } : {}),
    ...(targetGroup ? { targetGroup } : {}),
    ...(online !== undefined ? { online } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    ...(closestOccurrenceAt ? { closestOccurrenceAt } : {}),
    ...(sourceDatePeriod ? { sourceDatePeriod } : {}),
  }
}

export function parseEventsRss(xml) {
  if (typeof xml !== 'string' || !xml.includes('<rss')) {
    throw new Error('Events source is not an RSS document')
  }

  const items = extractElementBlocks(xml, 'item')
  if (items.length === 0) throw new Error('Events RSS contains no items')

  const events = items.map(normalizeEvent)
  const ids = new Set()
  for (const event of events) {
    if (ids.has(event.id)) throw new Error(`Duplicate normalized event id: ${event.id}`)
    ids.add(event.id)
  }

  return events.sort((left, right) => {
    const startDifference =
      Date.parse(left.occurrences[0].startsAt) - Date.parse(right.occurrences[0].startsAt)
    return startDifference || left.id.localeCompare(right.id)
  })
}

export function assertFeedCoverage(itemCount, requestedLimit) {
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new Error(`Invalid event feed limit: ${requestedLimit}`)
  }
  if (itemCount >= requestedLimit) {
    throw new Error(
      `Event feed returned ${itemCount} items for Limit=${requestedLimit}; coverage is saturated and the snapshot may be truncated`,
    )
  }
}

export function buildEventsSnapshot(xml, { feedUrl, requestedLimit }) {
  const events = parseEventsRss(xml)
  assertFeedCoverage(events.length, requestedLimit)

  return {
    schemaVersion: 1,
    source: {
      provider: EVENT_PROVIDER,
      feedUrl,
      municipality: 'Vaasa',
      municipalityId: '2',
      requestedLocale: EVENT_SOURCE_LOCALE,
      requestedLimit,
      itemCount: events.length,
    },
    events,
  }
}
