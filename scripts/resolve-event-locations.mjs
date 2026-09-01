import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildPoiLocationIndex,
  chooseEventGeocodingQuery,
  isHighConfidenceResolution,
  normalizeLocationText,
  resolveEventLocally,
  VAASA_MUNICIPALITY_BOUNDS,
} from './lib/event-location.mjs'
import { geocodeWithNls } from './lib/nls-geocoder.mjs'
import { writeSnapshotAtomically } from './update-events.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const eventsPath = resolve(scriptDir, '../public/data/events.json')
const poisPath = resolve(scriptDir, '../public/data/vaasa-pois.geojson')
const cachePath = resolve(scriptDir, '../public/data/location-cache.json')
const locationsPath = resolve(scriptDir, '../public/data/event-locations.json')
const reportPath = resolve(scriptDir, '../public/data/event-location-report.json')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function resolutionFromCache(query, cacheEntry) {
  return {
    query,
    resolution: {
      precision: /\d/.test(query) ? 'exact-address' : 'known-venue',
      longitude: cacheEntry.longitude,
      latitude: cacheEntry.latitude,
      ...(cacheEntry.label ? { label: cacheEntry.label } : {}),
      geocoder: 'nls-geocoding-v2',
      geocodedAt: cacheEntry.retrievedAt,
      sourceAddress: query,
      provenance: cacheEntry.provenance,
    },
  }
}

function cacheKey(query) {
  return normalizeLocationText(query)
}

function makeReport(locations, remoteGeocodingAvailable) {
  const counts = {
    totalEvents: locations.length,
    exactAddress: 0,
    knownVenue: 0,
    geocoderResolved: 0,
    online: 0,
    multiLocation: 0,
    ambiguous: 0,
    unresolved: 0,
    remoteKeyMissing: 0,
    highConfidenceMapped: 0,
  }
  const unresolvedQueries = []

  for (const record of locations) {
    const { resolution } = record
    if (resolution.precision === 'exact-address') counts.exactAddress += 1
    if (resolution.precision === 'known-venue') counts.knownVenue += 1
    if (resolution.precision === 'online') counts.online += 1
    if (resolution.precision === 'multi-location') counts.multiLocation += 1
    if (resolution.precision === 'unresolved') counts.unresolved += 1
    if (resolution.geocoder === 'nls-geocoding-v2') counts.geocoderResolved += 1
    if (resolution.reason?.startsWith('ambiguous-')) counts.ambiguous += 1
    if (resolution.reason === 'remote-key-missing') counts.remoteKeyMissing += 1
    if (isHighConfidenceResolution(resolution)) counts.highConfidenceMapped += 1

    if (resolution.precision === 'unresolved' && record.query && unresolvedQueries.length < 30) {
      unresolvedQueries.push({
        eventId: record.eventId,
        query: record.query,
        reason: resolution.reason,
      })
    }
  }

  return {
    schemaVersion: 1,
    remoteGeocodingAvailable,
    ...counts,
    highConfidenceRate:
      counts.totalEvents === 0
        ? 0
        : Number((counts.highConfidenceMapped / counts.totalEvents).toFixed(4)),
    unresolvedQueries,
  }
}

export async function resolveEventLocations({
  apiKey = process.env.NLS_API_KEY,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  const [eventsSnapshot, poiCollection, cache] = await Promise.all([
    readJson(eventsPath),
    readJson(poisPath),
    readJson(cachePath),
  ])

  if (!Array.isArray(eventsSnapshot?.events)) throw new Error('Events snapshot is invalid')
  if (cache?.schemaVersion !== 1 || typeof cache.entries !== 'object' || cache.entries === null) {
    throw new Error('Location cache is invalid')
  }

  const poiIndex = buildPoiLocationIndex(poiCollection)
  const locations = []
  let cacheChanged = false

  for (const event of eventsSnapshot.events) {
    const local = resolveEventLocally(event, poiIndex)
    if (local) {
      locations.push({ eventId: event.id, ...local })
      continue
    }

    const query = chooseEventGeocodingQuery(event)
    if (!query) {
      locations.push({
        eventId: event.id,
        resolution: { precision: 'unresolved', reason: 'no-usable-query' },
      })
      continue
    }

    const key = cacheKey(query)
    const cached = cache.entries[key]
    if (cached) {
      locations.push({ eventId: event.id, ...resolutionFromCache(query, cached) })
      continue
    }

    const remote = await geocodeWithNls(query, { apiKey, fetchImpl, now })
    if (remote.cacheEntry) {
      cache.entries[key] = remote.cacheEntry
      cacheChanged = true
    }
    locations.push({ eventId: event.id, query, resolution: remote.resolution })
  }

  locations.sort((left, right) => left.eventId.localeCompare(right.eventId))
  const locationSnapshot = {
    schemaVersion: 1,
    sourceEventCount: eventsSnapshot.events.length,
    bounds: {
      provider: VAASA_MUNICIPALITY_BOUNDS.provider,
      relationId: VAASA_MUNICIPALITY_BOUNDS.relationId,
      wikidata: VAASA_MUNICIPALITY_BOUNDS.wikidata,
      adminLevel: VAASA_MUNICIPALITY_BOUNDS.adminLevel,
      minLatitude: VAASA_MUNICIPALITY_BOUNDS.minLatitude,
      minLongitude: VAASA_MUNICIPALITY_BOUNDS.minLongitude,
      maxLatitude: VAASA_MUNICIPALITY_BOUNDS.maxLatitude,
      maxLongitude: VAASA_MUNICIPALITY_BOUNDS.maxLongitude,
    },
    locations,
  }
  const report = makeReport(locations, Boolean(apiKey))

  await writeSnapshotAtomically(locationsPath, `${JSON.stringify(locationSnapshot, null, 2)}\n`)
  await writeSnapshotAtomically(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  if (cacheChanged) {
    await writeSnapshotAtomically(cachePath, `${JSON.stringify(cache, null, 2)}\n`)
  }

  console.log(
    `Resolved ${report.highConfidenceMapped}/${report.totalEvents} events with high confidence; ` +
      `${report.unresolved} unresolved, ${report.online} online, ${report.multiLocation} multi-location`,
  )
  if (!apiKey && report.remoteKeyMissing > 0) {
    console.log(
      `${report.remoteKeyMissing} records are ready for NLS geocoding when NLS_API_KEY is configured`,
    )
  }

  return { locationSnapshot, report, cache }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await resolveEventLocations()
}
