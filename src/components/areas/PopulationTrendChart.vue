<script setup lang="ts">
import { computed } from 'vue'

import type { PopulationObservation } from '@/domain/populationHistory'
import { useI18n } from '@/i18n'

const props = defineProps<{
  observations: PopulationObservation[]
}>()

const { language, t } = useI18n()
const width = 720
const height = 250
const padding = { top: 28, right: 38, bottom: 48, left: 58 }

const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)

const minPopulation = computed(() => Math.min(...props.observations.map((item) => item.population)))
const maxPopulation = computed(() => Math.max(...props.observations.map((item) => item.population)))
const populationPadding = computed(() => Math.max(100, (maxPopulation.value - minPopulation.value) * 0.12))
const yMin = computed(() => Math.max(0, minPopulation.value - populationPadding.value))
const yMax = computed(() => maxPopulation.value + populationPadding.value)

const points = computed(() => {
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const count = Math.max(1, props.observations.length - 1)
  const range = Math.max(1, yMax.value - yMin.value)

  return props.observations.map((item, index) => ({
    ...item,
    x: padding.left + (innerWidth * index) / count,
    y: padding.top + innerHeight - ((item.population - yMin.value) / range) * innerHeight,
  }))
})

const polylinePoints = computed(() => points.value.map((point) => `${point.x},${point.y}`).join(' '))

function formatNumber(value: number): string {
  return numberFormatter.value.format(value)
}
</script>

<template>
  <section class="population-trend" :aria-label="t('populationHistory')">
    <div class="population-trend__heading">
      <h3>{{ t('populationHistory') }}</h3>
      <span v-if="observations.length > 0">
        {{ observations[0]?.year }}–{{ observations.at(-1)?.year }}
      </span>
    </div>

    <div class="population-trend__chart-wrap">
      <svg
        class="population-trend__chart"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        :aria-label="t('populationHistoryChartAria')"
      >
        <line
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="height - padding.bottom"
          :y2="height - padding.bottom"
          class="population-trend__axis"
        />
        <polyline :points="polylinePoints" class="population-trend__line" />

        <g v-for="point in points" :key="point.year">
          <line
            :x1="point.x"
            :x2="point.x"
            :y1="point.y"
            :y2="height - padding.bottom"
            class="population-trend__guide"
          />
          <circle :cx="point.x" :cy="point.y" r="6" class="population-trend__point" />
          <text
            :x="point.x"
            :y="point.y - 13"
            text-anchor="middle"
            class="population-trend__value"
          >
            {{ formatNumber(point.population) }}
          </text>
          <text
            :x="point.x"
            :y="height - padding.bottom + 28"
            text-anchor="middle"
            class="population-trend__year"
          >
            {{ point.year }}
          </text>
        </g>
      </svg>
    </div>
  </section>
</template>
