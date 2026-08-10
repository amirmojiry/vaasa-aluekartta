<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map, type Polygon } from 'leaflet'

import AreaStatistics from '@/components/areas/AreaStatistics.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import TechnicalInfo from '@/components/areas/TechnicalInfo.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { PienalueBoundary } from '@/domain/areas'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchPienalueBoundaries } from '@/services/boundaryData'

const props = defineProps<{ relationId: number }>()

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const loadingMessage = ref(t('loading'))
const boundary = ref<PienalueBoundary | null>(null)
const siblingAreas = ref<PienalueBoundary[]>([])
const homeHref = buildUrl()
let map: Map | null = null
let polygon: Polygon | null = null

const title = computed(() =>
  localizeAreaName(boundary.value?.names, `Pienalue ${props.relationId}`, language.value),
)
const parentName = computed(() =>
  boundary.value
    ? localizeAreaName(boundary.value.parentNames, boundary.value.parentName, language.value)
    : t('loading'),
)
const parentHref = computed(() =>
  boundary.value ? buildUrl({ area: boundary.value.parentSlug }) : homeHref,
)

function siblingName(area: PienalueBoundary): string {
  return localizeAreaName(area.names, area.name, language.value)
}

onMounted(async () => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 11)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)

  try {
    const boundaries = await fetchPienalueBoundaries(AREAS)
    const result = boundaries.find((item) => item.relationId === props.relationId)
    if (!result) throw new Error(`Could not find minor-area relation ${props.relationId}`)

    boundary.value = result
    siblingAreas.value = boundaries.filter(
      (item) => item.parentSlug === result.parentSlug && item.relationId !== result.relationId,
    )

    polygon = L.polygon(result.rings, {
      color: '#17645d',
      weight: 4,
      opacity: 1,
      fillColor: '#17645d',
      fillOpacity: 0.16,
    }).addTo(map)
    polygon.bindTooltip(`${result.ref ? `${result.ref} · ` : ''}${title.value}`, { sticky: true })

    const bounds = polygon.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
    loadingMessage.value = `${siblingAreas.value.length + 1} ${t('minorAreas')}`
  } catch (error) {
    loadingMessage.value = error instanceof Error ? error.message : t('loadingAreaFailed')
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
        <div class="area-detail-toolbar">
          <a class="area-back-link" :href="homeHref">← {{ t('backToMap') }}</a>
          <LanguageSwitcher />
        </div>
        <p class="eyebrow">{{ t('minorArea') }} {{ boundary?.ref || relationId }}</p>
        <h1>{{ title }}</h1>
      </div>
    </header>

    <section class="area-detail-layout">
      <div class="area-detail-main">
        <article class="map-card area-detail-map-card">
          <div class="map-card__header">
            <div>
              <p class="eyebrow">{{ t('boundary') }}</p>
              <h2>{{ title }}</h2>
            </div>
            <span class="map-card__status">{{ loadingMessage }}</span>
          </div>
          <div
            ref="mapElement"
            class="map-canvas area-detail-map"
            role="region"
            :aria-label="`${title} · ${t('boundary')}`"
          />
        </article>

        <AreaStatistics v-if="boundary" level="pienalue" :area-name="boundary.name" />
      </div>

      <aside class="area-detail-sidebar">
        <section class="info-panel related-panel">
          <p class="eyebrow">{{ t('parentMajorArea') }}</p>
          <h2>
            <a v-if="boundary" :href="parentHref">{{ boundary.parentRef }} · {{ parentName }}</a>
            <span v-else>{{ t('loading') }}</span>
          </h2>

          <section class="related-area-list" aria-labelledby="sibling-areas-title">
            <h3 id="sibling-areas-title">{{ t('siblingAreas') }}</h3>
            <ul v-if="siblingAreas.length > 0">
              <li v-for="sibling in siblingAreas" :key="sibling.relationId">
                <a :href="buildUrl({ pienalue: sibling.relationId })">
                  <span v-if="sibling.ref">{{ sibling.ref }} · </span>{{ siblingName(sibling) }}
                </a>
              </li>
            </ul>
            <p v-else>{{ t('noSiblingAreas') }}</p>
          </section>
        </section>

        <TechnicalInfo
          :relation-id="relationId"
          :reference="boundary?.ref ?? ''"
          :admin-level="10"
          :level-label="t('minorArea')"
          :outer-way-count="boundary?.outerWayIds.length ?? t('loading')"
          :source="boundary?.source ?? t('loading')"
          :wikidata-id="boundary?.wikidataId"
          :wikidata-description="boundary?.wikidataDescription"
          :wikipedia="boundary?.wikipedia ?? {}"
          :external-identifiers="boundary?.externalIdentifiers ?? []"
        />
      </aside>
    </section>
  </main>
</template>
