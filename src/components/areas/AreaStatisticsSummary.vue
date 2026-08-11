<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import ElectionTopParties from '@/components/areas/ElectionTopParties.vue'
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
  majorAreaPopulationRank,
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
const failed = ref(false)
const studentIcons = Array.from({ length: 10 }, (_, index) => index)

const numberFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)

const latestMajorPopulation = computed(() =>
  populationHistory.value ? latestPopulationChange(populationHistory.value) : null,
)

const majorPopulationRank = computed(() =>
  populationHistoryDatabase.value
    ? majorAreaPopulationRank(populationHistoryDatabase.value, props.areaName)
    : null,
)

const peerStatistics = computed(() => {
  if (!database.value) return []
  const prefix = `${props.level}:`
  return Object.entries(database.value.areas)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value)
})

const legacyPopulationRank = computed(() => {
  if (!statistics.value) return null
  const populations = peerStatistics.value.map((value) => value.p)
  const rank =
    populations.filter((population) => population > statistics.value!.population2015).length + 1
  return {
    rank,
    total: populations.length,
    population: statistics.value.population2015,
    year: 2015,
  }
})

const displayedPopulation = computed(() => {
  if (props.level === 'suuralue' && latestMajorPopulation.value) {
    return latestMajorPopulation.value.current.population
  }
  return statistics.value?.population2015 ?? null
})

const displayedPopulationYear = computed(() => {
  if (props.level === 'suuralue' && latestMajorPopulation.value) {
    return latestMajorPopulation.value.current.year
  }
  return 2015
})

const populationRank = computed(() =>
  props.level === 'suuralue' ? majorPopulationRank.value : legacyPopulationRank.value,
)

function rankFor(value: number, selector: (record: AreaStatisticRecord) => number): {
  rank: number
  total: number
} | null {
  const peers = peerStatistics.value
  if (!peers.length) return null
  return {
    rank: peers.filter((record) => selector(record) > value).length + 1,
    total: peers.length,
  }
}

const employedRank = computed(() =>
  statistics.value
    ? rankFor(statistics.value.employedShare2013, (record) => record.employedShare2013)
    : null,
)
const unemployedRank = computed(() =>
  statistics.value
    ? rankFor(statistics.value.unemployment2013, (record) => record.unemployment2013)
    : null,
)
const studentRank = computed(() =>
  statistics.value
    ? rankFor(statistics.value.studentShare2013, (record) => record.studentShare2013)
    : null,
)
const finnishRank = computed(() =>
  statistics.value
    ? rankFor(statistics.value.language2015.finnish, (record) => record.language2015.finnish)
    : null,
)
const swedishRank = computed(() =>
  statistics.value
    ? rankFor(statistics.value.language2015.swedish, (record) => record.language2015.swedish)
    : null,
)
const otherLanguageRank = computed(() =>
  statistics.value
    ? rankFor(statistics.value.language2015.other, (record) => record.language2015.other)
    : null,
)

function compactRankText(rank: { rank: number; total: number } | null): string {
  if (!rank) return ''
  if (language.value === 'fa') {
    return `(${t('rank')} ${numberFormatter.value.format(rank.rank)} ${t('rankOf')} ${numberFormatter.value.format(rank.total)})`
  }
  if (language.value === 'fi') {
    return `(${t('rank')} ${numberFormatter.value.format(rank.rank)}/${numberFormatter.value.format(rank.total)})`
  }
  return `(${t('rank')} ${numberFormatter.value.format(rank.rank)} ${t('rankOf')} ${numberFormatter.value.format(rank.total)})`
}

const populationRankText = computed(() => {
  if (!populationRank.value) return ''
  const { rank, total } = populationRank.value
  const group = props.level === 'suuralue' ? t('majorAreas') : t('minorAreas')
  if (language.value === 'fa') {
    return `(${t('populationRank')} ${numberFormatter.value.format(rank)} ${t('rankOf')} ${numberFormatter.value.format(total)} ${t('among')} ${group})`
  }
  if (language.value === 'fi') {
    return `(${t('populationRank')} ${numberFormatter.value.format(rank)}/${numberFormatter.value.format(total)}, ${group.toLowerCase()})`
  }
  return `(${t('populationRank')} ${numberFormatter.value.format(rank)} ${t('rankOf')} ${numberFormatter.value.format(total)} ${group})`
})

const populationChangeText = computed(() => {
  const change = latestMajorPopulation.value
  if (props.level !== 'suuralue' || !change?.previous || change.percent === null) return ''
  const percent = `${percentFormatter.value.format(Math.abs(change.percent))}%`
  const previousYear = new Intl.NumberFormat(localeForLanguage(language.value), {
    useGrouping: false,
  }).format(change.previous.year)
  return `${percent} ${t('comparedWith')} ${previousYear}`
})

const populationChangeDirection = computed(() => {
  const percent = latestMajorPopulation.value?.percent
  if (percent === null || percent === undefined || percent === 0) return 'neutral'
  return percent > 0 ? 'up' : 'down'
})

function formatNumber(value: number): string {
  return numberFormatter.value.format(value)
}

function formatPercent(value: number): string {
  return `${percentFormatter.value.format(value)}%`
}

function studentIconFill(index: number): string {
  if (!statistics.value) return '0%'
  const remaining = statistics.value.studentShare2013 - index * 10
  return `${Math.max(0, Math.min(10, remaining)) * 10}%`
}

onMounted(async () => {
  try {
    const [record, loadedDatabase] = await Promise.all([
      fetchAreaStatistics(props.level, props.areaName),
      fetchStatisticsDatabase(),
    ])
    statistics.value = record
    database.value = loadedDatabase

    if (props.level === 'suuralue') {
      const [history, historyDatabase] = await Promise.all([
        fetchMajorAreaPopulationHistory(props.areaName),
        fetchMajorAreaPopulationHistoryDatabase(),
      ])
      populationHistory.value = history
      populationHistoryDatabase.value = historyDatabase
    }
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <section v-if="statistics" class="area-stat-summary" :aria-label="t('statisticsOverview')">
    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong>{{ t('employment') }}</strong>
        <span>2013</span>
      </div>
      <div class="summary-bar summary-bar--employment" aria-hidden="true">
        <span
          class="summary-bar__segment summary-bar__segment--employed"
          :style="{ width: `${statistics.employedShare2013}%` }"
        />
        <span
          class="summary-bar__segment summary-bar__segment--unemployed"
          :style="{ width: `${statistics.unemployment2013}%` }"
        />
      </div>
      <div class="summary-legend">
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--employed" />
          <span>{{ t('employed') }}</span>
          <strong>{{ formatPercent(statistics.employedShare2013) }}</strong>
          <small>{{ compactRankText(employedRank) }}</small>
        </span>
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--unemployed" />
          <span>{{ t('unemployed') }}</span>
          <strong>{{ formatPercent(statistics.unemployment2013) }}</strong>
          <small>{{ compactRankText(unemployedRank) }}</small>
        </span>
      </div>
    </div>

    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong>{{ t('students') }}</strong>
        <span>
          {{ formatPercent(statistics.studentShare2013) }} {{ compactRankText(studentRank) }} · 2013
        </span>
      </div>
      <div
        class="student-pictogram"
        :aria-label="`${t('students')}: ${formatPercent(statistics.studentShare2013)} ${compactRankText(studentRank)}`"
      >
        <span v-for="index in studentIcons" :key="index" class="student-icon">
          <svg class="student-icon__base" viewBox="0 0 32 40" aria-hidden="true">
            <path
              d="M16 2 2 8.3l14 6.3 11-4.9v6.7h2V8.3L16 2Zm-7.6 10.4v5.1c0 3.2 3.4 5.8 7.6 5.8s7.6-2.6 7.6-5.8v-5.1L16 15.8l-7.6-3.4ZM16 24.7c-6.5 0-11.2 3.7-11.2 8.9V38h22.4v-4.4c0-5.2-4.7-8.9-11.2-8.9Z"
            />
          </svg>
          <span class="student-icon__fill" :style="{ width: studentIconFill(index) }">
            <svg viewBox="0 0 32 40" aria-hidden="true">
              <path
                d="M16 2 2 8.3l14 6.3 11-4.9v6.7h2V8.3L16 2Zm-7.6 10.4v5.1c0 3.2 3.4 5.8 7.6 5.8s7.6-2.6 7.6-5.8v-5.1L16 15.8l-7.6-3.4ZM16 24.7c-6.5 0-11.2 3.7-11.2 8.9V38h22.4v-4.4c0-5.2-4.7-8.9-11.2-8.9Z"
              />
            </svg>
          </span>
        </span>
      </div>
    </div>

    <div v-if="displayedPopulation !== null" class="summary-population">
      <span>{{ t('population') }} · {{ displayedPopulationYear }}</span>
      <strong>{{ formatNumber(displayedPopulation) }}</strong>
      <small>{{ populationRankText }}</small>
      <span
        v-if="populationChangeText"
        :class="['population-change', `population-change--${populationChangeDirection}`]"
      >
        <span aria-hidden="true">{{ populationChangeDirection === 'up' ? '▲' : '▼' }}</span>
        {{ populationChangeText }}
      </span>
    </div>

    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong>{{ t('languageShare') }}</strong>
        <span>2015</span>
      </div>
      <div class="summary-bar summary-bar--languages" aria-hidden="true">
        <span
          class="summary-bar__segment summary-bar__segment--finnish"
          :style="{ width: `${statistics.language2015.finnish}%` }"
        />
        <span
          class="summary-bar__segment summary-bar__segment--swedish"
          :style="{ width: `${statistics.language2015.swedish}%` }"
        />
        <span
          class="summary-bar__segment summary-bar__segment--other-language"
          :style="{ width: `${statistics.language2015.other}%` }"
        />
      </div>
      <div class="summary-legend summary-legend--languages">
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--finnish" />
          <span>{{ t('finnish') }}</span>
          <strong>{{ formatPercent(statistics.language2015.finnish) }}</strong>
          <small>{{ compactRankText(finnishRank) }}</small>
        </span>
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--swedish" />
          <span>{{ t('swedish') }}</span>
          <strong>{{ formatPercent(statistics.language2015.swedish) }}</strong>
          <small>{{ compactRankText(swedishRank) }}</small>
        </span>
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--other-language" />
          <span>{{ t('otherLanguages') }}</span>
          <strong>{{ formatPercent(statistics.language2015.other) }}</strong>
          <small>{{ compactRankText(otherLanguageRank) }}</small>
        </span>
      </div>
    </div>

    <ElectionTopParties v-if="level === 'suuralue'" :level="level" :area-name="areaName" />
  </section>

  <p v-else-if="failed" class="area-stat-summary area-stat-summary--empty">
    {{ t('statisticsUnavailable') }}
  </p>
</template>
