<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map, type Polygon } from 'leaflet'

import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import PostalHistoryChart from '@/components/postal/PostalHistoryChart.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaBoundary, PienalueBoundary } from '@/domain/areas'
import type {
  PostalCodeArea,
  PostalCodeCollection,
  PostalHistoryObservation,
  PostalMetric,
} from '@/domain/postal'
import { localeForLanguage, localizeAreaName, useI18n } from '@/i18n'
import { fetchAreaRecords, fetchPienalueBoundaries } from '@/services/boundaryData'
import {
  fetchPostalCodeArea,
  fetchPostalCodeCollection,
  fetchPostalCodeHistory,
  postalMetricRank,
} from '@/services/postalData'
import { postalIntersectsBoundary, postalRingsForLeaflet } from '@/services/postalGeometry'

const props = defineProps<{ code: string }>()
const { buildUrl, language } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const postal = ref<PostalCodeArea | null>(null)
const collection = ref<PostalCodeCollection | null>(null)
const history = ref<PostalHistoryObservation[]>([])
const majorAreas = ref<AreaBoundary[]>([])
const minorAreas = ref<PienalueBoundary[]>([])
const error = ref('')
let map: Map | null = null
let polygon: Polygon | null = null

const numberFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)
const currencyFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }),
)
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
      population: 'جمعیت',
      employed: 'شاغلان',
      unemployed: 'بیکاران',
      students: 'دانشجویان',
      income: 'میانگین درآمد سالانه',
      residents: 'سهم از جمعیت',
      count: 'نفر',
      rank: 'رتبه',
      of: 'از',
      related: 'مناطق شهرداری دارای هم‌پوشانی',
      major: 'مناطق بزرگ',
      minor: 'مناطق کوچک',
      source: 'منبع',
      caveat:
        'درصد شاغلان، بیکاران و دانشجویان در این صفحه سهم آن گروه از کل جمعیت کد پستی است؛ این مقادیر به مناطق شهرداری تبدیل نشده‌اند.',
    }
  if (language.value === 'fi')
    return {
      back: 'Takaisin kartalle',
      page: 'Postinumeroalue',
      population: 'Väestö',
      employed: 'Työlliset',
      unemployed: 'Työttömät',
      students: 'Opiskelijat',
      income: 'Asukkaiden keskimääräiset vuositulot',
      residents: 'Osuus väestöstä',
      count: 'henkilöä',
      rank: 'sija',
      of: '/',
      related: 'Leikkaavat kunnan osa-alueet',
      major: 'Suuralueet',
      minor: 'Pienalueet',
      source: 'Lähde',
      caveat:
        'Työllisten, työttömien ja opiskelijoiden prosentit ovat osuuksia postinumeroalueen koko väestöstä. Lukuja ei ole muunnettu kunnan osa-alueiden tilastoiksi.',
    }
  return {
    back: 'Back to map',
    page: 'Postal code area',
    population: 'Population',
    employed: 'Employed',
    unemployed: 'Unemployed',
    students: 'Students',
    income: 'Average annual income of inhabitants',
    residents: 'Share of population',
    count: 'people',
    rank: 'rank',
    of: 'of',
    related: 'Intersecting municipal areas',
    major: 'Major areas',
    minor: 'Minor areas',
    source: 'Source',
    caveat:
      'Employment, unemployment and student percentages are shares of the postal-area population. These figures are not converted into municipal-area statistics.',
  }
})

function formatNumber(value: number | null): string {
  return value === null ? '—' : numberFormatter.value.format(value)
}
function formatPercent(value: number | null): string {
  return value === null ? '—' : `${percentFormatter.value.format(value)}%`
}
function metricHref(metric: string): string {
  return buildUrl({ metric, level: 'postal' })
}
function rank(metric: PostalMetric) {
  return postal.value && collection.value
    ? postalMetricRank(collection.value, postal.value, metric)
    : null
}
function rankText(metric: PostalMetric): string {
  const result = rank(metric)
  if (!result) return ''
  if (language.value === 'fi')
    return `${labels.value.rank} ${numberFormatter.value.format(result.rank)}/${numberFormatter.value.format(result.total)}`
  return `${labels.value.rank} ${numberFormatter.value.format(result.rank)} ${labels.value.of} ${numberFormatter.value.format(result.total)}`
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
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Paavo data loading failed'
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
        <section v-if="postal" class="area-stat-summary postal-stat-summary">
          <div class="summary-metric">
            <div class="summary-metric__heading">
              <strong>{{ labels.employed }}</strong
              ><span>{{ postal.statisticsYear }}</span>
            </div>
            <strong>{{ formatPercent(postal.employedShare) }}</strong>
            <span
              >{{ formatNumber(postal.employed) }} {{ labels.count }} · {{ labels.residents }}</span
            >
            <a class="summary-rank-link" :href="metricHref('employed')">{{
              rankText('employed')
            }}</a>
          </div>
          <div class="summary-metric">
            <div class="summary-metric__heading">
              <strong>{{ labels.unemployed }}</strong
              ><span>{{ postal.statisticsYear }}</span>
            </div>
            <strong>{{ formatPercent(postal.unemployedShare) }}</strong>
            <span
              >{{ formatNumber(postal.unemployed) }} {{ labels.count }} ·
              {{ labels.residents }}</span
            >
            <a class="summary-rank-link" :href="metricHref('unemployed')">{{
              rankText('unemployed')
            }}</a>
          </div>
          <div class="summary-metric">
            <div class="summary-metric__heading">
              <strong>{{ labels.students }}</strong
              ><span>{{ postal.statisticsYear }}</span>
            </div>
            <strong>{{ formatPercent(postal.studentShare) }}</strong>
            <span
              >{{ formatNumber(postal.students) }} {{ labels.count }} · {{ labels.residents }}</span
            >
            <a class="summary-rank-link" :href="metricHref('students')">{{
              rankText('students')
            }}</a>
          </div>
          <div class="summary-population">
            <div class="summary-population__heading">
              <strong>{{ labels.population }}</strong
              ><span>{{ postal.statisticsYear }}</span>
            </div>
            <strong>{{ formatNumber(postal.population) }}</strong>
            <a class="summary-rank-link" :href="metricHref('population')">{{
              rankText('population')
            }}</a>
          </div>
          <div class="summary-metric income-summary">
            <div class="summary-metric__heading">
              <strong>{{ labels.income }}</strong
              ><span>{{ postal.statisticsYear }}</span>
            </div>
            <strong>{{
              postal.averageIncome === null ? '—' : currencyFormatter.format(postal.averageIncome)
            }}</strong>
            <a class="summary-rank-link" :href="metricHref('income')">{{ rankText('income') }}</a>
          </div>
          <p class="postal-caveat">{{ labels.caveat }}</p>
        </section>

        <article class="map-card area-detail-map-card">
          <div class="map-card__header">
            <div>
              <h2>{{ labels.page }}</h2>
              <small v-if="postal">{{ postal.statisticsYear }}</small>
            </div>
            <span v-if="error" class="map-card__status">{{ error }}</span>
          </div>
          <div
            ref="mapElement"
            class="map-canvas area-detail-map"
            role="region"
            :aria-label="title"
          />
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
