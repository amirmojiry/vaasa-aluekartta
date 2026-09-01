import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  assertFeedCoverage,
  buildEventsSnapshot,
  parseEventsRss,
  parseRssDateTime,
} from './events-rss.mjs'
import { validateEventsSnapshot } from './events-validation.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const fixturePath = resolve(scriptDir, '../../test/fixtures/events/vaasa-events-source-sample.rss')
const fixture = await readFile(fixturePath, 'utf8')

const feedUrl =
  'https://events.osterbotten.fi/EventService/search?Limit=1000&Locale=en_US&Municipalities=2&SortField=Date&SortDir=ASC&Format=rss'

function minimalItem(overrides = '') {
  return `<item>
    <guid isPermaLink="false">EventCalendar_123</guid>
    <link>https://events.osterbotten.fi/en/events/show/123</link>
    <title>Test &amp; event</title>
    <municipality>Vaasa</municipality>
    <category>Music</category>
    <event:address>Finland</event:address>
    <event:location>Raastuvankatu 30, 65100 Vaasa</event:location>
    <event:organizer>Contact Person</event:organizer>
    <event:dates-ext><event:date><event:start>Tue, 01 Sep 2026 10:00:00 +0300</event:start></event:date></event:dates-ext>
    ${overrides}
  </item>`
}

function rss(item) {
  return `<?xml version="1.0"?><rss version="2.0"><channel>${item}</channel></rss>`
}

describe('Events in Ostrobothnia RSS parser', () => {
  it('parses the committed source fixture with stable ids and recurring occurrences', () => {
    const events = parseEventsRss(fixture)

    expect(events).toHaveLength(2)
    expect(events[0].id).toBe('events-in-ostrobothnia:EventCalendar_60496')
    expect(events[0].source.url).toBe('https://events.osterbotten.fi/en/events/show/60496')
    expect(events[0].online).toBe(true)
    expect(events[0].occurrences).toHaveLength(5)
    expect(events[0].occurrences[0]).toEqual({
      kind: 'timed',
      startsAt: '2026-09-01T09:30:00+03:00',
      endsAt: '2026-09-01T11:30:00+03:00',
      timeZone: 'Europe/Helsinki',
    })
  })

  it('preserves the Helsinki DST offset change in recurring events', () => {
    const events = parseEventsRss(fixture)
    const workingLife = events.find((event) => event.source.sourceId === 'EventCalendar_60947')

    expect(workingLife.occurrences.map((occurrence) => occurrence.startsAt)).toContain(
      '2026-10-06T10:00:00+03:00',
    )
    expect(workingLife.occurrences.map((occurrence) => occurrence.startsAt)).toContain(
      '2026-11-03T10:00:00+02:00',
    )
  })

  it('allows a missing occurrence end and preserves plural categories', () => {
    const xml = rss(minimalItem('<category>Community</category>'))
    const [event] = parseEventsRss(xml)

    expect(event.categories).toEqual(['Music', 'Community'])
    expect(event.occurrences[0]).toEqual({
      kind: 'timed',
      startsAt: '2026-09-01T10:00:00+03:00',
      timeZone: 'Europe/Helsinki',
    })
  })

  it('keeps generic address text separate from a useful venue string', () => {
    const [event] = parseEventsRss(rss(minimalItem()))

    expect(event.addressText).toBe('Finland')
    expect(event.venue).toBe('Raastuvankatu 30, 65100 Vaasa')
    expect(event.title.source).toBe('Test & event')
    expect(event.title.sourceLocale).toBe('en_US')
  })

  it('rejects records outside Vaasa and inconsistent source identity', () => {
    expect(() =>
      parseEventsRss(
        rss(
          minimalItem().replace(
            '<municipality>Vaasa</municipality>',
            '<municipality>Mustasaari</municipality>',
          ),
        ),
      ),
    ).toThrow(/outside Vaasa/)
    expect(() => parseEventsRss(rss(minimalItem().replace('/show/123', '/show/999')))).toThrow(
      /identity mismatch/,
    )
  })

  it('normalizes RSS date-times without losing the source offset', () => {
    expect(parseRssDateTime('Sun, 25 Oct 2026 10:00:00 +0200')).toBe('2026-10-25T10:00:00+02:00')
  })

  it('rejects impossible calendar components instead of relying on Date.parse rollover', () => {
    expect(() => parseRssDateTime('Tue, 31 Feb 2026 10:00:00 +0200')).toThrow(
      /Invalid RSS date-time/,
    )
    expect(() => parseRssDateTime('Tue, 01 Sep 2026 24:00:00 +0300')).toThrow(
      /Invalid RSS date-time/,
    )
  })

  it('rejects impossible normalized occurrence dates during snapshot validation', () => {
    const snapshot = buildEventsSnapshot(fixture, { feedUrl, requestedLimit: 1000 })
    snapshot.events[0].occurrences[0].startsAt = '2026-02-31T10:00:00+02:00'

    expect(() => validateEventsSnapshot(snapshot)).toThrow(/valid calendar date-time/)
  })

  it('fails closed when the requested feed limit is saturated', () => {
    expect(() => assertFeedCoverage(1000, 1000)).toThrow(/may be truncated/)
    expect(() => assertFeedCoverage(249, 1000)).not.toThrow()
  })

  it('builds a validator-compatible deterministic snapshot', () => {
    const snapshot = buildEventsSnapshot(fixture, { feedUrl, requestedLimit: 1000 })
    expect(snapshot.source.itemCount).toBe(2)
    expect(validateEventsSnapshot(snapshot)).toEqual({ events: 2, occurrences: 9 })
    expect(JSON.stringify(snapshot)).toBe(
      JSON.stringify(buildEventsSnapshot(fixture, { feedUrl, requestedLimit: 1000 })),
    )
  })
})
