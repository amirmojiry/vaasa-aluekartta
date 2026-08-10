<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type FeatureGroup, type Map as LeafletMap } from 'leaflet'

import { AREAS } from '@/config/areas'
import { BOUNDARY_LAYERS } from '@/config/boundaries'
import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { BoundaryRing, PienalueBoundary } from '@/domain/areas'
import type { BoundaryLevel } from '@/domain/boundaries'
import { fetchAreaBoundaries, fetchPienalueBoundaries } from '@/services/boundaryData'

const CURRENT_OSM_PIENALUE_COUNT = 55

const mapElement = ref<HTMLElement | null>(null)
const selectedLevel = ref<BoundaryLevel>('suuralue')
const mappedAreaCount = ref(0)
const boundaryState = ref('Loading local suuralue boundary snapshot…')
let map: LeafletMap | null = null
let areaGroup: FeatureGroup | null = null
let cachedSuuralueBoundaries: Map<string, BoundaryRing[]> | null = null
let cachedPienalueBoundaries: PienalueBoundary[] | null = null
let renderToken = 0

const selectedLayer = computed(
  () => BOUNDARY_LAYERS.find((layer) => layer.id === selectedLevel.value) ?? BOUNDARY_LAYERS[0],
)

const mapStatus = computed(
  () => `${mappedAreaCount.value}/${selectedLayer.value?.areaCount ?? 0} mapped`,
)

function clearBoundaryLayers(): void {
  areaGroup?.clearLayers()
}

function openArea(slug: string): void {
  window.location.href = `${import.meta.env.BASE_URL}?area=${encodeURIComponent(slug)}`
}

function openPienalue(relationId: number): void {
  window.location.href = `${import.meta.env.BASE_URL}?pienalue=${relationId}`
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
  boundaryState.value = 'Loading 12 suuralue boundaries from the local GeoJSON snapshot…'

  try {
    cachedSuuralueBoundaries ??= await fetchAreaBoundaries(AREAS)
    if (token !== renderToken || selectedLevel.value !== 'suuralue') return

    let rendered = 0

    for (const area of AREAS) {
      const rings = cachedSuuralueBoundaries.get(area.slug)
      if (!rings) continue

      const polygon = L.polygon(rings, {
        color: '#de6d45',
        weight: 3,
        opacity: 0.95,
        fillColor: '#de6d45',
        fillOpacity: 0.13,
        interactive: true,
      }).addTo(areaGroup)

      polygon.bindTooltip(`${area.ref} · ${area.name} · click for details`, { sticky: true })
      polygon.on('click', () => openArea(area.slug))
      polygon.on('mouseover', () => polygon.setStyle({ weight: 5, fillOpacity: 0.28 }))
      polygon.on('mouseout', () => polygon.setStyle({ weight: 3, fillOpacity: 0.13 }))
      rendered += 1
    }

    mappedAreaCount.value = rendered
    fitRenderedBounds()
    boundaryState.value =
      rendered === AREAS.length
        ? 'All 12 suuralue boundaries loaded locally. No live Overpass request was needed.'
        : `Loaded ${rendered} of ${AREAS.length} suuralue boundaries from the local snapshot.`
  } catch (error) {
    if (token !== renderToken) return
    boundaryState.value =
      error instanceof Error
        ? `Could not load local suuralue boundaries: ${error.message}`
        : 'Could not load local suuralue boundaries.'
  }
}

async function renderPienalueBoundaries(token: number): Promise<void> {
  if (!map || !areaGroup) return

  mappedAreaCount.value = 0
  boundaryState.value = 'Loading available pienalue boundaries from the local GeoJSON snapshot…'

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
      polygon.bindTooltip(`${reference}${area.name} · ${area.parentName} · click for details`, {
        sticky: true,
      })
      polygon.on('click', () => openPienalue(area.relationId))
      polygon.on('mouseover', () => polygon.setStyle({ weight: 4, fillOpacity: 0.3 }))
      polygon.on('mouseout', () => polygon.setStyle({ weight: 2, fillOpacity: 0.12 }))
      rendered += 1
    }

    mappedAreaCount.value = rendered
    fitRenderedBounds()
    boundaryState.value =
      rendered === CURRENT_OSM_PIENALUE_COUNT
        ? '55 OSM pienalue boundaries loaded locally. The five Vähäkyrö pienalue boundaries are not present in the current OSM hierarchy snapshot.'
        : `Loaded ${rendered} of ${CURRENT_OSM_PIENALUE_COUNT} currently available OSM pienalue boundaries.`
  } catch (error) {
    if (token !== renderToken) return
    boundaryState.value =
      error instanceof Error
        ? `Could not load local pienalue boundaries: ${error.message}`
        : 'Could not load local pienalue boundaries.'
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
        <p class="eyebrow">Interactive map</p>
        <h2 id="map-title">Vaasa statistical areas</h2>
      </div>
      <span class="map-card__status">{{ mapStatus }}</span>
    </div>

    <div class="boundary-level-control" aria-label="Boundary level">
      <button
        v-for="layer in BOUNDARY_LAYERS"
        :key="layer.id"
        type="button"
        :class="['boundary-level-control__button', { 'is-active': selectedLevel === layer.id }]"
        :aria-pressed="selectedLevel === layer.id"
        @click="selectLevel(layer.id)"
      >
        <strong>{{ layer.label }}</strong>
        <span>{{ layer.areaCount }} areas</span>
      </button>
    </div>

    <div
      ref="mapElement"
      class="map-canvas"
      role="region"
      :aria-label="`OpenStreetMap with ${selectedLayer?.label} boundaries`"
    />

    <div class="map-card__note">
      <p>{{ boundaryState }}</p>
      <p>
        Boundary geometry is served as static GeoJSON from this GitHub Pages site. OpenStreetMap is
        contacted only when the deployment snapshot is regenerated; visitors do not query boundary
        APIs.
      </p>
    </div>
  </section>
</template>
