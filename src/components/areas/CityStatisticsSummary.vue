<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { ElectionStatisticsDatabase, ResolvedElectionDataset } from '@/domain/elections'
import { localeForLanguage, useI18n } from '@/i18n'
import { fetchAreaIncomeDatabase } from '@/services/areaIncome'
import { fetchStatisticsDatabase } from '@/services/areaStatistics'
import { buildCityStatisticsSnapshot, type CityStatisticsSnapshot } from '@/services/cityStatistics'
import {
  featuredElection,
  fetchCityElectionStatistics,
  fetchElectionStatisticsDatabase,
  partyColor,
  topParties,
} from '@/services/electionStatistics'
import { fetchMajorAreaPopulationHistoryDatabase } from '@/services/populationHistory'

const { buildUrl, language, t } = useI18n()
const statistics = ref<CityStatisticsSnapshot | null>(null)
const elections = ref<ResolvedElectionDataset | null>(null)
const electionDatabase = ref<ElectionStatisticsDatabase | null>(null)
const cityAverageIncome = ref<number | null>(null)
const incomeSourceUrl = ref<string | null>(null)
const failed = ref(false)
const studentIcons = Array.from({ length: 10 }, (_, index) => index)

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
const featured = computed(() => (elections.value ? featuredElection(elections.value) : null))
const parties = computed(() => (featured.value ? topParties(featured.value, 3) : []))
const incomeLabel = computed(() => {
  if (language.value === 'fa') return 'میانگین درآمد مشمول مالیات'
  if (language.value === 'fi') return 'Keskimääräiset veronalaiset tulot'
  return 'Average taxable income'
})
const incomeBasis = computed(() => {
  if (language.value === 'fa') return 'افراد ۱۵ سال به بالا · ۲۰۱۴'
  if (language.value === 'fi') return '15 vuotta täyttäneet · 2014'
  return 'Residents aged 15+ · 2014'
})
const incomeSourceLabel = computed(() => {
  if (language.value === 'fa') return 'منبع درآمد'
  if (language.value === 'fi') return 'Tulojen lähde'
  return 'Income source'
})

function metricHref(metric: string): string {
  return buildUrl({ metric })
}

function partyHref(code: string): string {
  return buildUrl({ party: code })
}

function formatPercent(value: number): string {
  return `${percentFormatter.value.format(value)}%`
}

function studentIconFill(index: number): string {
  if (!statistics.value) return '0%'
  const remaining = statistics.value.studentShare2013 - index * 10
  return `${Math.max(0, Math.min(10, remaining)) * 10}%`
}

function partyName(code: string): string {
  const meta = electionDatabase.value?.parties[code]
  if (!meta) return code
  if (language.value === 'fa') return meta.fa || meta.en || meta.fi
  if (language.value === 'fi') return meta.fi || meta.en || meta.fa
  return meta.en || meta.fi || meta.fa
}

function electionLabel(): string {
  if (!featured.value) return ''
  const type =
    featured.value.type === 'municipal'
      ? t('electionTypeMunicipal')
      : featured.value.type === 'regional'
        ? t('electionTypeRegional')
        : featured.value.type === 'european'
          ? t('electionTypeEuropean')
          : t('electionTypeParliamentary')
  return `${type} ${yearFormatter.value.format(featured.value.year)}`
}

const derivedNote = computed(() => {
  if (language.value === 'fa') {
    return 'درصدهای اشتغال و دانشجویان برآوردهای مشتق‌شده از داده‌های مناطق بزرگ و با وزن جمعیت ۲۰۱۵ هستند.'
  }
  if (language.value === 'fi') {
    return 'Työllisyys- ja opiskelijaosuudet ovat suuralueiden tiedoista johdettuja, vuoden 2015 väestöllä painotettuja arvioita.'
  }
  return 'Employment and student shares are derived estimates from major-area data, weighted by 2015 population.'
})

onMounted(async () => {
  try {
    const [statisticsDatabase, populationDatabase, cityElections, electionsDb, incomeDatabase] =
      await Promise.all([
        fetchStatisticsDatabase(),
        fetchMajorAreaPopulationHistoryDatabase(),
        fetchCityElectionStatistics(),
        fetchElectionStatisticsDatabase(),
        fetchAreaIncomeDatabase(),
      ])
    statistics.value = buildCityStatisticsSnapshot(statisticsDatabase, populationDatabase)
    elections.value = cityElections
    electionDatabase.value = electionsDb
    cityAverageIncome.value = incomeDatabase.cityAverage
    incomeSourceUrl.value = incomeDatabase.source.pdfUrl
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <section
    v-if="statistics"
    class="area-stat-summary city-stat-summary"
    :aria-label="t('statisticsOverview')"
  >
    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong>{{ t('employment') }}</strong>
        <span>2013 · {{ t('derivedMetric') }}</span>
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
          <a class="summary-analysis-link" :href="metricHref('employed')">{{ t('employed') }}</a>
          <strong>{{ formatPercent(statistics.employedShare2013) }}</strong>
        </span>
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--unemployed" />
          <a class="summary-analysis-link" :href="metricHref('unemployed')">{{ t('unemployed') }}</a>
          <strong>{{ formatPercent(statistics.unemployment2013) }}</strong>
        </span>
      </div>
    </div>

    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong><a class="summary-analysis-link" :href="metricHref('students')">{{ t('students') }}</a></strong>
        <span>
          {{ formatPercent(statistics.studentShare2013) }} · 2013 · {{ t('derivedMetric') }}
        </span>
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
      <span><a class="summary-analysis-link" :href="metricHref('population')">{{ t('population') }}</a> · {{ yearFormatter.format(statistics.populationYear) }}</span>
      <strong>{{ numberFormatter.format(statistics.population) }}</strong>
    </div>

    <div v-if="cityAverageIncome !== null" class="summary-metric city-income-summary">
      <div class="summary-metric__heading">
        <strong><a class="summary-analysis-link" :href="metricHref('income')">{{ incomeLabel }}</a></strong>
        <span>{{ incomeBasis }}</span>
      </div>
      <strong class="city-income-summary__value">{{ currencyFormatter.format(cityAverageIncome) }}</strong>
      <a v-if="incomeSourceUrl" class="city-income-summary__source" :href="incomeSourceUrl" target="_blank" rel="noreferrer">{{ incomeSourceLabel }} · Statistics Finland 2014b / Sanna Komsi (2016)</a>
    </div>

    <div v-if="featured && parties.length" class="election-top-parties">
      <div class="summary-metric__heading">
        <strong>{{ t('topParties') }}</strong>
        <span>{{ electionLabel() }}</span>
      </div>
      <div class="party-bars">
        <div v-for="party in parties" :key="party.party" class="party-bar-row">
          <div class="party-bar-row__label">
            <a class="summary-analysis-link" :href="partyHref(party.party)">{{ party.party }} · {{ partyName(party.party) }}</a>
            <strong>
              {{ percentFormatter.format(party.percent) }}% ·
              {{ numberFormatter.format(party.votes) }} {{ t('votes') }}
            </strong>
          </div>
          <div class="party-bar-row__track" aria-hidden="true">
            <span
              class="party-bar-row__fill"
              :style="{ width: `${party.percent}%`, backgroundColor: partyColor(party.party) }"
            />
          </div>
        </div>
      </div>
    </div>

    <p class="city-stat-summary__note">{{ derivedNote }}</p>
  </section>

  <p v-else-if="failed" class="area-stat-summary area-stat-summary--empty">
    {{ t('statisticsUnavailable') }}
  </p>
</template>

<style scoped>
.summary-analysis-link {
  color: inherit;
  font-weight: inherit;
  text-underline-offset: 0.16rem;
}

.city-income-summary__value {
  color: var(--deep-green);
  font-size: clamp(1.55rem, 3.6vw, 2.35rem);
  line-height: 1;
}

.city-income-summary__source {
  width: fit-content;
  color: var(--green);
  font-size: 0.7rem;
  font-weight: 700;
}
</style>
