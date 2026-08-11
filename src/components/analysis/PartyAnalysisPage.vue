<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import ThematicMap from '@/components/analysis/ThematicMap.vue'
import type { AreaLevel } from '@/domain/areas'
import type { ElectionStatisticsDatabase, ElectionType } from '@/domain/elections'
import { localeForLanguage, useI18n } from '@/i18n'
import {
  fetchElectionStatisticsDatabase,
  partyColor,
  partyWikipediaLinks,
} from '@/services/electionStatistics'

const props = defineProps<{ partyCode: string }>()
const { buildUrl, language, t } = useI18n()
const requestedLevel = new URLSearchParams(window.location.search).get('level')
const level = ref<AreaLevel>(requestedLevel === 'pienalue' ? 'pienalue' : 'suuralue')
const database = ref<ElectionStatisticsDatabase | null>(null)
const selectedEventId = ref('')
const loading = ref(true)
const failed = ref(false)

const labels = {
  en: {
    title: 'Party support by area',
    intro: 'Darker areas indicate a higher vote share for the selected party in the selected election.',
    election: 'Election',
    barChart: 'Party support across areas',
    table: 'Show detailed area table',
    rank: 'Rank',
    area: 'Area',
    votes: 'Votes',
    share: 'Vote share',
    coverage: 'Coverage',
    source: 'Source',
    noData: 'No source-backed political data is available for this party at this area level and election.',
    back: 'Back to Vaasa map',
    dedicated: 'Dedicated page',
  },
  fi: {
    title: 'Puolueen kannatus alueittain',
    intro: 'Tummempi alue tarkoittaa suurempaa ääniosuutta valitulle puolueelle valituissa vaaleissa.',
    election: 'Vaalit',
    barChart: 'Puolueen kannatus alueittain',
    table: 'Näytä tarkka aluetaulukko',
    rank: 'Sija',
    area: 'Alue',
    votes: 'Äänet',
    share: 'Ääniosuus',
    coverage: 'Kattavuus',
    source: 'Lähde',
    noData: 'Tälle puolueelle ei ole lähteeseen perustuvia poliittisia tietoja tällä aluetasolla ja vaalilla.',
    back: 'Takaisin Vaasan kartalle',
    dedicated: 'Oma sivu',
  },
  fa: {
    title: 'آرای حزب در مناطق',
    intro: 'هرچه رنگ منطقه پررنگ‌تر باشد، سهم رأی این حزب در انتخابات انتخاب‌شده بیشتر بوده است.',
    election: 'انتخابات',
    barChart: 'مقایسه آرای حزب در مناطق',
    table: 'نمایش جدول جزئیات مناطق',
    rank: 'رتبه',
    area: 'منطقه',
    votes: 'تعداد رأی',
    share: 'سهم رأی',
    coverage: 'دامنه داده',
    source: 'منبع',
    noData: 'برای این حزب در این سطح منطقه و انتخابات، داده سیاسی مستند موجود نیست.',
    back: 'بازگشت به نقشه واسا',
    dedicated: 'صفحه اختصاصی',
  },
} as const

interface EventOption {
  id: string
  year: number
  type: ElectionType
  count: number
}

interface AreaPartyResult {
  name: string
  votes: number
  percent: number
  coverage: string
  sourceUrl: string
}

const text = computed(() => labels[language.value])
const party = computed(() => database.value?.parties[props.partyCode] ?? null)
const partyName = computed(() => {
  const meta = party.value
  if (!meta) return props.partyCode
  if (language.value === 'fa') return meta.fa || meta.en || meta.fi
  if (language.value === 'fi') return meta.fi || meta.en || meta.fa
  return meta.en || meta.fi || meta.fa
})
const wikipedia = computed(() => partyWikipediaLinks(props.partyCode))
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(localeForLanguage(language.value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)
const numberFormatter = computed(() => new Intl.NumberFormat(localeForLanguage(language.value)))
const yearFormatter = computed(
  () => new Intl.NumberFormat(localeForLanguage(language.value), { useGrouping: false }),
)

function eventPriority(type: ElectionType): number {
  if (type === 'municipal') return 4
  if (type === 'regional') return 3
  if (type === 'parliamentary') return 2
  return 1
}

const eventOptions = computed<EventOption[]>(() => {
  if (!database.value) return []
  const prefix = `${level.value}:`
  const options = new Map<string, EventOption>()
  for (const [key, dataset] of Object.entries(database.value.areas)) {
    if (!key.startsWith(prefix)) continue
    for (const event of dataset.events) {
      if (!event.parties.some(([code]) => code === props.partyCode)) continue
      const current = options.get(event.id)
      if (current) current.count += 1
      else options.set(event.id, { id: event.id, year: event.year, type: event.type, count: 1 })
    }
  }
  return [...options.values()].sort(
    (left, right) =>
      right.year - left.year ||
      eventPriority(right.type) - eventPriority(left.type) ||
      right.count - left.count,
  )
})

function eventTypeLabel(type: ElectionType): string {
  if (type === 'municipal') return t('electionTypeMunicipal')
  if (type === 'regional') return t('electionTypeRegional')
  if (type === 'european') return t('electionTypeEuropean')
  return t('electionTypeParliamentary')
}

function eventLabel(option: EventOption): string {
  return `${eventTypeLabel(option.type)} ${yearFormatter.value.format(option.year)} · ${numberFormatter.value.format(option.count)} ${t('areas')}`
}

const results = computed<AreaPartyResult[]>(() => {
  if (!database.value || !selectedEventId.value) return []
  const prefix = `${level.value}:`
  return Object.entries(database.value.areas)
    .filter(([key]) => key.startsWith(prefix))
    .flatMap(([key, dataset]) => {
      const event = dataset.events.find((item) => item.id === selectedEventId.value)
      const result = event?.parties.find(([code]) => code === props.partyCode)
      if (!result) return []
      return [{
        name: key.slice(prefix.length),
        votes: result[1],
        percent: result[2],
        coverage: dataset.coverage,
        sourceUrl: dataset.sourceUrl,
      }]
    })
    .sort((left, right) => right.percent - left.percent || right.votes - left.votes)
})

const maxPercent = computed(() => Math.max(1, ...results.value.map((item) => item.percent)))
const mapItems = computed(() => results.value.map((item) => ({ name: item.name, value: item.percent })))

function formatPercent(value: number): string {
  return `${percentFormatter.value.format(value)}%`
}

function setLevel(next: AreaLevel): void {
  level.value = next
  const search = new URLSearchParams(window.location.search)
  search.set('level', next)
  window.history.replaceState(null, '', `${window.location.pathname}?${search.toString()}`)
}

function ensureSelectedEvent(): void {
  if (eventOptions.value.some((option) => option.id === selectedEventId.value)) return
  selectedEventId.value = eventOptions.value[0]?.id ?? ''
}

onMounted(async () => {
  try {
    database.value = await fetchElectionStatisticsDatabase()
    ensureSelectedEvent()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

watch([level, () => props.partyCode, eventOptions], ensureSelectedEvent)
</script>

<template>
  <main class="party-page">
    <header class="party-page__hero">
      <nav class="topbar" :aria-label="t('primaryNavigation')">
        <a class="brand" :href="buildUrl()">
          <span class="brand__mark" aria-hidden="true">VA</span>
          <span>{{ t('appName') }}</span>
        </a>
        <LanguageSwitcher />
      </nav>
      <div class="party-page__intro">
        <a class="party-page__back" :href="buildUrl()">← {{ text.back }}</a>
        <p>{{ props.partyCode }}</p>
        <h1>{{ partyName }}</h1>
        <p>{{ text.title }}. {{ text.intro }}</p>
        <div class="party-page__links">
          <a v-if="wikipedia.fa" :href="wikipedia.fa" target="_blank" rel="noreferrer">{{ t('persianWikipedia') }}</a>
          <a v-if="wikipedia.fi" :href="wikipedia.fi" target="_blank" rel="noreferrer">{{ t('finnishWikipedia') }}</a>
        </div>
      </div>
    </header>

    <section class="party-page__content">
      <div class="party-controls">
        <div class="analysis-level-toggle" :aria-label="t('boundaryLevel')">
          <button type="button" :class="{ 'is-active': level === 'suuralue' }" :aria-pressed="level === 'suuralue'" @click="setLevel('suuralue')">{{ t('majorAreas') }}</button>
          <button type="button" :class="{ 'is-active': level === 'pienalue' }" :aria-pressed="level === 'pienalue'" @click="setLevel('pienalue')">{{ t('minorAreas') }}</button>
        </div>
        <label v-if="eventOptions.length" class="party-event-select">
          <span>{{ text.election }}</span>
          <select v-model="selectedEventId">
            <option v-for="option in eventOptions" :key="option.id" :value="option.id">{{ eventLabel(option) }}</option>
          </select>
        </label>
      </div>

      <p v-if="loading" class="party-state">{{ t('loading') }}</p>
      <p v-else-if="failed || !party" class="party-state">{{ t('electionStatisticsUnavailable') }}</p>

      <template v-else>
        <ThematicMap :level="level" :items="mapItems" :color="partyColor(partyCode)" :format-value="formatPercent" />
        <p v-if="results.length === 0" class="party-state">{{ text.noData }}</p>

        <section v-else class="party-card">
          <h2>{{ text.barChart }}</h2>
          <div class="party-bars-analysis">
            <div v-for="(item, index) in results" :key="item.name" class="party-analysis-row">
              <div class="party-analysis-row__label">
                <span><strong>{{ numberFormatter.format(index + 1) }}.</strong> {{ item.name }}</span>
                <strong>{{ formatPercent(item.percent) }} · {{ numberFormatter.format(item.votes) }} {{ t('votes') }}</strong>
              </div>
              <div class="party-analysis-row__track" aria-hidden="true">
                <span :style="{ width: `${(item.percent / maxPercent) * 100}%`, backgroundColor: partyColor(partyCode) }" />
              </div>
            </div>
          </div>
        </section>

        <details v-if="results.length" class="party-card party-details">
          <summary>{{ text.table }}</summary>
          <div class="party-table-wrap">
            <table>
              <thead>
                <tr><th>{{ text.rank }}</th><th>{{ text.area }}</th><th>{{ text.share }}</th><th>{{ text.votes }}</th><th>{{ text.coverage }}</th><th>{{ text.source }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in results" :key="`table-${item.name}`">
                  <td>{{ numberFormatter.format(index + 1) }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ formatPercent(item.percent) }}</td>
                  <td>{{ numberFormatter.format(item.votes) }}</td>
                  <td>{{ item.coverage }}</td>
                  <td><a :href="item.sourceUrl" target="_blank" rel="noreferrer">{{ text.source }}</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </template>
    </section>
  </main>
</template>

<style scoped>
.party-page { min-height: 100vh; background: #f3f0e8; color: var(--ink); }
.party-page__hero { padding-bottom: 2rem; background: var(--deep-green); color: #fff; }
.party-page__intro { width: min(1100px, calc(100% - 2rem)); margin: 2rem auto 0; }
.party-page__intro > p:first-of-type { margin: .5rem 0 0; color: #f2c66d; font-weight: 850; letter-spacing: .08em; }
.party-page__intro h1 { margin: .15rem 0 .55rem; font-size: clamp(2rem, 5vw, 3.6rem); }
.party-page__intro > p:last-of-type { max-width: 50rem; color: rgba(255,255,255,.8); }
.party-page__back, .party-page__links a { color: rgba(255,255,255,.88); font-weight: 750; }
.party-page__links { display: flex; flex-wrap: wrap; gap: .8rem; }
.party-page__content { display: grid; gap: 1.25rem; width: min(1100px, calc(100% - 2rem)); margin: 0 auto; padding: 1.5rem 0 3rem; }
.party-controls { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 1rem; }
.analysis-level-toggle { display: flex; flex-wrap: wrap; gap: .5rem; }
.analysis-level-toggle button { padding: .55rem .9rem; border: 1px solid var(--line); border-radius: 999px; background: #fffdf8; color: var(--ink); font-weight: 750; cursor: pointer; }
.analysis-level-toggle button.is-active { border-color: var(--green); background: #dfeee9; color: #0c514b; }
.party-event-select { display: grid; gap: .3rem; min-width: min(100%, 22rem); color: #586763; font-size: .78rem; font-weight: 750; }
.party-event-select select { padding: .55rem .7rem; border: 1px solid var(--line); border-radius: .5rem; background: #fffdf8; color: var(--ink); }
.party-state, .party-card { margin: 0; padding: 1rem 1.1rem; border: 1px solid var(--line); border-radius: .7rem; background: var(--paper); box-shadow: var(--shadow); }
.party-card h2 { margin: 0 0 1rem; font-size: 1.15rem; }
.party-bars-analysis { display: grid; gap: .7rem; }
.party-analysis-row { display: grid; gap: .3rem; }
.party-analysis-row__label { display: flex; justify-content: space-between; gap: 1rem; font-size: .82rem; }
.party-analysis-row__track { height: .55rem; overflow: hidden; border-radius: 999px; background: #e3e8e5; }
.party-analysis-row__track span { display: block; min-width: 2px; height: 100%; border-radius: inherit; }
.party-details summary { color: var(--green); font-weight: 800; cursor: pointer; }
.party-table-wrap { margin-top: 1rem; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: .8rem; }
th, td { padding: .55rem .65rem; border-bottom: 1px solid var(--line); text-align: start; white-space: nowrap; }
td a { color: var(--green); font-weight: 750; }
@media (max-width: 650px) { .party-analysis-row__label { align-items: flex-start; flex-direction: column; gap: .15rem; } }
</style>
