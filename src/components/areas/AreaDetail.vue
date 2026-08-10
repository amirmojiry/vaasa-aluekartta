<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map, type Polygon } from 'leaflet'

import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaDefinition } from '@/domain/areas'
import { fetchAreaBoundary } from '@/services/osmBoundary'

const props = defineProps<{ area: AreaDefinition }>()

const mapElement = ref<HTMLElement | null>(null)
const loadingMessage = ref('Loading boundary from OpenStreetMap…')
const homeHref = import.meta.env.BASE_URL
let map: Map | null = null
let polygon: Polygon | null = null

onMounted(async () => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 11)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)

  try {
    const rings = await fetchAreaBoundary(props.area)
    polygon = L.polygon(rings, {
      color: '#de6d45',
      weight: 4,
      opacity: 1,
      fillColor: '#de6d45',
      fillOpacity: 0.16,
    }).addTo(map)
    polygon.bindTooltip(`${props.area.ref} · ${props.area.name}`, { sticky: true })

    const bounds = polygon.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
    loadingMessage.value = 'Live OSM boundary loaded.'
  } catch (error) {
    loadingMessage.value =
      error instanceof Error
        ? `Boundary loading failed: ${error.message}`
        : 'Boundary loading failed.'
  }
})

onBeforeUnmount(() => {
  polygon?.remove()
  polygon = null
  map?.remove()
  map = null
})
</script>

<template>
  <main class="area-detail-page">
    <header class="area-detail-hero">
      <div class="area-detail-hero__inner">
        <a class="area-back-link" :href="homeHref">← Back to Vaasa map</a>
        <p class="eyebrow">Suuralue {{ area.ref }}</p>
        <h1>{{ area.name }}</h1>
        <p>
          This page renders the administrative boundary directly from the OpenStreetMap way members
          listed in relation {{ area.relationId }}.
        </p>
      </div>
    </header>

    <section class="area-detail-layout">
      <article class="map-card area-detail-map-card">
        <div class="map-card__header">
          <div>
            <p class="eyebrow">Boundary</p>
            <h2>{{ area.name }} on OpenStreetMap</h2>
          </div>
          <span class="map-card__status">{{ loadingMessage }}</span>
        </div>
        <div
          ref="mapElement"
          class="map-canvas area-detail-map"
          role="region"
          :aria-label="`${area.name} boundary on OpenStreetMap`"
        />
      </article>

      <aside class="info-panel area-detail-info">
        <p class="eyebrow">OSM metadata</p>
        <h2>{{ area.name }}</h2>
        <dl class="feature-list">
          <div>
            <dt>Reference</dt>
            <dd>{{ area.ref }}</dd>
          </div>
          <div>
            <dt>Admin level</dt>
            <dd>9 · suuralue</dd>
          </div>
          <div>
            <dt>OSM relation</dt>
            <dd>
              <a
                :href="`https://www.openstreetmap.org/relation/${area.relationId}`"
                target="_blank"
                rel="noreferrer"
              >
                {{ area.relationId }}
              </a>
            </dd>
          </div>
          <div>
            <dt>Outer ways</dt>
            <dd>{{ area.outerWayIds.length }}</dd>
          </div>
          <div>
            <dt>Pienalue relations</dt>
            <dd>{{ area.subareaRelationIds.length }}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{{ area.source }}</dd>
          </div>
        </dl>

        <div class="subarea-list">
          <h3>Child relation IDs</h3>
          <code v-for="relationId in area.subareaRelationIds" :key="relationId">
            {{ relationId }}
          </code>
        </div>
      </aside>
    </section>
  </main>
</template>
