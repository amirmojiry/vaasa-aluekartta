<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map } from 'leaflet'

import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'

const mapElement = ref<HTMLElement | null>(null)
let map: Map | null = null

onMounted(() => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(VAASA_CENTER, INITIAL_ZOOM)

  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <section class="map-card" aria-labelledby="map-title">
    <div class="map-card__header">
      <div>
        <p class="eyebrow">Interactive map</p>
        <h2 id="map-title">Vaasa and its surroundings</h2>
      </div>
      <span class="map-card__status">Base map ready</span>
    </div>

    <div
      ref="mapElement"
      class="map-canvas"
      role="region"
      aria-label="Interactive OpenStreetMap centred on Vaasa"
    />

    <p class="map-card__note">
      Official suuralue and pienalue boundaries will be added in Milestone 2.
    </p>
  </section>
</template>
