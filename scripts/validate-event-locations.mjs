import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { pointWithinVaasaBounds } from './lib/event-location.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const eventsPath = resolve(scriptDir, '../public/data/events.json')
const locationsPath = resolve(scriptDir, '../public/data/event-locations.json')
const reportPath = resolve(scriptDir, '../public/data/event-location-report.json')
const cachePath = resolve(scriptDir, '../public/data/location-cache.json')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function assertFinitePoint(resolution, eventId) {
  if (!Number.isFinite(resolution.longitude) || !Number.isFinite(resolution.latitude)) {
    throw new Error(`Event ${eventId} has invalid point coordinates`)
  }
  if (!pointWithinVaasaBounds(resolution.longitude, resolution.latitude)) {
    throw new Error(`Event ${eventId} point is outside the verified Vaasa municipality bounds`)
  }
  if (!resolution.provenance?.provider || !resolution.provenance?.licence) {
    throw new Error(`Event ${eventId} mapped point lacks provider/licence provenance`)
  }
}

function validateLocationRecord(record, eventIds) {
  if (!eventIds.has(record?.eventId)) throw new Error(`Unknown event location id: ${record?.eventId}`)
  if (!record.resolution || typeof record.resolution !== 'object') {
    throw new Error(`Event ${record.eventId} has no location resolution`)
  }

  const { resolution } = record
  const allowed = new Set([
    'exact-address',
    'known-venue',
    'postal-area',
    'municipality',
    'multi-location',
    'online',
    'unresolved',
  ])
  if (!allowed.has(resolution.precision)) {
    throw new Error(`Event ${record.eventId} has unknown location precision: ${resolution.precision}`)
  }

  const pointPrecision = ['exact-address', 'known-venue', 'postal-area']
  if (pointPrecision.includes(resolution.precision)) assertFinitePoint(resolution, record.eventId)
  if (['online', 'multi-location', 'unresolved'].includes(resolution.precision)) {
    if ('longitude' in resolution || 'latitude' in resolution) {
      throw new Error(`Event ${record.eventId} must not expose point geometry for ${resolution.precision}`)
    }
  }
  if (resolution.geocoder === 'nls-geocoding-v2' && !resolution.geocodedAt) {
    throw new Error(`Event ${record.eventId} NLS resolution lacks retrieval timestamp`)
  }
}

function validateCache(cache) {
  if (cache?.schemaVersion !== 1 || typeof cache.entries !== 'object' || cache.entries === null) {
    throw new Error('Location cache is invalid')
  }

  for (const [key, entry] of Object.entries(cache.entries)) {
    if (!key || !entry?.rawQuery || !entry?.retrievedAt) throw new Error(`Invalid cache entry: ${key}`)
    if (!pointWithinVaasaBounds(entry.longitude, entry.latitude)) {
      throw new Error(`Location cache entry ${key} is outside Vaasa bounds`)
    }
    if (!entry.sourceDataset || !entry.provenance?.provider || !entry.provenance?.licence) {
      throw new Error(`Location cache entry ${key} lacks source/licence provenance`)
    }
  }
}

const [events, locations, report, cache] = await Promise.all([
  readJson(eventsPath),
  readJson(locationsPath),
  readJson(reportPath),
  readJson(cachePath),
])

if (!Array.isArray(events?.events)) throw new Error('Events snapshot is invalid')
if (locations?.schemaVersion !== 1 || !Array.isArray(locations.locations)) {
  throw new Error('Event locations snapshot is invalid')
}
if (locations.sourceEventCount !== events.events.length) {
  throw new Error('Event location sourceEventCount does not match events.json')
}
if (locations.locations.length !== events.events.length) {
  throw new Error('Every event must have exactly one location-resolution record')
}

const eventIds = new Set(events.events.map((event) => event.id))
const seen = new Set()
for (const record of locations.locations) {
  if (seen.has(record.eventId)) throw new Error(`Duplicate event location record: ${record.eventId}`)
  seen.add(record.eventId)
  validateLocationRecord(record, eventIds)
}

if (report?.schemaVersion !== 1 || report.totalEvents !== events.events.length) {
  throw new Error('Event location report does not match events.json')
}
if (report.highConfidenceMapped !== report.exactAddress + report.knownVenue) {
  throw new Error('Event location report high-confidence count is inconsistent')
}
if (report.geocoderResolved > report.highConfidenceMapped) {
  throw new Error('Event location report geocoder count exceeds mapped count')
}
const expectedRate = Number((report.highConfidenceMapped / report.totalEvents).toFixed(4))
if (report.highConfidenceRate !== expectedRate) {
  throw new Error('Event location report high-confidence rate is inconsistent')
}

validateCache(cache)
console.log(
  `Validated ${locations.locations.length} event locations; ${report.highConfidenceMapped} high-confidence points, ${report.unresolved} unresolved`,
)
