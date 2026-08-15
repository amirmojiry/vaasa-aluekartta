<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type FeatureGroup, type Map, type Polygon } from 'leaflet'

import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { PostalCodeArea, PostalMetric } from '@/domain/postal'
import { localeForLanguage, useI18n } from '@/i18n'
import { fetchPostalCodeCollection, postalMetricValue } from '@/services/postalData'
import { postalRingsForLeaflet } from '@/services/postalGeometry'

const { buildUrl, language } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const postalAreas = ref<PostalCodeArea[]>([])
const metric = ref<PostalMetric>('population')
const loading = ref(true)
const error = ref('')
let map: Map | null = null
let postalGroup: FeatureGroup | null = null

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
  if (language.value === 'fa') return 'لایه مستقل کدهای پستی Paavo'
  if (language.value === 'fi') return 'Paavo-postinumeroalueet'
  return 'Paavo postal code layer'
})
const description = computed(() => {
  if (language.value === 'fa')
    return 'مرزها و آمار رسمی کدهای پستی Statistics Finland؛ این لایه مستقل از مناطق بزرگ و کوچک شهرداری است.'
  if (language.value === 'fi')
    return 'Tilastokeskuksen viralliset postinumeroalueet ja Paavo-tilastot. Taso on erillinen kunnan suur- ja pienalueista.'
  return 'Official Statistics Finland postal-code polygons and Paavo statistics. This geography is separate from municipal major and minor areas.'
})
const selectorLabel = computed(() => {
  if (language.value === 'fa') return 'انتخاب کد پستی'
  if (language.value === 'fi') return 'Valitse postinumeroalue'
  return 'Choose a postal code area'
})

const metricOptions = computed(() => [
  {
    id: 'population' as const,
    label: language.value === 'fa' ? 'جمعیت' : language.value === 'fi' ? 'Väestö' : 'Population',
  },
  {
    id: 'employed' as const,
    label: language.value === 'fa' ? 'شاغلان' : language.value === 'fi' ? 'Työlliset' : 'Employed',
  },
  {
    id: 'unemployed' as const,
    label:
      language.value === 'fa' ? 'بیکاران' : language.value === 'fi' ? 'Työttömät' : 'Unemployed',
  },
  {
    id: 'students' as const,
    label:
      language.value === 'fa' ? 'دانشجویان' : language.value === 'fi' ? 'Opiskelijat' : 'Students',
  },
  {
    id: 'income' as const,
    label:
      language.value === 'fa'
        ? 'درآمد متوسط'
        : language.value === 'fi'
          ? 'Keskitulo'
          : 'Average income',
  },
])

function areaName(area: PostalCodeArea): string {
  return language.value === 'fi' ? area.nameFi : area.nameSv || area.nameFi
}

function metricLabel(): string {
  return metricOptions.value.find((option) => option.id === metric.value)?.label ?? metric.value
}

function formatMetric(area: PostalCodeArea): string {
  const value = postalMetricValue(area, metric.value)
  if (value === null) return '—'
  return metric.value === 'income'
    ? currencyFormatter.value.format(value)
    : numberFormatter.value.format(value)
}

function range(): { min: number; max: number } | null {
  const values = postalAreas.value
    .map((area) => postalMetricValue(area, metric.value))
    .filter((value): value is number => value !== null && value >= 0)
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null
}

function renderPostalAreas(): void {
  if (!map || !postalGroup) return
  postalGroup.clearLayers()
  const metricRange = range()

  for (const area of postalAreas.value) {
    const value = postalMetricValue(area, metric.value)
    const normalized =
      value === null || !metricRange || metricRange.max === metricRange.min
        ? 0.35
        : Math.max(0, Math.min(1, (value - metricRange.min) / (metricRange.max - metricRange.min)))
    const polygon: Polygon = L.polygon(postalRingsForLeaflet(area), {
      color: '#6f4a8e',
      weight: 2,
      opacity: 0.9,
      fillColor: value === null ? '#9da3a0' : '#6f4a8e',
      fillOpacity: value === null ? 0.08 : 0.14 + normalized * 0.58,
    }).addTo(postalGroup)
    polygon.bindTooltip(
      `${area.code} · ${areaName(area)} · ${metricLabel()}: ${formatMetric(area)}`,
      {
        sticky: true,
      },
    )
    polygon.on('click', () => {
      window.location.href = buildUrl({ postal: area.code })
    })
  }

  const bounds = postalGroup.getBounds()
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
}

onMounted(async () => {
  if (!mapElement.value) return
  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 10)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)
  postalGroup = L.featureGroup().addTo(map)
  try {
    postalAreas.value = (await fetchPostalCodeCollection()).areas
    renderPostalAreas()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Paavo data loading failed'
  } finally {
    loading.value = false
  }
})

watch([metric, language], () => renderPostalAreas())

onBeforeUnmount(() => {
  postalGroup?.remove()
  postalGroup = null
  map?.remove()
  map = null
})
</script>

<template>
  <article class="map-card postal-map-card">
    <div class="map-card__header postal-map-card__header">
      <div>
        <p class="eyebrow">Paavo · Statistics Finland · 2024</p>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <label class="postal-metric-control">
        <span>{{ metricLabel() }}</span>
        <select v-model="metric">
          <option v-for="option in metricOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
    <div v-if="loading" class="map-card__status">Loading Paavo…</div>
    <div v-else-if="error" class="map-card__status">{{ error }}</div>
    <div ref="mapElement" class="map-canvas postal-map" role="region" :aria-label="title" />
    <nav v-if="postalAreas.length" class="postal-accessible-selector" :aria-label="selectorLabel">
      <span class="postal-accessible-selector__label">{{ selectorLabel }}</span>
      <ul class="postal-accessible-selector__list">
        <li v-for="area in postalAreas" :key="area.code">
          <a :href="buildUrl({ postal: area.code })">{{ area.code }} · {{ areaName(area) }}</a>
        </li>
      </ul>
    </nav>
    <footer class="postal-map-source">
      <span>Click a postal polygon or use the postal-code links for statistics and intersecting municipal areas.</span>
      <a
        href="https://stat.fi/en/services/statistical-data-services/geographic-data/geographic-data-by-postal-code-area"
        target="_blank"
        rel="noreferrer"
      >
        Source · Statistics Finland · CC BY 4.0
      </a>
    </footer>
  </article>
</template>
