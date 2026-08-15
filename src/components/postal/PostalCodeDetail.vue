<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map, type Polygon } from 'leaflet'

import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaBoundary, PienalueBoundary } from '@/domain/areas'
import type { PostalCodeArea } from '@/domain/postal'
import { localeForLanguage, localizeAreaName, useI18n } from '@/i18n'
import { fetchAreaRecords, fetchPienalueBoundaries } from '@/services/boundaryData'
import { fetchPostalCodeArea } from '@/services/postalData'
import { postalIntersectsBoundary, postalRingsForLeaflet } from '@/services/postalGeometry'

const props = defineProps<{ code: string }>()
const { buildUrl, language } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const postal = ref<PostalCodeArea | null>(null)
const majorAreas = ref<AreaBoundary[]>([])
const minorAreas = ref<PienalueBoundary[]>([])
const error = ref('')
let map: Map | null = null
let polygon: Polygon | null = null

const numberFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))
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
  const name = language.value === 'fi' ? postal.value.nameFi : postal.value.nameSv || postal.value.nameFi
  return `${postal.value.code} · ${name}`
})
const pageLabel = computed(() => {
  if (language.value === 'fa') return 'منطقه کد پستی'
  if (language.value === 'fi') return 'Postinumeroalue'
  return 'Postal code area'
})
const relatedLabel = computed(() => {
  if (language.value === 'fa') return 'مناطق شهرداری دارای هم‌پوشانی'
  if (language.value === 'fi') return 'Leikkaavat kunnan osa-alueet'
  return 'Intersecting municipal areas'
})
const caveat = computed(() => {
  if (language.value === 'fa')
    return 'Paavo یک تقسیم‌بندی آماری مستقل بر اساس کد پستی است. این مقادیر به مناطق بزرگ یا کوچک شهرداری تبدیل نشده‌اند.'
  if (language.value === 'fi')
    return 'Paavo on itsenäinen postinumeroaluejako. Näitä lukuja ei ole muunnettu kunnan suur- tai pienalueiden luvuiksi.'
  return 'Paavo is an independent postal-code geography. These values are not converted into major- or minor-area statistics.'
})

function formatValue(value: number | null): string {
  return value === null ? '—' : numberFormatter.value.format(value)
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
    const [postalArea, majorMap, pienalueet] = await Promise.all([
      fetchPostalCodeArea(props.code),
      fetchAreaRecords(AREAS),
      fetchPienalueBoundaries(AREAS),
    ])
    postal.value = postalArea
    majorAreas.value = [...majorMap.values()].filter((area) =>
      postalIntersectsBoundary(postalArea, area),
    )
    minorAreas.value = pienalueet.filter((area) => postalIntersectsBoundary(postalArea, area))

    polygon = L.polygon(postalRingsForLeaflet(postalArea), {
      color: '#6f4a8e',
      weight: 4,
      opacity: 1,
      fillColor: '#6f4a8e',
      fillOpacity: 0.2,
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
          <a class="area-back-link" :href="buildUrl()">← {{ pageLabel }}</a>
          <LanguageSwitcher />
        </div>
        <p class="eyebrow">Paavo · Statistics Finland</p>
        <h1>{{ title }}</h1>
      </div>
    </header>

    <section class="area-detail-layout">
      <div class="area-detail-main">
        <article class="map-card area-detail-map-card">
          <div class="map-card__header">
            <div>
              <h2>{{ pageLabel }}</h2>
              <small v-if="postal">{{ postal.statisticsYear }}</small>
            </div>
            <span v-if="error" class="map-card__status">{{ error }}</span>
          </div>
          <div ref="mapElement" class="map-canvas area-detail-map" role="region" :aria-label="title" />
        </article>

        <section v-if="postal" class="area-stat-summary postal-stat-summary">
          <div class="summary-population">
            <span>Population · {{ postal.statisticsYear }}</span>
            <strong>{{ formatValue(postal.population) }}</strong>
          </div>
          <div class="summary-metric">
            <strong>Employed</strong>
            <span>{{ formatValue(postal.employed) }}</span>
          </div>
          <div class="summary-metric">
            <strong>Unemployed</strong>
            <span>{{ formatValue(postal.unemployed) }}</span>
          </div>
          <div class="summary-metric">
            <strong>Students</strong>
            <span>{{ formatValue(postal.students) }}</span>
          </div>
          <div class="summary-metric">
            <strong>Average disposable monetary income</strong>
            <span>{{ postal.averageIncome === null ? '—' : currencyFormatter.format(postal.averageIncome) }}</span>
          </div>
          <p class="postal-caveat">{{ caveat }}</p>
        </section>
      </div>

      <aside class="area-detail-sidebar">
        <section class="info-panel related-panel">
          <p class="eyebrow">{{ relatedLabel }}</p>
          <h2>{{ majorAreas.length }} / {{ minorAreas.length }}</h2>
          <div class="related-area-list">
            <h3>Major areas</h3>
            <ul>
              <li v-for="area in majorAreas" :key="area.relationId">
                <a :href="buildUrl({ area: area.slug })">{{ area.ref }} · {{ majorName(area) }}</a>
              </li>
            </ul>
            <h3>Minor areas</h3>
            <ul>
              <li v-for="area in minorAreas" :key="area.relationId">
                <a :href="buildUrl({ pienalue: area.relationId })">
                  <span v-if="area.ref">{{ area.ref }} · </span>{{ minorName(area) }}
                </a>
              </li>
            </ul>
          </div>
        </section>
        <section v-if="postal" class="info-panel">
          <h2>Source</h2>
          <a href="https://stat.fi/en/services/statistical-data-services/geographic-data/geographic-data-by-postal-code-area" target="_blank" rel="noreferrer">
            Statistics Finland · Paavo
          </a>
          <p>CC BY 4.0</p>
        </section>
      </aside>
    </section>
  </main>
</template>
