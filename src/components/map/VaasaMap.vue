<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type ImageOverlay, type LayerGroup, type Map, type Polygon } from 'leaflet'

import { GERBY_AREA } from '@/config/areas'
import { BOUNDARY_LAYERS, VAASA_BOUNDARY_BOUNDS } from '@/config/boundaries'
import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { BoundaryLevel } from '@/domain/boundaries'
import { fetchAreaBoundary } from '@/services/osmBoundary'

const mapElement = ref<HTMLElement | null>(null)
const selectedLevel = ref<BoundaryLevel>('suuralue')
const mappedAreaCount = ref(0)
const boundaryState = ref('Loading Gerby…')
let map: Map | null = null
let boundaryOverlay: ImageOverlay | null = null
let areaGroup: LayerGroup | null = null
let areaPolygon: Polygon | null = null
let renderToken = 0

const selectedLayer = computed(
  () => BOUNDARY_LAYERS.find((layer) => layer.id === selectedLevel.value) ?? BOUNDARY_LAYERS[0],
)

const mapStatus = computed(() => {
  if (selectedLevel.value === 'suuralue') return `${mappedAreaCount.value}/12 mapped`
  return `${selectedLayer.value?.areaCount ?? 0} areas`
})

function clearBoundaryLayers(): void {
  boundaryOverlay?.remove()
  boundaryOverlay = null
  areaPolygon = null
  areaGroup?.clearLayers()
}

function openArea(slug: string): void {
  window.location.href = `${import.meta.env.BASE_URL}?area=${encodeURIComponent(slug)}`
}

async function renderGerbyBoundary(token: number): Promise<void> {
  if (!map || !areaGroup) return

  mappedAreaCount.value = 0
  boundaryState.value = 'Loading Gerby from OpenStreetMap…'

  try {
    const rings = await fetchAreaBoundary(GERBY_AREA)
    if (token !== renderToken || selectedLevel.value !== 'suuralue') return

    areaPolygon = L.polygon(rings, {
      color: '#de6d45',
      weight: 4,
      opacity: 1,
      fillColor: '#de6d45',
      fillOpacity: 0.18,
      interactive: true,
    }).addTo(areaGroup)

    areaPolygon.bindTooltip('05 · Gerby · click for details', { sticky: true })
    areaPolygon.on('click', () => openArea(GERBY_AREA.slug))
    mappedAreaCount.value = 1
    boundaryState.value = 'Gerby boundary loaded. Click the polygon to open its page.'
  } catch (error) {
    if (token !== renderToken) return
    boundaryState.value =
      error instanceof Error ? `Could not load Gerby: ${error.message}` : 'Could not load Gerby.'
  }
}

function renderPienalueReference(): void {
  if (!map || !selectedLayer.value) return

  boundaryOverlay = L.imageOverlay(selectedLayer.value.imageUrl, VAASA_BOUNDARY_BOUNDS, {
    opacity: 0.72,
    alt: `${selectedLayer.value.label} boundary reference map`,
    interactive: false,
    crossOrigin: true,
  }).addTo(map)
  boundaryState.value = 'Reference artwork; vector pienalue boundaries have not been added yet.'
}

async function renderBoundaryLayer(): Promise<void> {
  if (!map) return

  renderToken += 1
  const token = renderToken
  clearBoundaryLayers()

  if (selectedLevel.value === 'suuralue') {
    await renderGerbyBoundary(token)
    return
  }

  mappedAreaCount.value = 0
  renderPienalueReference()
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
  areaGroup = L.layerGroup().addTo(map)
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
      <template v-if="selectedLevel === 'suuralue'">
        <p>{{ boundaryState }}</p>
        <p>
          Gerby is drawn from OSM relation {{ GERBY_AREA.relationId }} using the outer way IDs from
          the supplied relation XML. This is the pattern we can repeat for the other 11 suuralueet.
        </p>
      </template>
      <template v-else>
        <p>{{ boundaryState }}</p>
        <p>
          Boundary artwork by
          <a :href="selectedLayer?.sourcePageUrl" target="_blank" rel="noreferrer">
            {{ selectedLayer?.author }} / Wikimedia Commons
          </a>
          ({{ selectedLayer?.licence }}).
        </p>
      </template>
    </div>
  </section>
</template>
