<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type ImageOverlay, type Map } from 'leaflet'

import { BOUNDARY_LAYERS, VAASA_BOUNDARY_BOUNDS } from '@/config/boundaries'
import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { BoundaryLevel } from '@/domain/boundaries'

const mapElement = ref<HTMLElement | null>(null)
const selectedLevel = ref<BoundaryLevel>('suuralue')
let map: Map | null = null
let boundaryOverlay: ImageOverlay | null = null

const selectedLayer = computed(
  () => BOUNDARY_LAYERS.find((layer) => layer.id === selectedLevel.value) ?? BOUNDARY_LAYERS[0],
)

function renderBoundaryLayer(): void {
  if (!map || !selectedLayer.value) return

  boundaryOverlay?.remove()
  boundaryOverlay = L.imageOverlay(selectedLayer.value.imageUrl, VAASA_BOUNDARY_BOUNDS, {
    opacity: 0.72,
    alt: `${selectedLayer.value.label} boundary reference map`,
    interactive: false,
    crossOrigin: true,
  }).addTo(map)
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
  renderBoundaryLayer()
})

watch(selectedLevel, renderBoundaryLayer)

onBeforeUnmount(() => {
  boundaryOverlay?.remove()
  boundaryOverlay = null
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
      <span class="map-card__status">{{ selectedLayer?.areaCount }} areas</span>
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
      :aria-label="`OpenStreetMap with ${selectedLayer?.label} boundary reference layer`"
    />

    <div class="map-card__note">
      <p>{{ selectedLayer?.description }}</p>
      <p>
        Boundary artwork by
        <a :href="selectedLayer?.sourcePageUrl" target="_blank" rel="noreferrer">
          {{ selectedLayer?.author }} / Wikimedia Commons
        </a>
        ({{ selectedLayer?.licence }}). This is a cartographic reference overlay, not raw official
        municipal GeoJSON.
      </p>
    </div>
  </section>
</template>
