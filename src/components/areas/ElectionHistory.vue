<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import ElectionLineChart from '@/components/areas/ElectionLineChart.vue'
import type { AreaLevel } from '@/domain/areas'
import type {
  ElectionEvent,
  ElectionStatisticsDatabase,
  PartyResult,
  ResolvedElectionDataset,
} from '@/domain/elections'
import { useI18n } from '@/i18n'
import {
  chartParties,
  featuredElection,
  fetchAreaElectionStatistics,
  fetchCityElectionStatistics,
  fetchElectionStatisticsDatabase,
  partyColor,
  topParties,
} from '@/services/electionStatistics'

type SortKey = 'party' | 'votes' | 'percent'
type SortDirection = 'asc' | 'desc'

const props = withDefaults(
  defineProps<{
    level?: AreaLevel
    areaName?: string
    city?: boolean
    showTopParties?: boolean
  }>(),
  { level: 'suuralue', areaName: '', city: false, showTopParties: false },
)

const { language, t } = useI18n()
const dataset = ref<ResolvedElectionDataset | null>(null)
const database = ref<ElectionStatisticsDatabase | null>(null)
const loading = ref(true)
const selectedParty = ref<string | null>(null)
const sortKey = ref<SortKey | null>(null)
const sortDirection = ref<SortDirection>('asc')

const visibleParties = computed(() => (dataset.value ? chartParties(dataset.value, 6) : []))
const latestEvent = computed(() => (dataset.value ? featuredElection(dataset.value) : null))
const latestTopParties = computed(() => (latestEvent.value ? topParties(latestEvent.value, 3) : []))
const reversedEvents = computed(() => [...(dataset.value?.events ?? [])].reverse())
const partyLabels = computed<Record<string, string>>(() =>
  Object.fromEntries(visibleParties.value.map((party) => [party, partyName(party)])),
)
const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)
const yearFormatter = computed(
  () =>
    new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI', {
      useGrouping: false,
    }),
)
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)

function localized(value: { fi: string; en: string; fa: string }): string {
  return language.value === 'fa' ? value.fa : value.en
}

function partyName(code: string): string {
  const meta = database.value?.parties[code]
  if (!meta) return code
  return language.value === 'fa' ? meta.fa : meta.en
}

function eventTypeLabel(event: ElectionEvent): string {
  if (event.type === 'municipal') return t('electionTypeMunicipal')
  if (event.type === 'regional') return t('electionTypeRegional')
  if (event.type === 'european') return t('electionTypeEuropean')
  return t('electionTypeParliamentary')
}

function eventLabel(event: ElectionEvent): string {
  return `${eventTypeLabel(event)} ${yearFormatter.value.format(event.year)}`
}

function toggleParty(party: string): void {
  selectedParty.value = selectedParty.value === party ? null : party
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target
  if (target instanceof Element && target.closest('[data-party-selection-control]')) return
  selectedParty.value = null
}

function toggleSort(key: SortKey): void {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

function sortedParties(event: ElectionEvent): PartyResult[] {
  if (!sortKey.value) return event.parties
  const direction = sortDirection.value === 'asc' ? 1 : -1
  const key = sortKey.value
  return [...event.parties].sort((left, right) => {
    if (key === 'party') {
      return partyName(left.party).localeCompare(partyName(right.party), language.value) * direction
    }
    return (left[key] - right[key]) * direction
  })
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return '↕'
  return sortDirection.value === 'asc' ? '↑' : '↓'
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  try {
    const [resolved, db] = await Promise.all([
      props.city
        ? fetchCityElectionStatistics()
        : fetchAreaElectionStatistics(props.level, props.areaName),
      fetchElectionStatisticsDatabase(),
    ])
    dataset.value = resolved
    database.value = db
  } catch {
    dataset.value = null
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <section v-if="dataset" class="election-history" :aria-label="t('electionStatistics')">
    <div class="election-history__header">
      <div>
        <p class="eyebrow">{{ t('politics') }}</p>
        <h2>{{ city ? t('vaasaElectionHistory') : t('electionHistory') }}</h2>
      </div>
      <a :href="dataset.sourceUrl" target="_blank" rel="noreferrer">{{ t('source') }}</a>
    </div>

    <p class="election-history__scope">
      <strong>{{ t('dataScope') }}:</strong> {{ localized(dataset.scope) }}
    </p>
    <p v-if="dataset.note && !city" class="election-scope-note">{{ localized(dataset.note) }}</p>
    <p class="election-history__comparison-note">{{ t('electionComparisonNote') }}</p>

    <section
      v-if="showTopParties && latestEvent && latestTopParties.length"
      class="election-history__top-parties"
    >
      <div class="summary-metric__heading">
        <strong>{{ t('topParties') }}</strong>
        <span>{{ eventLabel(latestEvent) }}</span>
      </div>
      <div class="party-bars">
        <div v-for="party in latestTopParties" :key="party.party" class="party-bar-row">
          <div class="party-bar-row__label">
            <span>{{ party.party }} · {{ partyName(party.party) }}</span>
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
    </section>

    <div class="election-legend" data-party-selection-control>
      <button
        v-for="party in visibleParties"
        :key="party"
        type="button"
        :class="['election-legend__party', { 'is-selected': selectedParty === party }]"
        :aria-pressed="selectedParty === party"
        @click.stop="toggleParty(party)"
      >
        <i :style="{ backgroundColor: partyColor(party) }" />
        <strong>{{ party }}</strong> · {{ partyName(party) }}
      </button>
    </div>

    <ElectionLineChart
      v-if="dataset.events.length > 1"
      :events="dataset.events"
      :parties="visibleParties"
      :party-labels="partyLabels"
      :selected-party="selectedParty"
      metric="percent"
      @toggle-party="toggleParty"
    />
    <ElectionLineChart
      v-if="dataset.events.length > 1"
      :events="dataset.events"
      :parties="visibleParties"
      :party-labels="partyLabels"
      :selected-party="selectedParty"
      metric="votes"
      @toggle-party="toggleParty"
    />

    <details class="election-table-details">
      <summary>{{ t('showElectionTable') }}</summary>
      <div class="election-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('election') }}</th>
              <th>
                <button type="button" class="election-table-sort" @click="toggleSort('party')">
                  {{ t('party') }} <span aria-hidden="true">{{ sortIndicator('party') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="election-table-sort" @click="toggleSort('votes')">
                  {{ t('votes') }} <span aria-hidden="true">{{ sortIndicator('votes') }}</span>
                </button>
              </th>
              <th>
                <button type="button" class="election-table-sort" @click="toggleSort('percent')">
                  {{ t('voteShare') }} <span aria-hidden="true">{{ sortIndicator('percent') }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="event in reversedEvents" :key="event.id">
              <tr
                v-for="(party, partyIndex) in sortedParties(event)"
                :key="`${event.id}-${party.party}`"
              >
                <td>{{ partyIndex === 0 ? eventLabel(event) : '' }}</td>
                <td>
                  <strong>{{ party.party }}</strong> · {{ partyName(party.party) }}
                </td>
                <td>{{ numberFormatter.format(party.votes) }}</td>
                <td>{{ percentFormatter.format(party.percent) }}%</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </details>
  </section>
  <p v-else-if="!loading && city" class="election-history election-history--empty">
    {{ t('electionStatisticsUnavailable') }}
  </p>
</template>
