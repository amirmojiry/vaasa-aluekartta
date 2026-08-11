<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import PopulationTrendChart from '@/components/areas/PopulationTrendChart.vue'
import type { AreaLevel } from '@/domain/areas'
import type {
  MajorAreaPopulationHistory,
  MajorAreaPopulationHistoryDatabase,
} from '@/domain/populationHistory'
import type { AreaStatisticRecord, AreaStatisticsDatabase } from '@/domain/statistics'
import { localeForLanguage, useI18n } from '@/i18n'
import { fetchAreaStatistics, fetchStatisticsDatabase } from '@/services/areaStatistics'
import {
  fetchMajorAreaPopulationHistory,
  fetchMajorAreaPopulationHistoryDatabase,
  latestPopulationChange,
} from '@/services/populationHistory'

const props = defineProps<{
  level: AreaLevel
  areaName: string
}>()

const { language, t } = useI18n()
const statistics = ref<AreaStatisticRecord | null>(null)
const database = ref<AreaStatisticsDatabase | null>(null)
const populationHistory = ref<MajorAreaPopulationHistory | null>(null)
const populationHistoryDatabase = ref<MajorAreaPopulationHistoryDatabase | null>(null)
const loading = ref(true)
const failed = ref(false)

const numberFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)
const source = computed(() => database.value?.sources.komsi2016)
const latestMajorPopulation = computed(() =>
  populationHistory.value ? latestPopulationChange(populationHistory.value) : null,
)
const displayedPopulation = computed(() =>
  props.level === 'suuralue' && latestMajorPopulation.value
    ? latestMajorPopulation.value.current.population
    : statistics.value?.population2015,
)
const displayedPopulationYear = computed(() =>
  props.level === 'suuralue' && latestMajorPopulation.value
    ? latestMajorPopulation.value.current.year
    : 2015,
)

function formatNumber(value: number): string {
  return numberFormatter.value.format(value)
}

function formatPercent(value: number): string {
  return `${percentFormatter.value.format(value)}%`
}

onMounted(async () => {
  try {
    const [record, loadedDatabase, history, historyDatabase] = await Promise.all([
      fetchAreaStatistics(props.level, props.areaName),
      fetchStatisticsDatabase(),
      props.level === 'suuralue'
        ? fetchMajorAreaPopulationHistory(props.areaName)
        : Promise.resolve(null),
      props.level === 'suuralue'
        ? fetchMajorAreaPopulationHistoryDatabase()
        : Promise.resolve(null),
    ])
    statistics.value = record
    database.value = loadedDatabase
    populationHistory.value = history
    populationHistoryDatabase.value = historyDatabase
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="area-statistics" :aria-labelledby="`statistics-${level}-${areaName}`">
    <div class="area-statistics__header">
      <div>
        <p class="eyebrow">{{ t('historicalStatistics') }}</p>
        <h2 :id="`statistics-${level}-${areaName}`">{{ t('areaStatistics') }}</h2>
      </div>
      <p class="area-statistics__note">{{ t('statisticsYearNote') }}</p>
    </div>

    <p v-if="loading" class="area-statistics__state">{{ t('loading') }}</p>
    <p v-else-if="failed || !statistics" class="area-statistics__state">
      {{ t('statisticsUnavailable') }}
    </p>

    <template v-else>
      <PopulationTrendChart
        v-if="level === 'suuralue' && populationHistory"
        :observations="populationHistory.observations"
      />
      <p v-if="level === 'suuralue' && populationHistoryDatabase" class="population-trend__source">
        {{ t('populationHistorySource') }}:
        <a :href="populationHistoryDatabase.source.url" target="_blank" rel="noreferrer">
          {{ populationHistoryDatabase.source.title }}
        </a>
      </p>

      <div class="statistics-grid">
        <article class="stat-card stat-card--primary">
          <span class="stat-card__label">{{ t('population') }}</span>
          <strong v-if="displayedPopulation !== undefined">{{
            formatNumber(displayedPopulation)
          }}</strong>
          <small>{{ displayedPopulationYear }}</small>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ t('studentsShare') }}</span>
          <strong>{{ formatPercent(statistics.studentShare2013) }}</strong>
          <small>2013</small>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ t('employedShare') }}</span>
          <strong>{{ formatPercent(statistics.employedShare2013) }}</strong>
          <small>2013 · {{ t('derivedMetric') }}</small>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ t('unemploymentRate') }}</span>
          <strong>{{ formatPercent(statistics.unemployment2013) }}</strong>
          <small>2013</small>
        </article>
      </div>

      <section class="language-statistics" :aria-labelledby="`languages-${level}-${areaName}`">
        <div class="language-statistics__heading">
          <h3 :id="`languages-${level}-${areaName}`">{{ t('motherTongue') }}</h3>
          <span>2015</span>
        </div>
        <div class="language-statistics__grid">
          <div>
            <span>{{ t('finnish') }}</span>
            <strong>{{ formatPercent(statistics.language2015.finnish) }}</strong>
          </div>
          <div>
            <span>{{ t('swedish') }}</span>
            <strong>{{ formatPercent(statistics.language2015.swedish) }}</strong>
          </div>
          <div>
            <span>{{ t('otherLanguages') }}</span>
            <strong>{{ formatPercent(statistics.language2015.other) }}</strong>
          </div>
        </div>
      </section>

      <footer v-if="source" class="area-statistics__source">
        <span>{{ t('statisticsSource') }}:</span>
        <a v-if="source.itemUrl" :href="source.itemUrl" target="_blank" rel="noreferrer">
          Sanna Komsi, {{ source.year }} · {{ source.institution }}
        </a>
        <span v-else>Sanna Komsi, {{ source.year }}</span>
      </footer>
    </template>
  </section>
</template>
