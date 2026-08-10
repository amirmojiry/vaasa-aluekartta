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
const loading = ref(true)
const failed = ref(false)

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
const source = computed(() => database.value?.sources.komsi2016)

function formatNumber(value: number): string {
  return numberFormatter.value.format(value)
}

function formatPercent(value: number): string {
  return `${percentFormatter.value.format(value)}%`
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
      <div class="statistics-grid">
        <article class="stat-card stat-card--primary">
          <span class="stat-card__label">{{ t('population') }}</span>
          <strong>{{ formatNumber(statistics.population2015) }}</strong>
          <small>2015</small>
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
