import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildEventsSnapshot } from './lib/events-rss.mjs'
import { validateEventsSnapshot } from './lib/events-validation.mjs'

export const EVENT_FEED_LIMIT = 1000
export const EVENT_FEED_URL = `https://events.osterbotten.fi/EventService/search?Limit=${EVENT_FEED_LIMIT}&Locale=en_US&Municipalities=2&SortField=Date&SortDir=ASC&Format=rss`
export const SUSPICIOUS_EVENT_DROP_RATIO = 0.5

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDir, '../public/data/events.json')

async function readExistingOutput(filePath) {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

function existingEventCount(existing) {
  if (existing === undefined) return undefined

  let parsed
  try {
    parsed = JSON.parse(existing)
  } catch {
    throw new Error('Existing events snapshot is not valid JSON; refusing to replace it')
  }

  if (!Array.isArray(parsed?.events)) {
    throw new Error('Existing events snapshot has no events array; refusing to replace it')
  }
  return parsed.events.length
}

export function assertReasonableEventCount(
  nextCount,
  existing,
  { allowSuspiciousDrop = false } = {},
) {
  if (!Number.isInteger(nextCount) || nextCount < 1) {
    throw new Error(`Events update produced an unreasonable record count: ${nextCount}`)
  }

  const previousCount = existingEventCount(existing)
  if (previousCount === undefined || previousCount === 0 || allowSuspiciousDrop) return

  if (nextCount < previousCount * SUSPICIOUS_EVENT_DROP_RATIO) {
    throw new Error(
      `Events source dropped suspiciously from ${previousCount} to ${nextCount} records; refusing to replace the last known good snapshot without explicit review`,
    )
  }
}

export async function writeSnapshotAtomically(filePath, content) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  try {
    await writeFile(temporaryPath, content, 'utf8')
    await rename(temporaryPath, filePath)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {})
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

export async function updateEventsSnapshot({
  fetchImpl = fetch,
  outputFilePath = outputPath,
  allowSuspiciousDrop = process.env.EVENT_ALLOW_SUSPICIOUS_DROP === '1',
} = {}) {
  const xml = await fetchEventsRss(fetchImpl)
  const snapshot = buildEventsSnapshot(xml, {
    feedUrl: EVENT_FEED_URL,
    requestedLimit: EVENT_FEED_LIMIT,
  })
  const summary = validateEventsSnapshot(snapshot)
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`
  const existing = await readExistingOutput(outputFilePath)

  assertReasonableEventCount(summary.events, existing, { allowSuspiciousDrop })

  if (existing === serialized) {
    console.log(
      `Events snapshot unchanged: ${summary.events} events, ${summary.occurrences} occurrences`,
    )
    return snapshot
  }

  await writeSnapshotAtomically(outputFilePath, serialized)
  console.log(
    `Updated events snapshot: ${summary.events} events, ${summary.occurrences} occurrences`,
  )
  return snapshot
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await updateEventsSnapshot()
}
