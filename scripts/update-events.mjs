import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildEventsSnapshot } from './lib/events-rss.mjs'
import { validateEventsSnapshot } from './lib/events-validation.mjs'

export const EVENT_FEED_LIMIT = 1000
export const EVENT_FEED_URL = `https://events.osterbotten.fi/EventService/search?Limit=${EVENT_FEED_LIMIT}&Locale=en_US&Municipalities=2&SortField=Date&SortDir=ASC&Format=rss`

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDir, '../public/data/events.json')

async function readExistingOutput() {
  try {
    return await readFile(outputPath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

export async function fetchEventsRss(fetchImpl = fetch) {
  const response = await fetchImpl(EVENT_FEED_URL, {
    headers: { Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`Events feed request failed with HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('xml')) {
    throw new Error(`Events feed returned unexpected Content-Type: ${contentType || 'missing'}`)
  }

  return response.text()
}

export async function updateEventsSnapshot({ fetchImpl = fetch } = {}) {
  const xml = await fetchEventsRss(fetchImpl)
  const snapshot = buildEventsSnapshot(xml, {
    feedUrl: EVENT_FEED_URL,
    requestedLimit: EVENT_FEED_LIMIT,
  })
  const summary = validateEventsSnapshot(snapshot)
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`
  const existing = await readExistingOutput()

  if (existing === serialized) {
    console.log(
      `Events snapshot unchanged: ${summary.events} events, ${summary.occurrences} occurrences`,
    )
    return snapshot
  }

  await writeFile(outputPath, serialized, 'utf8')
  console.log(
    `Updated events snapshot: ${summary.events} events, ${summary.occurrences} occurrences`,
  )
  return snapshot
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await updateEventsSnapshot()
}
