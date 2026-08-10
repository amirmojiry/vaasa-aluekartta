<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { AreaLevel } from '@/domain/areas'
import type { AreaStatisticRecord, AreaStatisticsDatabase } from '@/domain/statistics'
import { useI18n } from '@/i18n'
import { fetchAreaStatistics, fetchStatisticsDatabase } from '@/services/areaStatistics'

const props = defineProps<{
  level: AreaLevel
  areaName: string
}>()

const { language, t } = useI18n()
const statistics = ref<AreaStatisticRecord | null>(null)
const database = ref<AreaStatisticsDatabase | null>(null)
const failed = ref(false)
const studentIcons = Array.from({ length: 10 }, (_, index) => index)

const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)

const populationRank = computed(() => {
  if (!statistics.value || !database.value) return null
  const prefix = `${props.level}:`
  const populations = Object.entries(database.value.areas)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value.p)
  const rank =
    populations.filter((population) => population > statistics.value!.population2015).length + 1
  return { rank, total: populations.length }
})

const populationRankText = computed(() => {
  if (!populationRank.value) return ''
  const { rank, total } = populationRank.value
  const group = props.level === 'suuralue' ? t('majorAreas') : t('minorAreas')
  if (language.value === 'fa') {
    return `(${t('populationRank')} ${numberFormatter.value.format(rank)} ${t('rankOf')} ${numberFormatter.value.format(total)} ${t('among')} ${group})`
  }
  return `(${t('populationRank')} ${numberFormatter.value.format(rank)} ${t('rankOf')} ${numberFormatter.value.format(total)} ${group})`
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
        <span>
          <i class="legend-dot legend-dot--employed" />{{ t('employed') }}
          <strong>{{ formatPercent(statistics.employedShare2013) }}</strong>
        </span>
        <span>
          <i class="legend-dot legend-dot--unemployed" />{{ t('unemployed') }}
          <strong>{{ formatPercent(statistics.unemployment2013) }}</strong>
        </span>
      </div>
    </div>

    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong>{{ t('students') }}</strong>
        <span>{{ formatPercent(statistics.studentShare2013) }} · 2013</span>
      </div>
      <div
        class="student-pictogram"
        :aria-label="`${t('students')}: ${formatPercent(statistics.studentShare2013)}`"
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

    <div class="summary-population">
      <span>{{ t('population') }} · 2015</span>
      <strong>{{ formatNumber(statistics.population2015) }}</strong>
      <small>{{ populationRankText }}</small>
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
        <span>
          <i class="legend-dot legend-dot--finnish" />{{ t('finnish') }}
          <strong>{{ formatPercent(statistics.language2015.finnish) }}</strong>
        </span>
        <span>
          <i class="legend-dot legend-dot--swedish" />{{ t('swedish') }}
          <strong>{{ formatPercent(statistics.language2015.swedish) }}</strong>
        </span>
        <span>
          <i class="legend-dot legend-dot--other-language" />{{ t('otherLanguages') }}
          <strong>{{ formatPercent(statistics.language2015.other) }}</strong>
        </span>
      </div>
    </div>
  </section>

  <p v-else-if="failed" class="area-stat-summary area-stat-summary--empty">
    {{ t('statisticsUnavailable') }}
  </p>
</template>
