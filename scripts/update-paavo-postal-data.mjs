import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const WFS_URL = 'https://geo.stat.fi/geoserver/postialue/wfs'
const MAJOR_BOUNDARIES = resolve('public/data/vaasa-suuralueet.geojson')
const CURRENT_OUTPUT = resolve('public/data/paavo-postal-areas.geojson')
const HISTORY_OUTPUT = resolve('public/data/paavo-postal-history.json')
const MIN_STATISTICS_YEAR = 2012

function numberOrNull(value) {
  if (value === null || value === undefined || value === '' || value === '..' || value === '...') {
    return null
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function propertyNumber(properties, keys) {
  for (const key of keys) {
    const value = numberOrNull(properties[key])
    if (value !== null) return value
  }
  return null
}

function postalCode(properties) {
  for (const value of [
    properties.postinumeroalue,
    properties.postinumero,
    properties.pno,
    properties.posti_alue,
  ]) {
    if (typeof value === 'string' && /^\d{5}$/.test(value)) return value
  }
  return null
}

function outerRings(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ? [geometry.coordinates[0]] : []
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygon) => polygon[0]).filter(Array.isArray)
  }
  return []
}

function featureRings(feature) {
  return outerRings(feature.geometry)
}

function boundsForFeatures(features) {
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  for (const feature of features) {
    for (const ring of featureRings(feature)) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon)
        maxLon = Math.max(maxLon, lon)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
    }
  }
  if (![minLon, maxLon, minLat, maxLat].every(Number.isFinite)) {
    throw new Error('Could not derive Vaasa bounds from the generated suuralue snapshot')
  }
  return { minLon, maxLon, minLat, maxLat }
}

function ringBounds(ring) {
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon)
    maxLon = Math.max(maxLon, lon)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }
  return { minLon, maxLon, minLat, maxLat }
}

function boundsOverlap(left, right) {
  return !(
    left.maxLon < right.minLon ||
    left.minLon > right.maxLon ||
    left.maxLat < right.minLat ||
    left.minLat > right.maxLat
  )
}

function pointInRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lonI, latI] = ring[i]
    const [lonJ, latJ] = ring[j]
    const intersects =
      latI > lat !== latJ > lat &&
      lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI || Number.EPSILON) + lonI
    if (intersects) inside = !inside
  }
  return inside
}

function orientation(a, b, c) {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])
}

function onSegment(a, b, c) {
  return (
    b[0] <= Math.max(a[0], c[0]) &&
    b[0] >= Math.min(a[0], c[0]) &&
    b[1] <= Math.max(a[1], c[1]) &&
    b[1] >= Math.min(a[1], c[1])
  )
}

function segmentsIntersect(a1, a2, b1, b2) {
  const o1 = orientation(a1, a2, b1)
  const o2 = orientation(a1, a2, b2)
  const o3 = orientation(b1, b2, a1)
  const o4 = orientation(b1, b2, a2)
  if (o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0) return true
  if (Math.abs(o1) < Number.EPSILON && onSegment(a1, b1, a2)) return true
  if (Math.abs(o2) < Number.EPSILON && onSegment(a1, b2, a2)) return true
  if (Math.abs(o3) < Number.EPSILON && onSegment(b1, a1, b2)) return true
  if (Math.abs(o4) < Number.EPSILON && onSegment(b1, a2, b2)) return true
  return false
}

function ringsIntersect(left, right) {
  if (!boundsOverlap(ringBounds(left), ringBounds(right))) return false
  const firstLeft = left[0]
  const firstRight = right[0]
  if (firstLeft && pointInRing(firstLeft[0], firstLeft[1], right)) return true
  if (firstRight && pointInRing(firstRight[0], firstRight[1], left)) return true
  for (let i = 0; i < left.length; i += 1) {
    const a1 = left[i]
    const a2 = left[(i + 1) % left.length]
    for (let j = 0; j < right.length; j += 1) {
      const b1 = right[j]
      const b2 = right[(j + 1) % right.length]
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

function intersectsVaasa(feature, majorFeatures) {
  const postalRings = featureRings(feature)
  return majorFeatures.some((major) =>
    featureRings(major).some((majorRing) =>
      postalRings.some((postalRing) => ringsIntersect(majorRing, postalRing)),
    ),
  )
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { Accept: 'application/xml,text/xml,*/*' } })
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}: ${url}`)
  return response.text()
}

async function availableReleases() {
  const capabilitiesUrl = new URL(WFS_URL)
  capabilitiesUrl.search = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetCapabilities',
  }).toString()
  const xml = await fetchText(capabilitiesUrl)
  const releases = new Set()
  for (const match of xml.matchAll(/(?:postialue:)?pno_tilasto_(\d{4})/g)) {
    const releaseYear = Number(match[1])
    const statisticsYear = releaseYear - 2
    if (statisticsYear >= MIN_STATISTICS_YEAR) {
      releases.add(releaseYear)
    }
  }
  if (!releases.size) {
    throw new Error('No versioned Paavo pno_tilasto_YYYY layers were found in WFS capabilities')
  }
  return [...releases].sort((a, b) => a - b)
}

async function fetchRelease(releaseYear, bounds) {
  const url = new URL(WFS_URL)
  url.search = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: `postialue:pno_tilasto_${releaseYear}`,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox: `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat},EPSG:4326`,
  }).toString()
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Paavo ${releaseYear} returned HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    throw new Error(`Paavo ${releaseYear} response is not a GeoJSON FeatureCollection`)
  }
  return { url: url.href, payload }
}

function normalizedMetrics(properties) {
  const population = propertyNumber(properties, ['he_vakiy', 'vaesto', 'population'])
  const employed = propertyNumber(properties, ['pt_tyoll', 'tyoll'])
  const unemployed = propertyNumber(properties, ['pt_tyott', 'tyot'])
  const students = propertyNumber(properties, ['pt_opisk', 'opisk'])
  // Paavo WFS: hr_tuy is residents aged 18+ total, hr_ktu is average income, and hr_mtu is median income.
  const averageIncome = propertyNumber(properties, ['hr_ktu', 'hr_tulot', 'tulot'])
  const share = (value) =>
    value === null || population === null || population <= 0 ? null : (value / population) * 100
  return {
    population,
    employed,
    unemployed,
    students,
    average_income: averageIncome,
    employed_share: share(employed),
    unemployed_share: share(unemployed),
    student_share: share(students),
  }
}

async function main() {
  const majorSnapshot = JSON.parse(await readFile(MAJOR_BOUNDARIES, 'utf8'))
  if (majorSnapshot.type !== 'FeatureCollection' || !Array.isArray(majorSnapshot.features)) {
    throw new Error('Generated Vaasa suuralue snapshot is unavailable or invalid')
  }
  const bounds = boundsForFeatures(majorSnapshot.features)
  const releases = await availableReleases()
  const historyByCode = {}
  let latestCollection = null
  let latestSourceUrl = ''
  let latestReleaseYear = 0

  for (const releaseYear of releases) {
    const statisticsYear = releaseYear - 2
    const { url, payload } = await fetchRelease(releaseYear, bounds)
    const vaasaFeatures = payload.features.filter((feature) =>
      intersectsVaasa(feature, majorSnapshot.features),
    )
    for (const feature of vaasaFeatures) {
      const code = postalCode(feature.properties ?? {})
      if (!code) continue
      const metrics = normalizedMetrics(feature.properties ?? {})
      historyByCode[code] ??= []
      historyByCode[code].push({ year: statisticsYear, ...metrics })
    }

    if (releaseYear > latestReleaseYear) {
      latestReleaseYear = releaseYear
      latestSourceUrl = url
      latestCollection = {
        type: 'FeatureCollection',
        metadata: {
          generated_at: new Date().toISOString(),
          source: 'Statistics Finland Paavo',
          source_url: url,
          licence: 'CC BY 4.0',
          release_year: releaseYear,
          statistics_year: statisticsYear,
        },
        features: vaasaFeatures.flatMap((feature) => {
          const code = postalCode(feature.properties ?? {})
          if (!code) return []
          return [
            {
              type: 'Feature',
              id: code,
              properties: {
                code,
                name_fi: String(feature.properties?.nimi ?? code),
                name_sv: String(feature.properties?.namn ?? feature.properties?.nimi ?? code),
                statistics_year: statisticsYear,
                ...normalizedMetrics(feature.properties ?? {}),
              },
              geometry: feature.geometry,
            },
          ]
        }),
      }
    }
  }

  if (!latestCollection || latestCollection.features.length === 0) {
    throw new Error('No Paavo postal-code features intersecting Vaasa were generated')
  }

  for (const observations of Object.values(historyByCode)) {
    observations.sort((a, b) => a.year - b.year)
  }

  const history = {
    generated_at: new Date().toISOString(),
    source: 'Statistics Finland Paavo WFS versioned layers',
    source_url: latestSourceUrl,
    licence: 'CC BY 4.0',
    latest_release_year: latestReleaseYear,
    latest_statistics_year: latestReleaseYear - 2,
    years: releases.map((year) => year - 2),
    areas: historyByCode,
  }

  await writeFile(CURRENT_OUTPUT, `${JSON.stringify(latestCollection)}\n`)
  await writeFile(HISTORY_OUTPUT, `${JSON.stringify(history)}\n`)
  console.log(
    `Paavo snapshot updated: ${latestCollection.features.length} Vaasa postal areas, ${history.years.length} statistical years (${history.years[0]}-${history.years.at(-1)}).`,
  )
}

await main()
