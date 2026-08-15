<!-- eslint-disable vue/html-closing-bracket-newline, vue/html-indent -->
<script setup lang="ts">
import { computed, ref } from 'vue'

import type { PostalHistoryObservation, PostalMetric } from '@/domain/postal'
import { localeForLanguage, useI18n } from '@/i18n'
import { postalHistoryMetricValue } from '@/services/postalData'

const props = defineProps<{ observations: PostalHistoryObservation[] }>()
const { language } = useI18n()
const metric = ref<PostalMetric>('population')
const width = 760
const height = 285
const padding = { top: 34, right: 40, bottom: 48, left: 66 }

const labels = computed(() => {
  if (language.value === 'fa')
    return {
      title: 'روند تاریخی Paavo',
      population: 'جمعیت',
      employed: 'شاغلان',
      unemployed: 'بیکاران',
      students: 'دانشجویان',
      income: 'درآمد متوسط',
    }
  if (language.value === 'fi')
    return {
      title: 'Paavo-historia',
      population: 'Väestö',
      employed: 'Työlliset',
      unemployed: 'Työttömät',
      students: 'Opiskelijat',
      income: 'Keskitulot',
    }
  return {
    title: 'Paavo history',
    population: 'Population',
    employed: 'Employed',
    unemployed: 'Unemployed',
    students: 'Students',
    income: 'Average income',
  }
})
const options = computed(() => [
  { id: 'population' as const, label: labels.value.population },
  { id: 'employed' as const, label: labels.value.employed },
  { id: 'unemployed' as const, label: labels.value.unemployed },
  { id: 'students' as const, label: labels.value.students },
  { id: 'income' as const, label: labels.value.income },
])
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
const values = computed(() =>
  props.observations.flatMap((observation) => {
    const value = postalHistoryMetricValue(observation, metric.value)
    return value === null ? [] : [{ year: observation.year, value }]
  }),
)
const minValue = computed(() => Math.min(...values.value.map((item) => item.value)))
const maxValue = computed(() => Math.max(...values.value.map((item) => item.value)))
const valuePadding = computed(() =>
  Math.max(metric.value === 'income' ? 500 : 1, (maxValue.value - minValue.value) * 0.12),
)
const yMin = computed(() => Math.max(0, minValue.value - valuePadding.value))
const yMax = computed(() => maxValue.value + valuePadding.value)
const points = computed(() => {
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const count = Math.max(1, values.value.length - 1)
  const range = Math.max(1, yMax.value - yMin.value)
  return values.value.map((item, index) => ({
    ...item,
    x: padding.left + (innerWidth * index) / count,
    y: padding.top + innerHeight - ((item.value - yMin.value) / range) * innerHeight,
  }))
})
const polylinePoints = computed(() =>
  points.value.map((point) => `${point.x},${point.y}`).join(' '),
)

function formatValue(value: number): string {
  if (metric.value === 'income') return currencyFormatter.value.format(value)
  if (metric.value === 'population') return numberFormatter.value.format(value)
  return `${percentFormatter.value.format(value)}%`
}
</script>

<template>
  <section class="postal-history">
    <div class="postal-history__heading">
      <div>
        <h2>{{ labels.title }}</h2>
        <span v-if="observations.length"
          >{{ observations[0]?.year }}–{{ observations.at(-1)?.year }}</span
        >
      </div>
      <div class="postal-history__metrics">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          :class="{ 'is-active': metric === option.id }"
          @click="metric = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div v-if="points.length > 1" class="postal-history__chart-wrap">
      <svg
        class="postal-history__chart"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        :aria-label="`${labels.title}: ${options.find((option) => option.id === metric)?.label}`"
      >
        <line
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="height - padding.bottom"
          :y2="height - padding.bottom"
          class="postal-history__axis"
        />
        <polyline :points="polylinePoints" class="postal-history__line" />
        <g v-for="point in points" :key="point.year">
          <circle :cx="point.x" :cy="point.y" r="5" class="postal-history__point" />
          <text :x="point.x" :y="point.y - 12" text-anchor="middle" class="postal-history__value">
            {{ formatValue(point.value) }}
          </text>
          <text
            :x="point.x"
            :y="height - padding.bottom + 27"
            text-anchor="middle"
            class="postal-history__year"
          >
            {{ point.year }}
          </text>
        </g>
      </svg>
    </div>
  </section>
</template>

<style scoped>
.postal-history {
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 0.8rem;
  background: var(--paper);
  box-shadow: var(--shadow);
}
.postal-history__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.postal-history__heading h2 {
  margin: 0;
}
.postal-history__heading span {
  font-size: 0.82rem;
  color: var(--muted);
}
.postal-history__metrics {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.postal-history__metrics button {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.4rem 0.65rem;
  background: #fffdf8;
  cursor: pointer;
}
.postal-history__metrics button.is-active {
  background: #dfeee9;
  border-color: var(--green);
  color: #0c514b;
}
.postal-history__chart-wrap {
  margin-top: 1rem;
  overflow-x: auto;
}
.postal-history__chart {
  width: 100%;
  min-width: 680px;
}
.postal-history__axis {
  stroke: #9da6a2;
  stroke-width: 1;
}
.postal-history__line {
  fill: none;
  stroke: var(--green);
  stroke-width: 3;
}
.postal-history__point {
  fill: var(--paper);
  stroke: var(--green);
  stroke-width: 3;
}
.postal-history__value,
.postal-history__year {
  font-size: 11px;
  fill: currentColor;
}
</style>
