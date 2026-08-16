<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { ElectionEvent, PartyResult } from '@/domain/elections'
import { localeForLanguage, localizeText, useI18n } from '@/i18n'
import { partyColor } from '@/services/electionStatistics'
import { fetchPartyProfile, type PartyProfile } from '@/services/partyProfiles'

const props = defineProps<{
  events: ElectionEvent[]
  parties: string[]
  partyLabels: Record<string, string>
  metric: 'percent' | 'votes'
  selectedParty: string | null
}>()

const emit = defineEmits<{
  'toggle-party': [party: string]
}>()

const { buildUrl, language, t } = useI18n()
const hoveredParty = ref<string | null>(null)
const profileOpen = ref(false)
const profileLoading = ref(false)
const profile = ref<PartyProfile | null>(null)
const width = 760
const height = 330
const padding = { top: 48, right: 30, bottom: 68, left: 58 }
const numberFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))
const yearFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      useGrouping: false,
    }),
)
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)
const dedicatedPageLabel = computed(() => {
  if (language.value === 'fa') return 'صفحه اختصاصی'
  if (language.value === 'fi') return 'Oma sivu'
  return 'Dedicated page'
})

const hoveredPartyLabel = computed(() =>
  hoveredParty.value ? (props.partyLabels[hoveredParty.value] ?? hoveredParty.value) : '',
)

function resultFor(event: ElectionEvent, party: string): PartyResult | null {
  return event.parties.find((item) => item.party === party) ?? null
}

function valueFor(event: ElectionEvent, party: string): number | null {
  const result = resultFor(event, party)
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
  return Math.max(1, ...values) * 1.12
})

const series = computed(() => {
  const innerHeight = height - padding.top - padding.bottom
  return props.parties.map((party) => {
    const points = props.events.map((event, index) => {
      const result = resultFor(event, party)
      const value = result ? result[props.metric] : null
      return {
        event,
        result,
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
  return `${prefix} ${yearFormatter.value.format(event.year)}`
}

function seriesOpacity(party: string): number {
  if (!props.selectedParty) return 0.9
  return props.selectedParty === party ? 1 : 0.13
}

function seriesWidth(party: string): number {
  return props.selectedParty === party ? 5 : 3
}

function pointLabel(result: PartyResult): string {
  return `${percentFormatter.value.format(result.percent)}% · ${numberFormatter.value.format(result.votes)} ${t('votes')}`
}

function pointLabelY(y: number | null): number {
  if (y === null) return 0
  return y < 70 ? y + 20 : y - 11
}

function toggleParty(party: string): void {
  emit('toggle-party', party)
}

async function toggleProfile(): Promise<void> {
  if (!props.selectedParty) return
  if (profileOpen.value) {
    profileOpen.value = false
    return
  }

  profileOpen.value = true
  profileLoading.value = true
  try {
    profile.value = await fetchPartyProfile(props.selectedParty)
  } catch {
    profile.value = null
  } finally {
    profileLoading.value = false
  }
}

watch(
  () => props.selectedParty,
  () => {
    profileOpen.value = false
    profile.value = null
  },
)
</script>

<template>
  <div class="election-line-chart">
    <div class="election-line-chart__heading">
      <h3>{{ metric === 'percent' ? t('voteShareTrend') : t('voteCountTrend') }}</h3>
      <span v-if="hoveredParty" class="election-chart-hover-label">{{ hoveredPartyLabel }}</span>
    </div>

    <div
      v-if="selectedParty"
      class="election-chart-party-context"
      data-party-selection-control
      @click.stop
    >
      <p class="election-chart-party-links">
        <strong>{{ partyLabels[selectedParty] ?? selectedParty }}:</strong>
        <button
          type="button"
          class="party-info-button"
          :class="{ 'is-active': profileOpen }"
          :aria-label="t('partyInfoAria')"
          :aria-expanded="profileOpen"
          @click="toggleProfile"
        >
          !
        </button>
        <a :href="buildUrl({ party: selectedParty })">{{ dedicatedPageLabel }}</a>
      </p>

      <section v-if="profileOpen" class="party-profile-box" :aria-label="t('partyInfo')">
        <div class="party-profile-box__header">
          <strong>{{ t('partyInfo') }}</strong>
          <span>{{ partyLabels[selectedParty] ?? selectedParty }}</span>
        </div>
        <p class="party-profile-box__basis">{{ t('partyProfileBasis') }}</p>
        <p v-if="profileLoading" class="party-profile-box__status">{{ t('loading') }}</p>
        <ul v-else-if="profile">
          <li v-for="item in profile.items" :key="`${item.topic.fi}-${item.sourceUrl}`">
            <strong>{{ localizeText(item.topic, '', language) }}:</strong>
            {{ localizeText(item.text, '', language) }}
            <a :href="item.sourceUrl" target="_blank" rel="noreferrer">{{ t('source') }}</a>
          </li>
        </ul>
        <p v-else class="party-profile-box__status">{{ t('partyProfileUnavailable') }}</p>
      </section>
    </div>

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

      <g
        v-for="partySeries in series"
        :key="partySeries.party"
        :class="['election-party-series', { 'is-selected': selectedParty === partySeries.party }]"
        :style="{ opacity: seriesOpacity(partySeries.party) }"
      >
        <polyline
          v-for="(segment, index) in partySeries.segments"
          :key="`visible-${index}`"
          :points="segment"
          fill="none"
          :stroke="partyColor(partySeries.party)"
          :stroke-width="seriesWidth(partySeries.party)"
          stroke-linejoin="round"
          stroke-linecap="round"
          class="election-chart-series-line"
        />
        <polyline
          v-for="(segment, index) in partySeries.segments"
          :key="`hit-${index}`"
          :points="segment"
          fill="none"
          stroke="transparent"
          stroke-width="18"
          stroke-linejoin="round"
          stroke-linecap="round"
          class="election-chart-series-hit"
          data-party-selection-control
          @mouseenter="hoveredParty = partySeries.party"
          @mouseleave="hoveredParty = null"
          @click.stop="toggleParty(partySeries.party)"
        />
        <circle
          v-for="point in partySeries.points.filter((item) => item.y !== null)"
          :key="point.event.id"
          :cx="point.x"
          :cy="point.y ?? 0"
          :r="selectedParty === partySeries.party ? 5 : 4"
          :fill="partyColor(partySeries.party)"
          class="election-chart-point"
          data-party-selection-control
          @mouseenter="hoveredParty = partySeries.party"
          @mouseleave="hoveredParty = null"
          @click.stop="toggleParty(partySeries.party)"
        >
          <title>
            {{ partyLabels[partySeries.party] ?? partySeries.party }} · {{ point.value }} ·
            {{ eventShort(point.event) }}
          </title>
        </circle>
        <text
          v-for="point in partySeries.points.filter(
            (item) => item.y !== null && item.result && selectedParty === partySeries.party,
          )"
          :key="`label-${point.event.id}`"
          :x="point.x"
          :y="pointLabelY(point.y)"
          text-anchor="middle"
          class="election-chart-point-detail"
        >
          {{ pointLabel(point.result!) }}
        </text>
      </g>
    </svg>
  </div>
</template>
