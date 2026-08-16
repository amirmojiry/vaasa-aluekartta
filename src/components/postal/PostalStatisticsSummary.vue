<script setup lang="ts">
import { computed } from 'vue'

import type { PostalCodeArea, PostalCodeCollection, PostalMetric } from '@/domain/postal'
import { localeForLanguage, useI18n } from '@/i18n'
import { postalMetricRank } from '@/services/postalData'

const props = defineProps<{
  postal: PostalCodeArea
  collection: PostalCodeCollection
}>()

const { buildUrl, language } = useI18n()
const studentIcons = Array.from({ length: 10 }, (_, index) => index)

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

const labels = computed(() => {
  if (language.value === 'fa') {
    return {
      employment: 'وضعیت اشتغال',
      employed: 'شاغلان',
      unemployed: 'بیکاران',
      students: 'دانشجویان',
      population: 'جمعیت',
      income: 'میانگین درآمد سالانه',
      residents: 'سهم از جمعیت',
      count: 'نفر',
      rank: 'رتبه',
      of: 'از',
      perYear: 'در سال',
      caveat:
        'درصد شاغلان، بیکاران و دانشجویان سهم آن گروه از کل جمعیت کد پستی است؛ این مقادیر به مناطق شهرداری تبدیل نشده‌اند.',
    }
  }
  if (language.value === 'fi') {
    return {
      employment: 'Työllisyystilanne',
      employed: 'Työlliset',
      unemployed: 'Työttömät',
      students: 'Opiskelijat',
      population: 'Väestö',
      income: 'Asukkaiden keskimääräiset vuositulot',
      residents: 'Osuus väestöstä',
      count: 'henkilöä',
      rank: 'sija',
      of: '/',
      perYear: 'vuodessa',
      caveat:
        'Työllisten, työttömien ja opiskelijoiden prosentit ovat osuuksia postinumeroalueen koko väestöstä. Lukuja ei ole muunnettu kunnan osa-alueiden tilastoiksi.',
    }
  }
  return {
    employment: 'Employment status',
    employed: 'Employed',
    unemployed: 'Unemployed',
    students: 'Students',
    population: 'Population',
    income: 'Average annual income of inhabitants',
    residents: 'Share of population',
    count: 'people',
    rank: 'rank',
    of: 'of',
    perYear: 'per year',
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
  return postalMetricRank(props.collection, props.postal, metric)
}

function rankText(metric: PostalMetric): string {
  const result = rank(metric)
  if (!result) return ''
  if (language.value === 'fi') {
    return `${labels.value.rank} ${numberFormatter.value.format(result.rank)}/${numberFormatter.value.format(result.total)}`
  }
  return `${labels.value.rank} ${numberFormatter.value.format(result.rank)} ${labels.value.of} ${numberFormatter.value.format(result.total)}`
}

function studentIconFill(index: number): string {
  if (props.postal.studentShare === null) return '0%'
  const remaining = props.postal.studentShare - index * 10
  return `${Math.max(0, Math.min(10, remaining)) * 10}%`
}
</script>

<template>
  <section class="area-stat-summary postal-stat-summary" aria-label="Postal statistics overview">
    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong>{{ labels.employment }}</strong>
        <span>{{ postal.statisticsYear }}</span>
      </div>
      <div class="summary-bar summary-bar--employment" aria-hidden="true">
        <span
          class="summary-bar__segment summary-bar__segment--employed"
          :style="{ width: `${postal.employedShare ?? 0}%` }"
        />
        <span
          class="summary-bar__segment summary-bar__segment--unemployed"
          :style="{ width: `${postal.unemployedShare ?? 0}%` }"
        />
      </div>
      <div class="summary-legend">
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--employed" />
          <a class="summary-analysis-link" :href="metricHref('employed')">{{ labels.employed }}</a>
          <strong>{{ formatPercent(postal.employedShare) }}</strong>
          <a class="summary-rank-link" :href="metricHref('employed')">
            <small>{{ rankText('employed') }}</small>
          </a>
          <small class="postal-metric-count">
            {{ formatNumber(postal.employed) }} {{ labels.count }} · {{ labels.residents }}
          </small>
        </span>
        <span class="summary-legend__item">
          <i class="legend-dot legend-dot--unemployed" />
          <a class="summary-analysis-link" :href="metricHref('unemployed')">{{
            labels.unemployed
          }}</a>
          <strong>{{ formatPercent(postal.unemployedShare) }}</strong>
          <a class="summary-rank-link" :href="metricHref('unemployed')">
            <small>{{ rankText('unemployed') }}</small>
          </a>
          <small class="postal-metric-count">
            {{ formatNumber(postal.unemployed) }} {{ labels.count }} · {{ labels.residents }}
          </small>
        </span>
      </div>
    </div>

    <div class="summary-metric">
      <div class="summary-metric__heading">
        <strong>
          <a class="summary-analysis-link" :href="metricHref('students')">{{ labels.students }}</a>
        </strong>
        <span>
          {{ formatPercent(postal.studentShare) }} ·
          <a class="summary-rank-link" :href="metricHref('students')">{{ rankText('students') }}</a>
          · {{ postal.statisticsYear }}
        </span>
      </div>
      <div
        class="student-pictogram"
        :aria-label="`${labels.students}: ${formatPercent(postal.studentShare)} ${rankText('students')}`"
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
      <small class="postal-metric-count">
        {{ formatNumber(postal.students) }} {{ labels.count }} · {{ labels.residents }}
      </small>
    </div>

    <div class="summary-population">
      <div class="summary-population__heading">
        <strong>
          <a class="summary-analysis-link" :href="metricHref('population')">{{
            labels.population
          }}</a>
        </strong>
        <span>{{ postal.statisticsYear }}</span>
      </div>
      <strong>{{ formatNumber(postal.population) }}</strong>
      <a class="summary-rank-link" :href="metricHref('population')">
        <small>{{ rankText('population') }}</small>
      </a>
    </div>

    <div class="summary-metric income-summary postal-income-summary">
      <div class="summary-metric__heading">
        <a
          class="summary-analysis-link postal-income-summary__heading"
          :href="metricHref('income')"
        >
          {{ labels.income }}
        </a>
        <span>{{ postal.statisticsYear }}</span>
      </div>
      <div class="postal-income-summary__value">
        <strong>{{
          postal.averageIncome === null ? '—' : currencyFormatter.format(postal.averageIncome)
        }}</strong>
        <span>{{ labels.perYear }}</span>
      </div>
      <div class="postal-income-summary__context">
        <a class="summary-rank-link" :href="metricHref('income')">{{ rankText('income') }}</a>
      </div>
    </div>

    <p class="postal-caveat">{{ labels.caveat }}</p>
  </section>
</template>

<style scoped>
.summary-analysis-link,
.summary-rank-link {
  color: inherit;
  text-underline-offset: 0.15rem;
}

.summary-rank-link,
.postal-metric-count,
.postal-income-summary__value span,
.postal-income-summary__context {
  color: #667570;
}

.postal-metric-count {
  font-size: 0.7rem;
  line-height: 1.45;
}

.postal-income-summary__heading {
  font-weight: 800;
}

.postal-income-summary__value {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem 0.65rem;
}

.postal-income-summary__value strong {
  color: var(--deep-green);
  font-size: clamp(1.55rem, 3.6vw, 2.35rem);
  line-height: 1;
}

.postal-income-summary__value span,
.postal-income-summary__context {
  font-size: 0.76rem;
}
</style>
