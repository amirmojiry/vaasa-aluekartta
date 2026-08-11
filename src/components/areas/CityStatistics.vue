<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import PopulationTrendChart from '@/components/areas/PopulationTrendChart.vue'
import { localeForLanguage, useI18n } from '@/i18n'
import { fetchStatisticsDatabase } from '@/services/areaStatistics'
import {
  buildCityStatisticsSnapshot,
  type CityStatisticsSnapshot,
} from '@/services/cityStatistics'
import { fetchMajorAreaPopulationHistoryDatabase } from '@/services/populationHistory'

const { language, t } = useI18n()
const statistics = ref<CityStatisticsSnapshot | null>(null)
const populationSource = ref<{ title: string; url: string } | null>(null)
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
const yearFormatter = computed(
  () => new Intl.NumberFormat(localeForLanguage(language.value), { useGrouping: false }),
)

function formatPercent(value: number): string {
  return `${percentFormatter.value.format(value)}%`
}

const title = computed(() => {
  if (language.value === 'fa') return 'آمار تاریخی کل واسا'
  if (language.value === 'fi') return 'Vaasan historialliset tilastot'
  return 'Historical statistics for Vaasa'
})

const derivedNote = computed(() => {
  if (language.value === 'fa') {
    return 'جمعیت از جمع مناطق بزرگ در سال‌های قابل‌مقایسه به‌دست آمده است. درصدهای ۲۰۱۳ و ۲۰۱۵ برآوردهای وزن‌دهی‌شده با جمعیت مناطق هستند.'
  }
  if (language.value === 'fi') {
    return 'Väkiluku on suuralueiden summa vertailukelpoisina vuosina. Vuosien 2013 ja 2015 osuudet ovat väestöpainotettuja johdettuja arvioita.'
  }
  return 'Population is summed across major areas for comparable years. The 2013 and 2015 shares are population-weighted derived estimates.'
})

onMounted(async () => {
  try {
    const [statisticsDatabase, populationDatabase] = await Promise.all([
      fetchStatisticsDatabase(),
      fetchMajorAreaPopulationHistoryDatabase(),
    ])
    statistics.value = buildCityStatisticsSnapshot(statisticsDatabase, populationDatabase)
    populationSource.value = populationDatabase.source
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="area-statistics city-statistics" aria-labelledby="city-statistics-title">
    <div class="area-statistics__header">
      <div>
        <p class="eyebrow">{{ t('historicalStatistics') }}</p>
        <h2 id="city-statistics-title">{{ title }}</h2>
      </div>
      <p class="area-statistics__note">{{ t('statisticsYearNote') }}</p>
    </div>

    <p v-if="loading" class="area-statistics__state">{{ t('loading') }}</p>
    <p v-else-if="failed || !statistics" class="area-statistics__state">
      {{ t('statisticsUnavailable') }}
    </p>

    <template v-else>
      <PopulationTrendChart :observations="statistics.populationHistory" />
      <p v-if="populationSource" class="population-trend__source">
        {{ t('populationHistorySource') }}:
        <a :href="populationSource.url" target="_blank" rel="noreferrer">
          {{ populationSource.title }}
        </a>
      </p>

      <div class="statistics-grid">
        <article class="stat-card stat-card--primary">
          <span class="stat-card__label">{{ t('population') }}</span>
          <strong>{{ numberFormatter.format(statistics.population) }}</strong>
          <small>{{ yearFormatter.format(statistics.populationYear) }}</small>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ t('studentsShare') }}</span>
          <strong>{{ formatPercent(statistics.studentShare2013) }}</strong>
          <small>2013 · {{ t('derivedMetric') }}</small>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ t('employedShare') }}</span>
          <strong>{{ formatPercent(statistics.employedShare2013) }}</strong>
          <small>2013 · {{ t('derivedMetric') }}</small>
        </article>

        <article class="stat-card">
          <span class="stat-card__label">{{ t('unemploymentRate') }}</span>
          <strong>{{ formatPercent(statistics.unemployment2013) }}</strong>
          <small>2013 · {{ t('derivedMetric') }}</small>
        </article>
      </div>

      <section class="language-statistics" aria-labelledby="city-languages-title">
        <div class="language-statistics__heading">
          <h3 id="city-languages-title">{{ t('motherTongue') }}</h3>
          <span>2015 · {{ t('derivedMetric') }}</span>
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

      <p class="city-statistics__note">{{ derivedNote }}</p>
    </template>
  </section>
</template>
