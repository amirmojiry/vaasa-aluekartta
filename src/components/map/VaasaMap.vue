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

const CURRENT_OSM_PIENALUE_COUNT = 55

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const selectedLevel = ref<BoundaryLevel>('suuralue')
const mappedAreaCount = ref(0)
const boundaryState = ref('')
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

const mapStatus = computed(
  () => `${mappedAreaCount.value}/${selectedLayer.value?.areaCount ?? 0} ${t('mapped')}`,
)

function localized(en: string, fa: string): string {
  return language.value === 'fa' ? fa : en
}

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
  boundaryState.value = localized(
    'Loading 12 major-area boundaries from the local GeoJSON snapshot…',
    'در حال بارگذاری مرز ۱۲ منطقه بزرگ از GeoJSON محلی…',
  )

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
    fitRenderedBounds()
    boundaryState.value =
      rendered === AREAS.length
        ? localized(
            'All 12 major-area boundaries loaded locally. No live boundary API request was needed.',
            'هر ۱۲ منطقه بزرگ از فایل محلی بارگذاری شدند و هیچ API زنده‌ای برای مرزها فراخوانی نشد.',
          )
        : localized(
            `Loaded ${rendered} of ${AREAS.length} major-area boundaries from the local snapshot.`,
            `${rendered} منطقه از ${AREAS.length} منطقه بزرگ از snapshot محلی بارگذاری شد.`,
          )
  } catch (error) {
    if (token !== renderToken) return
    boundaryState.value = localized(
      error instanceof Error
        ? `Could not load local major-area boundaries: ${error.message}`
        : 'Could not load local major-area boundaries.',
      'بارگذاری مرزهای محلی مناطق بزرگ ناموفق بود.',
    )
  }
}

async function renderPienalueBoundaries(token: number): Promise<void> {
  if (!map || !areaGroup) return

  mappedAreaCount.value = 0
  boundaryState.value = localized(
    'Loading available minor-area boundaries from the local GeoJSON snapshot…',
    'در حال بارگذاری مرزهای موجود مناطق کوچک از GeoJSON محلی…',
  )

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
    fitRenderedBounds()
    boundaryState.value =
      rendered === CURRENT_OSM_PIENALUE_COUNT
        ? localized(
            '55 OSM minor-area boundaries loaded locally. The five Vähäkyrö minor-area boundaries are not present in the current OSM hierarchy snapshot.',
            '۵۵ مرز منطقه کوچک از OSM به صورت محلی بارگذاری شد. پنج منطقه کوچک Vähäkyrö در ساختار فعلی OSM موجود نیستند.',
          )
        : localized(
            `Loaded ${rendered} of ${CURRENT_OSM_PIENALUE_COUNT} currently available OSM minor-area boundaries.`,
            `${rendered} مرز از ${CURRENT_OSM_PIENALUE_COUNT} مرز منطقه کوچک موجود در OSM بارگذاری شد.`,
          )
  } catch (error) {
    if (token !== renderToken) return
    boundaryState.value = localized(
      error instanceof Error
        ? `Could not load local minor-area boundaries: ${error.message}`
        : 'Could not load local minor-area boundaries.',
      'بارگذاری مرزهای محلی مناطق کوچک ناموفق بود.',
    )
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
      :aria-label="`OpenStreetMap · ${selectedLayerLabel}`"
    />

    <div class="map-card__note">
      <p>{{ boundaryState }}</p>
      <p>{{ t('mapBoundaryNote') }}</p>
    </div>
  </section>
</template>
