<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type FeatureGroup, type ImageOverlay, type Map as LeafletMap } from 'leaflet'

import { AREAS } from '@/config/areas'
import { BOUNDARY_LAYERS, VAASA_BOUNDARY_BOUNDS } from '@/config/boundaries'
import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { BoundaryRing } from '@/domain/areas'
import type { BoundaryLevel } from '@/domain/boundaries'
import { fetchAreaBoundaries } from '@/services/osmBoundary'

const mapElement = ref<HTMLElement | null>(null)
const selectedLevel = ref<BoundaryLevel>('suuralue')
const mappedAreaCount = ref(0)
const boundaryState = ref('Loading Vaasa suuralueet…')
let map: LeafletMap | null = null
let boundaryOverlay: ImageOverlay | null = null
let areaGroup: FeatureGroup | null = null
let cachedBoundaries: Map<string, BoundaryRing[]> | null = null
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
  areaGroup?.clearLayers()
}

function openArea(slug: string): void {
  window.location.href = `${import.meta.env.BASE_URL}?area=${encodeURIComponent(slug)}`
}

async function renderSuuralueBoundaries(token: number): Promise<void> {
  if (!map || !areaGroup) return

  mappedAreaCount.value = 0
  boundaryState.value = 'Loading 12 suuralue boundaries from OpenStreetMap…'

  try {
    cachedBoundaries ??= await fetchAreaBoundaries(AREAS)
    if (token !== renderToken || selectedLevel.value !== 'suuralue') return

    let rendered = 0

    for (const area of AREAS) {
      const rings = cachedBoundaries.get(area.slug)
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

    const bounds = areaGroup.getBounds()
    if (rendered > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] })
    }

    boundaryState.value =
      rendered === AREAS.length
        ? 'All 12 suuralue boundaries loaded. Click any polygon to open its page.'
        : `Loaded ${rendered} of ${AREAS.length} suuralue boundaries from OSM.`
  } catch (error) {
    if (token !== renderToken) return
    boundaryState.value =
      error instanceof Error
        ? `Could not load suuralue boundaries: ${error.message}`
        : 'Could not load suuralue boundaries.'
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
    await renderSuuralueBoundaries(token)
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
      <template v-if="selectedLevel === 'suuralue'">
        <p>{{ boundaryState }}</p>
        <p>
          The 12 polygons are assembled from the outer way members of the supplied OSM admin_level=9
          relations. Hover to highlight an area and click it for details.
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
