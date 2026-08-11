<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type FeatureGroup, type Map, type Polygon } from 'leaflet'

import AreaStatistics from '@/components/areas/AreaStatistics.vue'
import AreaStatisticsSummary from '@/components/areas/AreaStatisticsSummary.vue'
import ElectionHistory from '@/components/areas/ElectionHistory.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import TechnicalInfo from '@/components/areas/TechnicalInfo.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import { POI_CATEGORY_DEFINITIONS } from '@/config/pois'
import type { AreaBoundary, AreaDefinition, PienalueBoundary } from '@/domain/areas'
import { POI_CATEGORIES, type PoiCategory, type PoiFeature } from '@/domain/pois'
import { localizeAreaName, useI18n } from '@/i18n'
import { poiText, type PoiMessageKey } from '@/poiI18n'
import { fetchAreaRecord, fetchPienalueBoundaries } from '@/services/boundaryData'
import { fetchPoiFeatureCollection } from '@/services/poiData'
import { addPoiFeatureGroup } from '@/services/poiMap'

const props = defineProps<{ area: AreaDefinition }>()

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const loadingMessage = ref(t('loading'))
const boundary = ref<AreaBoundary | null>(null)
const childAreas = ref<PienalueBoundary[]>([])
const poiFeatures = ref<PoiFeature[]>([])
const activePoiCategories = ref<PoiCategory[]>([...POI_CATEGORIES])
const poiLoading = ref(true)
const poiFailed = ref(false)
const poiSourceUrl = ref('https://www.openstreetmap.org/copyright')
const homeHref = buildUrl()
let map: Map | null = null
let polygon: Polygon | null = null
let poiGroup: FeatureGroup | null = null

const title = computed(() =>
  localizeAreaName(boundary.value?.names, props.area.name, language.value),
)
const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)
const visiblePoiFeatures = computed(() =>
  poiFeatures.value.filter((feature) =>
    activePoiCategories.value.includes(feature.properties.category),
  ),
)
const poiStatus = computed(() => {
  if (poiLoading.value) return poiLabel('loading')
  if (poiFailed.value) return poiLabel('unavailable')
  return `${poiLabel('placesShown')}: ${numberFormatter.value.format(visiblePoiFeatures.value.length)}/${numberFormatter.value.format(poiFeatures.value.length)}`
})

function childName(area: PienalueBoundary): string {
  return localizeAreaName(area.names, area.name, language.value)
}

function minorAreaCountLabel(count: number): string {
  if (language.value === 'fa') return `${count} ${t('minorArea')}`
  if (language.value === 'fi') return `${count} pienaluetta`
  return `${count} ${count === 1 ? t('minorArea') : t('minorAreas')}`
}

function poiLabel(key: PoiMessageKey): string {
  return poiText(language.value, key)
}

function poiCategoryCount(category: PoiCategory): number {
  return poiFeatures.value.filter((feature) => feature.properties.category === category).length
}

function isPoiCategoryActive(category: PoiCategory): boolean {
  return activePoiCategories.value.includes(category)
}

function renderPoiLayers(): void {
  if (!map) return
  poiGroup?.remove()
  poiGroup = addPoiFeatureGroup(map, visiblePoiFeatures.value, language.value)
}

function togglePoiCategory(category: PoiCategory): void {
  activePoiCategories.value = isPoiCategoryActive(category)
    ? activePoiCategories.value.filter((value) => value !== category)
    : [...activePoiCategories.value, category]
  renderPoiLayers()
}

function showAllPois(): void {
  activePoiCategories.value = [...POI_CATEGORIES]
  renderPoiLayers()
}

function hideAllPois(): void {
  activePoiCategories.value = []
  renderPoiLayers()
}

function fitAreaOnMap(): void {
  if (!map || !polygon) return
  const bounds = polygon.getBounds()
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
}

function fitAllPoisOnMap(): void {
  if (!map || !poiGroup) return
  const bounds = poiGroup.getBounds()
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
}

async function loadPois(): Promise<void> {
  if (!map) return
  poiLoading.value = true
  poiFailed.value = false
  try {
    const collection = await fetchPoiFeatureCollection()
    poiFeatures.value = collection.features
    poiSourceUrl.value = collection.source?.url || poiSourceUrl.value
    renderPoiLayers()
  } catch {
    poiFailed.value = true
  } finally {
    poiLoading.value = false
  }
}

onMounted(async () => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 11)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)
  void loadPois()

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

    fitAreaOnMap()
    loadingMessage.value = minorAreaCountLabel(childAreas.value.length)
  } catch (error) {
    loadingMessage.value = error instanceof Error ? error.message : t('loadingAreaFailed')
  }
})

onBeforeUnmount(() => {
  poiGroup?.remove()
  poiGroup = null
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

          <section class="poi-control poi-control--area" :aria-label="poiLabel('places')">
            <div class="poi-control__header">
              <div class="poi-control__title">
                <strong>{{ poiLabel('places') }}</strong>
                <small>{{ poiLabel('allAreasHint') }}</small>
              </div>
              <div class="poi-control__actions">
                <button type="button" @click="fitAreaOnMap">{{ poiLabel('focusArea') }}</button>
                <button
                  type="button"
                  :disabled="poiLoading || poiFailed || visiblePoiFeatures.length === 0"
                  @click="fitAllPoisOnMap"
                >
                  {{ poiLabel('showAllVaasa') }}
                </button>
                <button type="button" @click="showAllPois">{{ poiLabel('showAll') }}</button>
                <button type="button" @click="hideAllPois">{{ poiLabel('hideAll') }}</button>
              </div>
            </div>

            <div class="poi-control__categories">
              <button
                v-for="definition in POI_CATEGORY_DEFINITIONS"
                :key="definition.id"
                type="button"
                :class="['poi-control__category', { 'is-active': isPoiCategoryActive(definition.id) }]"
                :aria-pressed="isPoiCategoryActive(definition.id)"
                @click="togglePoiCategory(definition.id)"
              >
                <i :style="{ backgroundColor: definition.color }" aria-hidden="true" />
                {{ definition.labels[language] }}
                <span>{{ numberFormatter.format(poiCategoryCount(definition.id)) }}</span>
              </button>
            </div>

            <div class="poi-control__footer">
              <span class="poi-control__status" role="status">{{ poiStatus }}</span>
              <a class="poi-control__source" :href="poiSourceUrl" target="_blank" rel="noreferrer">
                {{ poiLabel('source') }}
              </a>
            </div>
          </section>

          <div
            ref="mapElement"
            class="map-canvas area-detail-map"
            role="region"
            :aria-label="`${title} · ${t('boundary')}`"
          />
        </article>

        <AreaStatistics level="suuralue" :area-name="area.name" />
        <ElectionHistory level="suuralue" :area-name="area.name" />
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
