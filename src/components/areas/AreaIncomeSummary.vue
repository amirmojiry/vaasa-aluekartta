<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { AreaLevel } from '@/domain/areas'
import type { AreaIncomeRecord } from '@/domain/income'
import { localeForLanguage, useI18n } from '@/i18n'
import { fetchAreaIncome, fetchAreaIncomeDatabase, incomeDifferencePercent } from '@/services/areaIncome'

const props = defineProps<{
  level: AreaLevel
  areaName: string
}>()

const { language, t } = useI18n()
const income = ref<AreaIncomeRecord | null>(null)
const sourceUrl = ref<string | null>(null)
const loaded = ref(false)

const labels = {
  en: {
    title: 'Average taxable income',
    basis: 'Residents aged 15+',
    perYear: 'per year',
    cityAverage: 'Vaasa average',
    above: 'above Vaasa average',
    below: 'below Vaasa average',
    same: 'same as Vaasa average',
    rank: 'rank',
    of: 'of',
    source: 'Source',
    unavailable: 'No usable income value is reported for this area.',
  },
  fi: {
    title: 'Keskimääräiset veronalaiset tulot',
    basis: '15 vuotta täyttäneet',
    perYear: 'vuodessa',
    cityAverage: 'Vaasan keskiarvo',
    above: 'Vaasan keskiarvon yläpuolella',
    below: 'Vaasan keskiarvon alapuolella',
    same: 'sama kuin Vaasan keskiarvo',
    rank: 'sija',
    of: '/',
    source: 'Lähde',
    unavailable: 'Tälle alueelle ei ole käyttökelpoista tulotietoa.',
  },
  fa: {
    title: 'میانگین درآمد مشمول مالیات',
    basis: 'افراد ۱۵ سال به بالا',
    perYear: 'در سال',
    cityAverage: 'میانگین واسا',
    above: 'بالاتر از میانگین واسا',
    below: 'پایین‌تر از میانگین واسا',
    same: 'برابر با میانگین واسا',
    rank: 'رتبه',
    of: 'از',
    source: 'منبع',
    unavailable: 'برای این منطقه مقدار درآمد قابل استفاده‌ای گزارش نشده است.',
  },
} as const

const text = computed(() => labels[language.value])
const currencyFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }),
)
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)
const integerFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))

const comparison = computed(() => {
  if (!income.value) return null
  return incomeDifferencePercent(income.value.value, income.value.cityAverage)
})

const comparisonText = computed(() => {
  if (comparison.value === null || !income.value) return ''
  if (Math.abs(comparison.value) < 0.05) return text.value.same
  const percentage = `${percentFormatter.value.format(Math.abs(comparison.value))}%`
  return `${percentage} ${comparison.value > 0 ? text.value.above : text.value.below}`
})

const rankText = computed(() => {
  if (!income.value) return ''
  const group = props.level === 'suuralue' ? t('majorAreas') : t('minorAreas')
  if (language.value === 'fi') {
    return `${text.value.rank} ${integerFormatter.value.format(income.value.rank)}/${integerFormatter.value.format(income.value.rankTotal)} · ${group.toLowerCase()}`
  }
  return `${text.value.rank} ${integerFormatter.value.format(income.value.rank)} ${text.value.of} ${integerFormatter.value.format(income.value.rankTotal)} · ${group}`
})

onMounted(async () => {
  try {
    const [record, database] = await Promise.all([
      fetchAreaIncome(props.level, props.areaName),
      fetchAreaIncomeDatabase(),
    ])
    income.value = record
    sourceUrl.value = database.source.pdfUrl
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <div v-if="income" class="summary-metric income-summary">
    <div class="summary-metric__heading">
      <strong>{{ text.title }}</strong>
      <span>{{ text.basis }} · {{ income.year }}</span>
    </div>

    <div class="income-summary__value">
      <strong>{{ currencyFormatter.format(income.value) }}</strong>
      <span>{{ text.perYear }}</span>
    </div>

    <div class="income-summary__context">
      <span>{{ rankText }}</span>
      <span>{{ comparisonText }}</span>
      <span>{{ text.cityAverage }}: {{ currencyFormatter.format(income.cityAverage) }}</span>
    </div>

    <a
      v-if="sourceUrl"
      class="income-summary__source"
      :href="sourceUrl"
      target="_blank"
      rel="noreferrer"
    >
      {{ text.source }}: Statistics Finland 2014b · Sanna Komsi (2016), Appendix 8
    </a>
  </div>

  <div v-else-if="loaded" class="summary-metric income-summary income-summary--empty">
    <div class="summary-metric__heading">
      <strong>{{ text.title }}</strong>
      <span>2014</span>
    </div>
    <span>{{ text.unavailable }}</span>
    <a
      v-if="sourceUrl"
      class="income-summary__source"
      :href="sourceUrl"
      target="_blank"
      rel="noreferrer"
    >
      {{ text.source }}: Statistics Finland 2014b · Sanna Komsi (2016), Appendix 8
    </a>
  </div>
</template>

<style scoped>
.income-summary__value {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem 0.65rem;
}

.income-summary__value strong {
  color: var(--deep-green);
  font-size: clamp(1.55rem, 3.6vw, 2.35rem);
  line-height: 1;
}

.income-summary__value span,
.income-summary__context,
.income-summary--empty > span {
  color: #65736f;
  font-size: 0.76rem;
}

.income-summary__context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.8rem;
  line-height: 1.5;
}

.income-summary__source {
  width: fit-content;
  color: var(--green);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.45;
  text-underline-offset: 0.16rem;
}
</style>
