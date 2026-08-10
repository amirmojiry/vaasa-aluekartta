<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type FeatureGroup, type Map as LeafletMap } from 'leaflet'

import { AREAS } from '@/config/areas'
import { BOUNDARY_LAYERS } from '@/config/boundaries'
import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaBoundary, PienalueBoundary } from '@/domain/areas'
import type { BoundaryLevel } from '@/domain/boundaries'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchAreaRecords, fetchPienalueBoundaries } from '@/services/boundaryData'

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const selectedLevel = ref<BoundaryLevel>('suuralue')
const mappedAreaCount = ref(0)
const isLoading = ref(true)
const loadError = ref<string | null>(null)
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

async function renderSuuralueBoundaries(token: number): Promise<void> {
  if (!map || !areaGroup) return

  mappedAreaCount.value = 0
  isLoading.value = true
  loadError.value = null

  try {
    cachedSuuralueBoundaries ??= await fetchAreaRecords(AREAS)
    if (token !== renderToken || selectedLevel.value !== 'suuralue') return

    let rendered = 0

    for (const area of AREAS) {
      const boundary = cachedSuuralueBoundaries.get(area.slug)
      if (!boundary) continue

      const polygon = L.polygon(boundary.rings, {
        color: '#de6d45',
        weight: 3,
        opacity: 0.95,
        fillColor: '#de6d45',
        fillOpacity: 0.13,
        interactive: true,
      }).addTo(areaGroup)

      const name = localizeAreaName(boundary.names, area.name, language.value)
      polygon.bindTooltip(`${area.ref} · ${name} · ${t('clickForDetails')}`, { sticky: true })
      polygon.on('click', () => openArea(area.slug))
      polygon.on('mouseover', () => polygon.setStyle({ weight: 5, fillOpacity: 0.28 }))
      polygon.on('mouseout', () => polygon.setStyle({ weight: 3, fillOpacity: 0.13 }))
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
    cachedPienalueBoundaries ??= await fetchPienalueBoundaries(AREAS)
    if (token !== renderToken || selectedLevel.value !== 'pienalue') return

    let rendered = 0

    for (const area of cachedPienalueBoundaries) {
      const polygon = L.polygon(area.rings, {
        color: '#17645d',
        weight: 2,
        opacity: 0.95,
        fillColor: '#17645d',
        fillOpacity: 0.12,
        interactive: true,
      }).addTo(areaGroup)

      const reference = area.ref ? `${area.ref} · ` : ''
      const name = localizeAreaName(area.names, area.name, language.value)
      const parentName = localizeAreaName(area.parentNames, area.parentName, language.value)
      polygon.bindTooltip(`${reference}${name} · ${parentName} · ${t('clickForDetails')}`, {
        sticky: true,
      })
      polygon.on('click', () => openPienalue(area.relationId))
      polygon.on('mouseover', () => polygon.setStyle({ weight: 4, fillOpacity: 0.3 }))
      polygon.on('mouseout', () => polygon.setStyle({ weight: 2, fillOpacity: 0.12 }))
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

onMounted(() => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(VAASA_CENTER, INITIAL_ZOOM)

  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)
  areaGroup = L.featureGroup().addTo(map)
  void renderBoundaryLayer()
})

watch(selectedLevel, () => {
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

    <div
      ref="mapElement"
      class="map-canvas"
      role="region"
      :aria-label="`${t('statisticalAreas')} · ${selectedLayerLabel}`"
    />
  </section>
</template>
