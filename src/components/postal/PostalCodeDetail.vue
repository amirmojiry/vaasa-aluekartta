<!-- eslint-disable vue/html-closing-bracket-newline, vue/html-indent -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type FeatureGroup, type Map, type Polygon } from 'leaflet'

import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import PostalHistoryChart from '@/components/postal/PostalHistoryChart.vue'
import PostalStatisticsSummary from '@/components/postal/PostalStatisticsSummary.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import { POI_CATEGORY_GROUPS, poiCategoryDefinition } from '@/config/pois'
import type { AreaBoundary, PienalueBoundary } from '@/domain/areas'
import { POI_CATEGORIES, type PoiCategory, type PoiFeature } from '@/domain/pois'
import type {
  PostalCodeArea,
  PostalCodeCollection,
  PostalHistoryObservation,
} from '@/domain/postal'
import { localizeAreaName, useI18n } from '@/i18n'
import { poiText, type PoiMessageKey } from '@/poiI18n'
import { fetchAreaRecords, fetchPienalueBoundaries } from '@/services/boundaryData'
import {
  fetchPostalCodeArea,
  fetchPostalCodeCollection,
  fetchPostalCodeHistory,
} from '@/services/postalData'
import { fetchPoiFeatureCollection, localizedPoiName } from '@/services/poiData'
import { addPoiFeatureGroup } from '@/services/poiMap'
import {
  pointInPostalArea,
  postalIntersectsBoundary,
  postalRingsForLeaflet,
} from '@/services/postalGeometry'

const props = defineProps<{ code: string }>()
const { buildUrl, language } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const postal = ref<PostalCodeArea | null>(null)
const collection = ref<PostalCodeCollection | null>(null)
const history = ref<PostalHistoryObservation[]>([])
const majorAreas = ref<AreaBoundary[]>([])
const minorAreas = ref<PienalueBoundary[]>([])
const error = ref('')
const allPoiFeatures = ref<PoiFeature[]>([])
const activePoiCategories = ref<PoiCategory[]>([])
const poiLoading = ref(true)
const poiFailed = ref(false)
const poiSourceUrl = ref('https://www.openstreetmap.org/copyright')
let map: Map | null = null
let polygon: Polygon | null = null
let poiGroup: FeatureGroup | null = null

const postalPoiFeatures = computed(() => {
  if (!postal.value) return []
  return allPoiFeatures.value.filter((feature) => {
    const [lon, lat] = feature.geometry.coordinates
    return pointInPostalArea(lat, lon, postal.value!)
  })
})
const visiblePoiFeatures = computed(() =>
  postalPoiFeatures.value.filter((feature) =>
    activePoiCategories.value.includes(feature.properties.category),
  ),
)
const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)
const poiStatus = computed(() => {
  if (poiLoading.value) return poiLabel('loading')
  if (poiFailed.value) return poiLabel('unavailable')
  return `${poiLabel('placesShown')}: ${numberFormatter.value.format(visiblePoiFeatures.value.length)}/${numberFormatter.value.format(postalPoiFeatures.value.length)}`
})

const title = computed(() => {
  if (!postal.value) return props.code
  const name =
    language.value === 'fi' ? postal.value.nameFi : postal.value.nameSv || postal.value.nameFi
  return `${postal.value.code} · ${name}`
})
const labels = computed(() => {
  if (language.value === 'fa')
    return {
      back: 'بازگشت به نقشه',
      page: 'منطقه کد پستی',
      related: 'مناطق شهرداری دارای هم‌پوشانی',
      major: 'مناطق بزرگ',
      minor: 'مناطق کوچک',
      source: 'منبع',
      website: 'وب‌سایت',
    }
  if (language.value === 'fi')
    return {
      back: 'Takaisin kartalle',
      page: 'Postinumeroalue',
      related: 'Leikkaavat kunnan osa-alueet',
      major: 'Suuralueet',
      minor: 'Pienalueet',
      source: 'Lähde',
      website: 'Verkkosivu',
    }
  return {
    back: 'Back to map',
    page: 'Postal code area',
    related: 'Intersecting municipal areas',
    major: 'Major areas',
    minor: 'Minor areas',
    source: 'Source',
    website: 'Website',
  }
})

function poiLabel(key: PoiMessageKey): string {
  return poiText(language.value, key)
}

function poiCategoryLabel(category: PoiCategory): string {
  return poiCategoryDefinition(category).labels[language.value]
}

function poiCategoryCount(category: PoiCategory): number {
  return postalPoiFeatures.value.filter((feature) => feature.properties.category === category)
    .length
}

function isPoiCategoryActive(category: PoiCategory): boolean {
  return activePoiCategories.value.includes(category)
}

function safeHttpUrl(value: string | undefined): string {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function poiWebsite(feature: PoiFeature): string {
  return safeHttpUrl(feature.properties.website)
}

function osmFeatureUrl(feature: PoiFeature): string {
  return `https://www.openstreetmap.org/${feature.properties.osmType}/${feature.properties.osmId}`
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
  poiLoading.value = true
  poiFailed.value = false
  try {
    const poiCollection = await fetchPoiFeatureCollection()
    allPoiFeatures.value = poiCollection.features
    poiSourceUrl.value = poiCollection.source?.url || poiSourceUrl.value
    renderPoiLayers()
  } catch {
    poiFailed.value = true
  } finally {
    poiLoading.value = false
  }
}

function majorName(area: AreaBoundary): string {
  return localizeAreaName(area.names, area.name, language.value)
}
function minorName(area: PienalueBoundary): string {
  return localizeAreaName(area.names, area.name, language.value)
}

onMounted(async () => {
  if (!mapElement.value) return
  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 11)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)
  void loadPois()
  try {
    const [postalArea, postalCollection, postalHistory, majorMap, pienalueet] = await Promise.all([
      fetchPostalCodeArea(props.code),
      fetchPostalCodeCollection(),
      fetchPostalCodeHistory(props.code),
      fetchAreaRecords(AREAS),
      fetchPienalueBoundaries(AREAS),
    ])
    postal.value = postalArea
    collection.value = postalCollection
    history.value = postalHistory
    majorAreas.value = [...majorMap.values()].filter((area) =>
      postalIntersectsBoundary(postalArea, area),
    )
    minorAreas.value = pienalueet.filter((area) => postalIntersectsBoundary(postalArea, area))
    polygon = L.polygon(postalRingsForLeaflet(postalArea), {
      color: '#6f4a8e',
      weight: 4,
      opacity: 1,
      fillColor: '#6f4a8e',
      fillOpacity: 0.18,
    }).addTo(map)
    polygon.bindTooltip(title.value, { sticky: true })
    const bounds = polygon.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
    renderPoiLayers()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Paavo data loading failed'
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
  <main class="area-detail-page postal-detail-page">
    <header class="area-detail-hero">
      <div class="area-detail-hero__inner">
        <div class="area-detail-toolbar">
          <a class="area-back-link" :href="buildUrl({ level: 'postal' })">← {{ labels.back }}</a
          ><LanguageSwitcher />
        </div>
        <p class="eyebrow">Paavo · Statistics Finland</p>
        <h1>{{ title }}</h1>
      </div>
    </header>

    <section class="area-detail-layout">
      <div class="area-detail-main">
        <PostalStatisticsSummary
          v-if="postal && collection"
          :postal="postal"
          :collection="collection"
        />

        <article class="map-card area-detail-map-card">
          <div class="map-card__header">
            <div>
              <h2>{{ labels.page }}</h2>
              <small v-if="postal">{{ postal.statisticsYear }}</small>
            </div>
            <span v-if="error" class="map-card__status">{{ error }}</span>
          </div>
          <details class="poi-control poi-control--area" :aria-label="poiLabel('places')">
            <summary class="poi-control__summary">
              <span class="poi-control__title">
                <strong>{{ poiLabel('places') }}</strong>
                <small>{{ poiLabel('postalHint') }}</small>
              </span>
            </summary>

            <div class="poi-control__body">
              <div class="poi-control__actions">
                <button type="button" @click="fitAreaOnMap">{{ poiLabel('focusArea') }}</button>
                <button
                  type="button"
                  :disabled="poiLoading || poiFailed || visiblePoiFeatures.length === 0"
                  @click="fitAllPoisOnMap"
                >
                  {{ poiLabel('showAllPostal') }}
                </button>
                <button type="button" @click="showAllPois">{{ poiLabel('showAll') }}</button>
                <button type="button" @click="hideAllPois">{{ poiLabel('hideAll') }}</button>
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
                <a
                  class="poi-control__source"
                  :href="poiSourceUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ poiLabel('source') }}
                </a>
              </div>
            </div>
          </details>

          <div
            ref="mapElement"
            class="map-canvas area-detail-map"
            role="region"
            :aria-label="title"
          />

          <details v-if="!poiLoading && !poiFailed && visiblePoiFeatures.length" class="poi-list">
            <summary>
              {{ poiLabel('placeList') }} · {{ numberFormatter.format(visiblePoiFeatures.length) }}
            </summary>
            <ul>
              <li v-for="feature in visiblePoiFeatures" :key="feature.properties.id">
                <article class="poi-list__item">
                  <strong>{{ localizedPoiName(feature, language) }}</strong>
                  <span class="poi-list__category">
                    <i
                      :style="{
                        backgroundColor: poiCategoryDefinition(feature.properties.category).color,
                      }"
                      aria-hidden="true"
                    />
                    {{ poiCategoryLabel(feature.properties.category) }}
                  </span>
                  <span v-if="feature.properties.address" class="poi-list__detail">
                    {{ feature.properties.address }}
                  </span>
                  <span class="poi-list__links">
                    <a
                      v-if="poiWebsite(feature)"
                      :href="poiWebsite(feature)"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ labels.website }}
                    </a>
                    <a :href="osmFeatureUrl(feature)" target="_blank" rel="noreferrer">
                      OpenStreetMap
                    </a>
                  </span>
                </article>
              </li>
            </ul>
          </details>
        </article>
        <PostalHistoryChart v-if="history.length > 1" :observations="history" />
      </div>

      <aside class="area-detail-sidebar">
        <section class="info-panel related-panel">
          <p class="eyebrow">{{ labels.related }}</p>
          <h2>{{ majorAreas.length }} / {{ minorAreas.length }}</h2>
          <div class="related-area-list">
            <h3>{{ labels.major }}</h3>
            <ul>
              <li v-for="area in majorAreas" :key="area.relationId">
                <a :href="buildUrl({ area: area.slug })">{{ area.ref }} · {{ majorName(area) }}</a>
              </li>
            </ul>
            <h3>{{ labels.minor }}</h3>
            <ul>
              <li v-for="area in minorAreas" :key="area.relationId">
                <a :href="buildUrl({ pienalue: area.relationId })"
                  ><span v-if="area.ref">{{ area.ref }} · </span>{{ minorName(area) }}</a
                >
              </li>
            </ul>
          </div>
        </section>
        <section v-if="collection" class="info-panel">
          <h2>{{ labels.source }}</h2>
          <a :href="collection.sourceUrl" target="_blank" rel="noreferrer"
            >Statistics Finland · Paavo</a
          >
          <p>CC BY 4.0 · local snapshot</p>
        </section>
      </aside>
    </section>
  </main>
</template>
