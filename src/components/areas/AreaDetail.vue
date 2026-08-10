<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map, type Polygon } from 'leaflet'

import AreaStatistics from '@/components/areas/AreaStatistics.vue'
import AreaStatisticsSummary from '@/components/areas/AreaStatisticsSummary.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import TechnicalInfo from '@/components/areas/TechnicalInfo.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaBoundary, AreaDefinition, PienalueBoundary } from '@/domain/areas'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchAreaRecord, fetchPienalueBoundaries } from '@/services/boundaryData'

const props = defineProps<{ area: AreaDefinition }>()

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const loadingMessage = ref(t('loading'))
const boundary = ref<AreaBoundary | null>(null)
const childAreas = ref<PienalueBoundary[]>([])
const homeHref = buildUrl()
let map: Map | null = null
let polygon: Polygon | null = null

const title = computed(() =>
  localizeAreaName(boundary.value?.names, props.area.name, language.value),
)

function childName(area: PienalueBoundary): string {
  return localizeAreaName(area.names, area.name, language.value)
}

function minorAreaCountLabel(count: number): string {
  if (language.value === 'fa') return `${count} ${t('minorArea')}`
  return `${count} ${count === 1 ? t('minorArea') : t('minorAreas')}`
}

onMounted(async () => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 11)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)

  try {
    const [areaBoundary, pienalueet] = await Promise.all([
      fetchAreaRecord(props.area),
      fetchPienalueBoundaries(AREAS),
    ])
    boundary.value = areaBoundary
    childAreas.value = pienalueet.filter((item) => item.parentSlug === props.area.slug)

    polygon = L.polygon(areaBoundary.rings, {
      color: '#de6d45',
      weight: 4,
      opacity: 1,
      fillColor: '#de6d45',
      fillOpacity: 0.16,
    }).addTo(map)
    polygon.bindTooltip(`${props.area.ref} · ${title.value}`, { sticky: true })

    const bounds = polygon.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
    loadingMessage.value = minorAreaCountLabel(childAreas.value.length)
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
        <h1>{{ title }}</h1>
      </div>
    </header>

    <section class="area-detail-layout">
      <div class="area-detail-main">
        <AreaStatisticsSummary level="suuralue" :area-name="area.name" />

        <article class="map-card area-detail-map-card">
          <div class="map-card__header">
            <div>
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

        <AreaStatistics level="suuralue" :area-name="area.name" />
      </div>

      <aside class="area-detail-sidebar">
        <section class="info-panel related-panel" :aria-labelledby="`children-${area.slug}`">
          <p class="eyebrow">{{ t('minorAreas') }}</p>
          <h2 :id="`children-${area.slug}`">{{ t('childAreas') }}</h2>
          <div class="related-area-list related-area-list--flush">
            <ul v-if="childAreas.length > 0">
              <li v-for="child in childAreas" :key="child.relationId">
                <a :href="buildUrl({ pienalue: child.relationId })">
                  <span v-if="child.ref">{{ child.ref }} · </span>{{ childName(child) }}
                </a>
              </li>
            </ul>
            <p v-else>{{ t('noChildAreas') }}</p>
          </div>
        </section>

        <TechnicalInfo
          :relation-id="area.relationId"
          :reference="boundary?.ref ?? area.ref"
          :admin-level="9"
          :level-label="t('majorArea')"
          :outer-way-count="boundary?.outerWayIds.length ?? area.outerWayIds.length"
          :source="boundary?.source ?? area.source"
          :wikidata-id="boundary?.wikidataId"
          :wikidata-description="boundary?.wikidataDescription"
          :wikipedia="boundary?.wikipedia ?? {}"
          :external-identifiers="boundary?.externalIdentifiers ?? []"
          :child-count="childAreas.length"
        />
      </aside>
    </section>
  </main>
</template>
