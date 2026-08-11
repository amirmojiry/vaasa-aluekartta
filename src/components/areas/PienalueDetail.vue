<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type FeatureGroup, type Map, type Polygon } from 'leaflet'

import AreaStatistics from '@/components/areas/AreaStatistics.vue'
import AreaStatisticsSummary from '@/components/areas/AreaStatisticsSummary.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import TechnicalInfo from '@/components/areas/TechnicalInfo.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import { POI_CATEGORY_GROUPS, poiCategoryDefinition } from '@/config/pois'
import type { PienalueBoundary } from '@/domain/areas'
import { POI_CATEGORIES, type PoiCategory, type PoiFeature } from '@/domain/pois'
import { localizeAreaName, useI18n } from '@/i18n'
import { poiText, type PoiMessageKey } from '@/poiI18n'
import { fetchPienalueBoundaries } from '@/services/boundaryData'
import { fetchPoiFeatureCollection } from '@/services/poiData'
import { addPoiFeatureGroup } from '@/services/poiMap'

const props = defineProps<{ relationId: number }>()

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const loadError = ref('')
const boundary = ref<PienalueBoundary | null>(null)
const siblingAreas = ref<PienalueBoundary[]>([])
const poiFeatures = ref<PoiFeature[]>([])
const activePoiCategories = ref<PoiCategory[]>([])
const poiLoading = ref(true)
const poiFailed = ref(false)
const poiSourceUrl = ref('https://www.openstreetmap.org/copyright')
const homeHref = buildUrl()
let map: Map | null = null
let polygon: Polygon | null = null
let poiGroup: FeatureGroup | null = null

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

function siblingName(area: PienalueBoundary): string {
  return localizeAreaName(area.names, area.name, language.value)
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

    fitAreaOnMap()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('loadingAreaFailed')
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
        <a v-if="boundary" class="area-detail-parent-link" :href="parentHref">
          {{ t('majorArea') }}: {{ boundary.parentRef }} · {{ parentName }}
        </a>
      </div>
    </header>

    <section class="area-detail-layout">
      <div class="area-detail-main">
        <AreaStatisticsSummary v-if="boundary" level="pienalue" :area-name="boundary.name" />

        <article class="map-card area-detail-map-card">
          <div class="map-card__header">
            <div>
              <h2>{{ title }}</h2>
            </div>
            <span v-if="loadError" class="map-card__status">{{ loadError }}</span>
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

            <div class="poi-control__groups">
              <section
                v-for="group in POI_CATEGORY_GROUPS"
                :key="group.id"
                class="poi-control__group"
              >
                <h3>{{ group.labels[language] }}</h3>
                <div class="poi-control__categories">
                  <button
                    v-for="category in group.categories"
                    :key="category"
                    type="button"
                    :class="[
                      'poi-control__category',
                      { 'is-active': isPoiCategoryActive(category) },
                    ]"
                    :aria-pressed="isPoiCategoryActive(category)"
                    @click="togglePoiCategory(category)"
                  >
                    <i
                      :style="{ backgroundColor: poiCategoryDefinition(category).color }"
                      aria-hidden="true"
                    />
                    {{ poiCategoryDefinition(category).labels[language] }}
                    <span>{{ numberFormatter.format(poiCategoryCount(category)) }}</span>
                  </button>
                </div>
              </section>
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

        <AreaStatistics v-if="boundary" level="pienalue" :area-name="boundary.name" />
      </div>

      <aside class="area-detail-sidebar">
        <section class="info-panel related-panel">
          <p class="eyebrow">{{ t('majorArea') }}</p>
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
