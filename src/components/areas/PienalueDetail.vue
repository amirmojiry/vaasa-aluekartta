<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map, type Polygon } from 'leaflet'

import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { PienalueBoundary } from '@/domain/areas'
import { fetchPienalueBoundary } from '@/services/boundaryData'

const props = defineProps<{ relationId: number }>()

const mapElement = ref<HTMLElement | null>(null)
const loadingMessage = ref('Loading pienalue boundary from local GeoJSON…')
const boundary = ref<PienalueBoundary | null>(null)
const homeHref = import.meta.env.BASE_URL
let map: Map | null = null
let polygon: Polygon | null = null

const title = computed(() => boundary.value?.name ?? `Pienalue ${props.relationId}`)
const parentHref = computed(() =>
  boundary.value
    ? `${import.meta.env.BASE_URL}?area=${encodeURIComponent(boundary.value.parentSlug)}`
    : homeHref,
)

onMounted(async () => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 11)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)

  try {
    const result = await fetchPienalueBoundary(props.relationId, AREAS)
    boundary.value = result
    polygon = L.polygon(result.rings, {
      color: '#17645d',
      weight: 4,
      opacity: 1,
      fillColor: '#17645d',
      fillOpacity: 0.16,
    }).addTo(map)
    polygon.bindTooltip(`${result.ref ? `${result.ref} · ` : ''}${result.name}`, { sticky: true })

    const bounds = polygon.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
    loadingMessage.value = 'Local GeoJSON pienalue boundary loaded.'
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
        <p class="eyebrow">Pienalue {{ boundary?.ref || relationId }}</p>
        <h1>{{ title }}</h1>
        <p>
          This page renders a locally hosted GeoJSON snapshot generated from OpenStreetMap relation
          {{ relationId }}.
        </p>
      </div>
    </header>

    <section class="area-detail-layout">
      <article class="map-card area-detail-map-card">
        <div class="map-card__header">
          <div>
            <p class="eyebrow">Boundary</p>
            <h2>{{ title }} on OpenStreetMap</h2>
          </div>
          <span class="map-card__status">{{ loadingMessage }}</span>
        </div>
        <div
          ref="mapElement"
          class="map-canvas area-detail-map"
          role="region"
          :aria-label="`${title} boundary on OpenStreetMap`"
        />
      </article>

      <aside class="info-panel area-detail-info">
        <p class="eyebrow">OSM metadata</p>
        <h2>{{ title }}</h2>
        <dl class="feature-list">
          <div>
            <dt>Reference</dt>
            <dd>{{ boundary?.ref || 'Not tagged' }}</dd>
          </div>
          <div>
            <dt>Admin level</dt>
            <dd>10 · pienalue</dd>
          </div>
          <div>
            <dt>Parent suuralue</dt>
            <dd>
              <a v-if="boundary" :href="parentHref">
                {{ boundary.parentRef }} · {{ boundary.parentName }}
              </a>
              <span v-else>Loading…</span>
            </dd>
          </div>
          <div>
            <dt>OSM relation</dt>
            <dd>
              <a
                :href="`https://www.openstreetmap.org/relation/${relationId}`"
                target="_blank"
                rel="noreferrer"
              >
                {{ relationId }}
              </a>
            </dd>
          </div>
          <div>
            <dt>Outer ways</dt>
            <dd>{{ boundary?.outerWayIds.length ?? 'Loading…' }}</dd>
          </div>
          <div>
            <dt>Boundary delivery</dt>
            <dd>Local GeoJSON snapshot served by this site</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{{ boundary?.source ?? 'Loading snapshot metadata…' }}</dd>
          </div>
        </dl>
      </aside>
    </section>
  </main>
</template>
