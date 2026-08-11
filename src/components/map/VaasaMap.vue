<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type FeatureGroup, type Map as LeafletMap, type PathOptions } from 'leaflet'

import { AREAS } from '@/config/areas'
import { BOUNDARY_LAYERS } from '@/config/boundaries'
import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaBoundary, AreaLevel, PienalueBoundary } from '@/domain/areas'
import type { BoundaryLevel } from '@/domain/boundaries'
import type { MajorAreaPopulationHistoryDatabase } from '@/domain/populationHistory'
import type { AreaStatisticsDatabase, CompactAreaStatisticRecord } from '@/domain/statistics'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchStatisticsDatabase, statisticsKey } from '@/services/areaStatistics'
import { fetchAreaRecords, fetchPienalueBoundaries } from '@/services/boundaryData'
import { fetchMajorAreaPopulationHistoryDatabase } from '@/services/populationHistory'

type VisualizationMetric =
  | 'none'
  | 'population'
  | 'employment'
  | 'students'
  | 'language-finnish'
  | 'language-swedish'
  | 'language-other'

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const selectedLevel = ref<BoundaryLevel>('suuralue')
const visualizationMetric = ref<VisualizationMetric>('none')
const mappedAreaCount = ref(0)
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const statisticsDatabase = ref<AreaStatisticsDatabase | null>(null)
const majorPopulationDatabase = ref<MajorAreaPopulationHistoryDatabase | null>(null)
let map: LeafletMap | null = null
let areaGroup: FeatureGroup | null = null
let cachedSuuralueBoundaries: Map<string, AreaBoundary> | null = null
let cachedPienalueBoundaries: PienalueBoundary[] | null = null
let renderToken = 0

const selectedLayer = computed(
  () => BOUNDARY_LAYERS.find((layer) => layer.id === selectedLevel.value) ?? BOUNDARY_LAYERS[0],
)
const selectedLayerLabel = computed(() =>
  selectedLevel.value === 'suuralue' ? t('majorAreas') : t('minorAreas'),
)
const isLanguageMetric = computed(() => visualizationMetric.value.startsWith('language-'))
const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)
const populationFilterLabel = computed(() => {
  const year = selectedLevel.value === 'suuralue' ? 2024 : 2015
  return `${t('populationView')} (${numberFormatter.value.format(year)})`
})

const mapStatus = computed(() => {
  if (isLoading.value) return t('loading')
  if (loadError.value) return loadError.value
  return `${mappedAreaCount.value}/${selectedLayer.value?.areaCount ?? 0} ${t('mapped')}`
})

function clearBoundaryLayers(): void {
  areaGroup?.clearLayers()
}

function openArea(slug: string): void {
  window.location.href = buildUrl({ area: slug })
}

function openPienalue(relationId: number): void {
  window.location.href = buildUrl({ pienalue: relationId })
}

function fitRenderedBounds(): void {
  if (!map || !areaGroup) return
  const bounds = areaGroup.getBounds()
  if (mappedAreaCount.value > 0 && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] })
  }
}

function compactStatistics(level: AreaLevel, name: string): CompactAreaStatisticRecord | null {
  return statisticsDatabase.value?.areas[statisticsKey(level, name)] ?? null
}

function latestMajorPopulation(name: string): number | null {
  const observation = majorPopulationDatabase.value?.areas[name]?.at(-1)
  return observation?.[1] ?? null
}

function metricValue(
  level: AreaLevel,
  name: string,
  record: CompactAreaStatisticRecord,
): number {
  switch (visualizationMetric.value) {
    case 'population':
      return level === 'suuralue' ? (latestMajorPopulation(name) ?? record.p) : record.p
    case 'employment':
      return record.e
    case 'students':
      return record.s
    case 'language-finnish':
      return record.l[0]
    case 'language-swedish':
      return record.l[1]
    case 'language-other':
      return record.l[2]
    default:
      return 0
  }
}

function metricColor(): string {
  switch (visualizationMetric.value) {
    case 'population':
      return '#0b3d3a'
    case 'employment':
      return '#17645d'
    case 'students':
      return '#8a5f21'
    case 'language-finnish':
      return '#2878a8'
    case 'language-swedish':
      return '#d39a19'
    case 'language-other':
      return '#7a4b9d'
    default:
      return '#17645d'
  }
}

function metricLabel(level: AreaLevel): string {
  if (visualizationMetric.value === 'population') {
    const year = level === 'suuralue' ? 2024 : 2015
    return `${t('population')} · ${numberFormatter.value.format(year)}`
  }
  switch (visualizationMetric.value) {
    case 'employment':
      return t('employed')
    case 'students':
      return t('students')
    case 'language-finnish':
      return t('finnish')
    case 'language-swedish':
      return t('swedish')
    case 'language-other':
      return t('otherLanguages')
    default:
      return ''
  }
}

function metricRange(level: AreaLevel): { min: number; max: number } | null {
  if (!statisticsDatabase.value || visualizationMetric.value === 'none') return null

  if (visualizationMetric.value === 'population' && level === 'suuralue') {
    const values = Object.values(majorPopulationDatabase.value?.areas ?? {})
      .map((observations) => observations.at(-1)?.[1])
      .filter((value): value is number => value !== undefined)
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null
  }

  const prefix = `${level}:`
  const values = Object.entries(statisticsDatabase.value.areas)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, record]) => metricValue(level, key.slice(prefix.length), record))
  if (values.length === 0) return null
  return { min: Math.min(...values), max: Math.max(...values) }
}

function polygonStyle(
  level: AreaLevel,
  name: string,
  defaultColor: string,
  defaultOpacity: number,
): PathOptions {
  if (visualizationMetric.value === 'none') {
    return {
      color: defaultColor,
      weight: level === 'suuralue' ? 3 : 2,
      opacity: 0.95,
      fillColor: defaultColor,
      fillOpacity: defaultOpacity,
    }
  }

  const record = compactStatistics(level, name)
  const range = metricRange(level)
  if (!record || !range) {
    return {
      color: '#7b8582',
      weight: level === 'suuralue' ? 3 : 2,
      opacity: 0.7,
      fillColor: '#aeb6b3',
      fillOpacity: 0.08,
    }
  }

  const value = metricValue(level, name, record)
  const normalized = range.max === range.min ? 0.5 : (value - range.min) / (range.max - range.min)
  const color = metricColor()
  return {
    color,
    weight: level === 'suuralue' ? 3 : 2,
    opacity: 0.95,
    fillColor: color,
    fillOpacity: 0.16 + normalized * 0.62,
  }
}

function metricTooltip(level: AreaLevel, name: string): string {
  if (visualizationMetric.value === 'none') return ''
  const record = compactStatistics(level, name)
  if (!record) return ''
  const value = metricValue(level, name, record)
  const formatted =
    visualizationMetric.value === 'population'
      ? numberFormatter.value.format(value)
      : `${percentFormatter.value.format(value)}%`
  return ` · ${metricLabel(level)}: ${formatted}`
}

async function ensureStatistics(): Promise<void> {
  if (visualizationMetric.value === 'none') return
  statisticsDatabase.value ??= await fetchStatisticsDatabase()
  if (
    visualizationMetric.value === 'population' &&
    selectedLevel.value === 'suuralue' &&
    !majorPopulationDatabase.value
  ) {
    majorPopulationDatabase.value = await fetchMajorAreaPopulationHistoryDatabase()
  }
}

async function renderSuuralueBoundaries(token: number): Promise<void> {
  if (!map || !areaGroup) return

  mappedAreaCount.value = 0
  isLoading.value = true
  loadError.value = null

  try {
    await ensureStatistics()
    cachedSuuralueBoundaries ??= await fetchAreaRecords(AREAS)
    if (token !== renderToken || selectedLevel.value !== 'suuralue') return

    let rendered = 0
    for (const area of AREAS) {
      const boundary = cachedSuuralueBoundaries.get(area.slug)
      if (!boundary) continue

      const style = polygonStyle('suuralue', area.name, '#de6d45', 0.13)
      const polygon = L.polygon(boundary.rings, { ...style, interactive: true }).addTo(areaGroup)
      const name = localizeAreaName(boundary.names, area.name, language.value)
      polygon.bindTooltip(
        `${area.ref} · ${name}${metricTooltip('suuralue', area.name)} · ${t('clickForDetails')}`,
        { sticky: true },
      )
      polygon.on('click', () => openArea(area.slug))
      polygon.on('mouseover', () =>
        polygon.setStyle({
          weight: 5,
          fillOpacity: Math.min(0.92, Number(style.fillOpacity ?? 0.2) + 0.16),
        }),
      )
      polygon.on('mouseout', () => polygon.setStyle(style))
      rendered += 1
    }

    mappedAreaCount.value = rendered
    isLoading.value = false
    fitRenderedBounds()
  } catch (error) {
    if (token !== renderToken) return
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : t('loadingAreaFailed')
  }
}

async function renderPienalueBoundaries(token: number): Promise<void> {
  if (!map || !areaGroup) return

  mappedAreaCount.value = 0
  isLoading.value = true
  loadError.value = null

  try {
    await ensureStatistics()
    cachedPienalueBoundaries ??= await fetchPienalueBoundaries(AREAS)
    if (token !== renderToken || selectedLevel.value !== 'pienalue') return

    let rendered = 0
    for (const area of cachedPienalueBoundaries) {
      const style = polygonStyle('pienalue', area.name, '#17645d', 0.12)
      const polygon = L.polygon(area.rings, { ...style, interactive: true }).addTo(areaGroup)
      const reference = area.ref ? `${area.ref} · ` : ''
      const name = localizeAreaName(area.names, area.name, language.value)
      const parentName = localizeAreaName(area.parentNames, area.parentName, language.value)
      polygon.bindTooltip(
        `${reference}${name} · ${parentName}${metricTooltip('pienalue', area.name)} · ${t('clickForDetails')}`,
        { sticky: true },
      )
      polygon.on('click', () => openPienalue(area.relationId))
      polygon.on('mouseover', () =>
        polygon.setStyle({
          weight: 4,
          fillOpacity: Math.min(0.92, Number(style.fillOpacity ?? 0.2) + 0.16),
        }),
      )
      polygon.on('mouseout', () => polygon.setStyle(style))
      rendered += 1
    }

    mappedAreaCount.value = rendered
    isLoading.value = false
    fitRenderedBounds()
  } catch (error) {
    if (token !== renderToken) return
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : t('loadingAreaFailed')
  }
}

async function renderBoundaryLayer(): Promise<void> {
  if (!map) return
  renderToken += 1
  const token = renderToken
  clearBoundaryLayers()
  if (selectedLevel.value === 'suuralue') {
    await renderSuuralueBoundaries(token)
    return
  }
  await renderPienalueBoundaries(token)
}

function selectLevel(level: BoundaryLevel): void {
  selectedLevel.value = level
}

function selectMetric(metric: VisualizationMetric): void {
  visualizationMetric.value = metric
}

function selectLanguageMetric(): void {
  if (!isLanguageMetric.value) visualizationMetric.value = 'language-finnish'
}

onMounted(() => {
  if (!mapElement.value) return
  map = L.map(mapElement.value, { zoomControl: true, scrollWheelZoom: true }).setView(
    VAASA_CENTER,
    INITIAL_ZOOM,
  )
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)
  areaGroup = L.featureGroup().addTo(map)
  void renderBoundaryLayer()
})

watch([selectedLevel, visualizationMetric], () => {
  void renderBoundaryLayer()
})

onBeforeUnmount(() => {
  renderToken += 1
  clearBoundaryLayers()
  areaGroup?.remove()
  areaGroup = null
  map?.remove()
  map = null
})
</script>

<template>
  <section class="map-card" aria-labelledby="map-title">
    <div class="map-card__header">
      <div>
        <p class="eyebrow">{{ t('interactiveMap') }}</p>
        <h2 id="map-title">{{ t('statisticalAreas') }}</h2>
      </div>
      <span class="map-card__status">{{ mapStatus }}</span>
    </div>

    <div class="boundary-level-control" :aria-label="t('boundaryLevel')">
      <button
        v-for="layer in BOUNDARY_LAYERS"
        :key="layer.id"
        type="button"
        :class="['boundary-level-control__button', { 'is-active': selectedLevel === layer.id }]"
        :aria-pressed="selectedLevel === layer.id"
        @click="selectLevel(layer.id)"
      >
        <strong>{{ layer.id === 'suuralue' ? t('majorAreas') : t('minorAreas') }}</strong>
        <span>{{ layer.areaCount }} {{ t('areas') }}</span>
      </button>
    </div>

    <div class="map-visualization-control" :aria-label="t('colorMapBy')">
      <span class="map-visualization-control__label">{{ t('colorMapBy') }}</span>
      <div class="map-visualization-control__buttons">
        <button type="button" :class="{ 'is-active': visualizationMetric === 'none' }" @click="selectMetric('none')">
          {{ t('normalView') }}
        </button>
        <button type="button" :class="{ 'is-active': visualizationMetric === 'population' }" @click="selectMetric('population')">
          {{ populationFilterLabel }}
        </button>
        <button type="button" :class="{ 'is-active': visualizationMetric === 'employment' }" @click="selectMetric('employment')">
          {{ t('employmentView') }}
        </button>
        <button type="button" :class="{ 'is-active': visualizationMetric === 'students' }" @click="selectMetric('students')">
          {{ t('studentsView') }}
        </button>
        <button type="button" :class="{ 'is-active': isLanguageMetric }" @click="selectLanguageMetric">
          {{ t('languageView') }}
        </button>
      </div>
      <div v-if="isLanguageMetric" class="map-language-subcontrol">
        <button type="button" :class="{ 'is-active': visualizationMetric === 'language-finnish' }" @click="selectMetric('language-finnish')">
          {{ t('finnish') }}
        </button>
        <button type="button" :class="{ 'is-active': visualizationMetric === 'language-swedish' }" @click="selectMetric('language-swedish')">
          {{ t('swedish') }}
        </button>
        <button type="button" :class="{ 'is-active': visualizationMetric === 'language-other' }" @click="selectMetric('language-other')">
          {{ t('otherLanguages') }}
        </button>
      </div>
    </div>

    <div ref="mapElement" class="map-canvas" role="region" :aria-label="`${t('statisticalAreas')} · ${selectedLayerLabel}`" />
  </section>
</template>
