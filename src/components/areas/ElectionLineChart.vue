<script setup lang="ts">
import { computed } from 'vue'

import type { ElectionEvent } from '@/domain/elections'
import { useI18n } from '@/i18n'
import { partyColor } from '@/services/electionStatistics'

const props = defineProps<{
  events: ElectionEvent[]
  parties: string[]
  metric: 'percent' | 'votes'
}>()

const { language, t } = useI18n()
const width = 760
const height = 300
const padding = { top: 28, right: 30, bottom: 68, left: 58 }
const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)

function valueFor(event: ElectionEvent, party: string): number | null {
  const result = event.parties.find((item) => item.party === party)
  return result ? result[props.metric] : null
}

function eventX(index: number): number {
  const innerWidth = width - padding.left - padding.right
  return padding.left + (innerWidth * index) / Math.max(1, props.events.length - 1)
}

const maxValue = computed(() => {
  const values = props.events.flatMap((event) =>
    props.parties
      .map((party) => valueFor(event, party))
      .filter((value): value is number => value !== null),
  )
  return Math.max(1, ...values) * 1.08
})

const series = computed(() => {
  const innerHeight = height - padding.top - padding.bottom
  return props.parties.map((party) => {
    const points = props.events.map((event, index) => {
      const value = valueFor(event, party)
      return {
        event,
        value,
        x: eventX(index),
        y:
          value === null
            ? null
            : padding.top + innerHeight - (value / maxValue.value) * innerHeight,
      }
    })
    const segments: string[] = []
    let current: string[] = []
    for (const point of points) {
      if (point.y === null) {
        if (current.length > 1) segments.push(current.join(' '))
        current = []
      } else {
        current.push(`${point.x},${point.y}`)
      }
    }
    if (current.length > 1) segments.push(current.join(' '))
    return { party, points, segments }
  })
})

function eventShort(event: ElectionEvent): string {
  const prefix =
    event.type === 'municipal'
      ? t('electionShortMunicipal')
      : event.type === 'regional'
        ? t('electionShortRegional')
        : event.type === 'european'
          ? t('electionShortEuropean')
          : t('electionShortParliamentary')
  return `${prefix} ${numberFormatter.value.format(event.year)}`
}
</script>

<template>
  <div class="election-line-chart">
    <h3>{{ metric === 'percent' ? t('voteShareTrend') : t('voteCountTrend') }}</h3>
    <svg :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="t('electionChartAria')">
      <line
        :x1="padding.left"
        :x2="width - padding.right"
        :y1="height - padding.bottom"
        :y2="height - padding.bottom"
        class="election-chart-axis"
      />
      <g v-for="(event, index) in events" :key="event.id">
        <line
          :x1="eventX(index)"
          :x2="eventX(index)"
          :y1="padding.top"
          :y2="height - padding.bottom"
          class="election-chart-guide"
        />
        <text
          :x="eventX(index)"
          :y="height - padding.bottom + 24"
          text-anchor="middle"
          class="election-chart-label"
        >
          {{ eventShort(event) }}
        </text>
      </g>
      <g v-for="partySeries in series" :key="partySeries.party">
        <polyline
          v-for="(segment, index) in partySeries.segments"
          :key="index"
          :points="segment"
          fill="none"
          :stroke="partyColor(partySeries.party)"
          stroke-width="3"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="point in partySeries.points.filter((item) => item.y !== null)"
          :key="point.event.id"
          :cx="point.x"
          :cy="point.y ?? 0"
          r="4"
          :fill="partyColor(partySeries.party)"
        >
          <title>{{ partySeries.party }} · {{ point.value }} · {{ eventShort(point.event) }}</title>
        </circle>
      </g>
    </svg>
  </div>
</template>
