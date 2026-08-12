<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import ThematicMap from '@/components/analysis/ThematicMap.vue'
import { AREAS } from '@/config/areas'
import type { AreaLevel, LocalizedAreaNames } from '@/domain/areas'
import { localeForLanguage, localizeAreaName, useI18n } from '@/i18n'
import {
  fetchAnalysisMetricDataset,
  rankAnalysisObservations,
  type AnalysisMetric,
  type AnalysisMetricDataset,
} from '@/services/analysisMetrics'
import { fetchPienalueBoundaries } from '@/services/boundaryData'

const props = defineProps<{ metric: AnalysisMetric }>()
const { buildUrl, language, t } = useI18n()
const requestedLevel = new URLSearchParams(window.location.search).get('level')
const level = ref<AreaLevel>(requestedLevel === 'pienalue' ? 'pienalue' : 'suuralue')
const dataset = ref<AnalysisMetricDataset | null>(null)
const minorAreaRelationIds = ref(new Map<string, number>())
const minorAreaNames = ref(new Map<string, LocalizedAreaNames>())
const loading = ref(true)
const failed = ref(false)
let loadToken = 0

const labels = {
  en: {
    population: 'Population by area',
    employed: 'Employment by area',
    unemployed: 'Unemployment by area',
    students: 'Students relative to labour-force size by area',
    'language-finnish': 'Finnish mother tongue by area',
    'language-swedish': 'Swedish mother tongue by area',
    'language-other': 'Other mother tongues by area',
    income: 'Average taxable income by area',
    intro: 'Compare Vaasa areas on the map, bar chart, and detailed table.',
    barChart: 'Comparison by area',
    table: 'Show detailed table',
    area: 'Area',
    value: 'Value',
    year: 'Year',
    rank: 'Rank',
    noData: 'No source-backed observations are available for this area level.',
    source: 'Source',
    back: 'Back to Vaasa map',
  },
  fi: {
    population: 'Väestö alueittain',
    employed: 'Työllisyys alueittain',
    unemployed: 'Työttömyys alueittain',
    students: 'Opiskelijat suhteessa työvoiman määrään alueittain',
    'language-finnish': 'Suomenkieliset alueittain',
    'language-swedish': 'Ruotsinkieliset alueittain',
    'language-other': 'Muut äidinkielet alueittain',
    income: 'Keskimääräiset veronalaiset tulot alueittain',
    intro: 'Vertaa Vaasan alueita kartalla, pylväskaaviossa ja tarkassa taulukossa.',
    barChart: 'Aluevertailu',
    table: 'Näytä tarkka taulukko',
    area: 'Alue',
    value: 'Arvo',
    year: 'Vuosi',
    rank: 'Sija',
    noData: 'Tälle aluetasolle ei ole lähteeseen perustuvia havaintoja.',
    source: 'Lähde',
    back: 'Takaisin Vaasan kartalle',
  },
  fa: {
    population: 'جمعیت مناطق',
    employed: 'شاغلان در مناطق',
    unemployed: 'بیکاران در مناطق',
    students: 'دانشجویان نسبت به اندازه نیروی کار در مناطق',
    'language-finnish': 'فنلاندی‌زبان‌ها در مناطق',
    'language-swedish': 'سوئدی‌زبان‌ها در مناطق',
    'language-other': 'سایر زبان‌های مادری در مناطق',
    income: 'میانگین درآمد مشمول مالیات مناطق',
    intro: 'مقایسه مناطق واسا روی نقشه، نمودار میله‌ای و جدول جزئیات.',
    barChart: 'مقایسه مناطق',
    table: 'نمایش جدول جزئیات',
    area: 'منطقه',
    value: 'مقدار',
    year: 'سال',
    rank: 'رتبه',
    noData: 'برای این سطح منطقه داده مستند قابل استفاده موجود نیست.',
    source: 'منبع',
    back: 'بازگشت به نقشه واسا',
  },
} as const

const metricColors: Record<AnalysisMetric, string> = {
  population: '#0b3d3a',
  employed: '#17645d',
  unemployed: '#c65b42',
  students: '#8a5f21',
  'language-finnish': '#2878a8',
  'language-swedish': '#d39a19',
  'language-other': '#7a4b9d',
  income: '#2f6b4f',
}

const text = computed(() => labels[language.value])
const title = computed(() => text.value[props.metric])
const ranked = computed(() => rankAnalysisObservations(dataset.value?.observations ?? []))
const maxValue = computed(() => Math.max(1, ...ranked.value.map((item) => item.value)))
const numberFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))
const yearFormatter = computed(
  () => new Intl.NumberFormat(localeForLanguage(language.value), { useGrouping: false }),
)
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

function formatValue(value: number): string {
  if (dataset.value?.unit === 'percent') return `${percentFormatter.value.format(value)}%`
  if (dataset.value?.unit === 'eur_per_year') return currencyFormatter.value.format(value)
  return numberFormatter.value.format(value)
}

function displayAreaName(name: string): string {
  const names = level.value === 'pienalue' ? minorAreaNames.value.get(name) : undefined
  return localizeAreaName(names, name, language.value)
}

function areaHref(name: string): string | null {
  if (level.value === 'suuralue') {
    const area = AREAS.find((candidate) => candidate.name === name)
    return area ? buildUrl({ area: area.slug }) : null
  }

  const relationId = minorAreaRelationIds.value.get(name)
  return relationId ? buildUrl({ pienalue: relationId }) : null
}

function setLevel(next: AreaLevel): void {
  level.value = next
  const search = new URLSearchParams(window.location.search)
  search.set('level', next)
  window.history.replaceState(null, '', `${window.location.pathname}?${search.toString()}`)
}

async function load(): Promise<void> {
  const token = ++loadToken
  const requestedMetric = props.metric
  const requestedAreaLevel = level.value
  loading.value = true
  failed.value = false

  try {
    const [nextDataset, minorBoundaries] = await Promise.all([
      fetchAnalysisMetricDataset(requestedMetric, requestedAreaLevel),
      requestedAreaLevel === 'pienalue' ? fetchPienalueBoundaries(AREAS) : Promise.resolve(null),
    ])

    if (
      token !== loadToken ||
      requestedMetric !== props.metric ||
      requestedAreaLevel !== level.value
    ) {
      return
    }

    if (minorBoundaries) {
      minorAreaRelationIds.value = new Map(
        minorBoundaries.map((boundary) => [boundary.name, boundary.relationId]),
      )
      minorAreaNames.value = new Map(
        minorBoundaries.map((boundary) => [boundary.name, boundary.names]),
      )
    }
    dataset.value = nextDataset
  } catch {
    if (
      token !== loadToken ||
      requestedMetric !== props.metric ||
      requestedAreaLevel !== level.value
    ) {
      return
    }
    dataset.value = null
    failed.value = true
  } finally {
    if (
      token === loadToken &&
      requestedMetric === props.metric &&
      requestedAreaLevel === level.value
    ) {
      loading.value = false
    }
  }
}

onMounted(() => void load())
watch([() => props.metric, level], () => void load())
</script>

<template>
  <main class="analysis-page">
    <header class="analysis-page__hero">
      <nav class="topbar" :aria-label="t('primaryNavigation')">
        <a class="brand" :href="buildUrl()">
          <span class="brand__mark" aria-hidden="true">VA</span>
          <span>{{ t('appName') }}</span>
        </a>
        <LanguageSwitcher />
      </nav>
      <div class="analysis-page__intro">
        <a class="analysis-page__back" :href="buildUrl()">← {{ text.back }}</a>
        <h1>{{ title }}</h1>
        <p>{{ text.intro }}</p>
      </div>
    </header>

    <section class="analysis-page__content">
      <div class="analysis-level-toggle" :aria-label="t('boundaryLevel')">
        <button
          type="button"
          :class="{ 'is-active': level === 'suuralue' }"
          :aria-pressed="level === 'suuralue'"
          @click="setLevel('suuralue')"
        >
          {{ t('majorAreas') }}
        </button>
        <button
          type="button"
          :class="{ 'is-active': level === 'pienalue' }"
          :aria-pressed="level === 'pienalue'"
          @click="setLevel('pienalue')"
        >
          {{ t('minorAreas') }}
        </button>
      </div>

      <p v-if="loading" class="analysis-state">{{ t('loading') }}</p>
      <p v-else-if="failed" class="analysis-state">{{ t('statisticsUnavailable') }}</p>

      <template v-else-if="dataset">
        <ThematicMap
          :level="level"
          :items="dataset.observations"
          :color="metricColors[metric]"
          :format-value="formatValue"
        />

        <p v-if="dataset.observations.length === 0" class="analysis-state">{{ text.noData }}</p>

        <section v-else class="analysis-card">
          <h2>{{ text.barChart }}</h2>
          <div class="analysis-bars">
            <div v-for="item in ranked" :key="item.name" class="analysis-bar-row">
              <div class="analysis-bar-row__label">
                <span>
                  <strong>{{ numberFormatter.format(item.rank) }}.</strong>
                  <a
                    v-if="areaHref(item.name)"
                    class="analysis-area-link"
                    :href="areaHref(item.name) ?? undefined"
                  >
                    {{ displayAreaName(item.name) }}
                  </a>
                  <span v-else>{{ displayAreaName(item.name) }}</span>
                </span>
                <strong>{{ formatValue(item.value) }}</strong>
              </div>
              <div class="analysis-bar-row__track" aria-hidden="true">
                <span
                  :style="{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: metricColors[metric],
                  }"
                />
              </div>
            </div>
          </div>
        </section>

        <details v-if="ranked.length" class="analysis-card analysis-details">
          <summary>{{ text.table }}</summary>
          <div class="analysis-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ text.rank }}</th>
                  <th>{{ text.area }}</th>
                  <th>{{ text.value }}</th>
                  <th>{{ text.year }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in ranked" :key="`table-${item.name}`">
                  <td>{{ numberFormatter.format(item.rank) }}</td>
                  <td>
                    <a
                      v-if="areaHref(item.name)"
                      class="analysis-area-link"
                      :href="areaHref(item.name) ?? undefined"
                    >
                      {{ displayAreaName(item.name) }}
                    </a>
                    <span v-else>{{ displayAreaName(item.name) }}</span>
                  </td>
                  <td>{{ formatValue(item.value) }}</td>
                  <td>{{ yearFormatter.format(item.year) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <p v-if="dataset.sourceUrl" class="analysis-source">
          {{ text.source }}:
          <a :href="dataset.sourceUrl" target="_blank" rel="noreferrer">{{
            dataset.sourceLabel
          }}</a>
        </p>
      </template>
    </section>
  </main>
</template>

<style scoped>
.analysis-page {
  min-height: 100vh;
  background: #f3f0e8;
  color: var(--ink);
}
.analysis-page__hero {
  padding: 0 0 2rem;
  background: var(--deep-green);
  color: #fff;
}
.analysis-page__intro {
  width: min(1100px, calc(100% - 2rem));
  margin: 2rem auto 0;
}
.analysis-page__intro h1 {
  margin: 0.45rem 0;
  font-size: clamp(2rem, 5vw, 3.6rem);
}
.analysis-page__intro p {
  max-width: 46rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
}
.analysis-page__back {
  color: rgba(255, 255, 255, 0.82);
  font-weight: 750;
}
.analysis-page__content {
  display: grid;
  gap: 1.25rem;
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 3rem;
}
.analysis-level-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.analysis-level-toggle button {
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fffdf8;
  color: var(--ink);
  font-weight: 750;
  cursor: pointer;
}
.analysis-level-toggle button.is-active {
  border-color: var(--green);
  background: #dfeee9;
  color: #0c514b;
}
.analysis-state,
.analysis-card {
  margin: 0;
  padding: 1rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  background: var(--paper);
  box-shadow: var(--shadow);
}
.analysis-card h2 {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}
.analysis-bars {
  display: grid;
  gap: 0.7rem;
}
.analysis-bar-row {
  display: grid;
  gap: 0.3rem;
}
.analysis-bar-row__label {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.82rem;
}
.analysis-bar-row__track {
  height: 0.55rem;
  overflow: hidden;
  border-radius: 999px;
  background: #e3e8e5;
}
.analysis-bar-row__track span {
  display: block;
  min-width: 2px;
  height: 100%;
  border-radius: inherit;
}
.analysis-area-link {
  color: inherit;
  font-weight: 750;
  text-underline-offset: 0.15rem;
}
.analysis-details summary {
  color: var(--green);
  font-weight: 800;
  cursor: pointer;
}
.analysis-table-wrap {
  margin-top: 1rem;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
th,
td {
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid var(--line);
  text-align: start;
}
.analysis-source {
  margin: 0;
  color: #667570;
  font-size: 0.78rem;
}
.analysis-source a {
  color: var(--green);
  font-weight: 750;
}
@media (max-width: 650px) {
  .analysis-bar-row__label {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.15rem;
  }
}
</style>
