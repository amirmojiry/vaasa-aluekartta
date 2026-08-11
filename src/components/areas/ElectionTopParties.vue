<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { AreaLevel } from '@/domain/areas'
import type {
  ElectionStatisticsDatabase,
  ResolvedElectionDataset,
} from '@/domain/elections'
import { useI18n } from '@/i18n'
import {
  featuredElection,
  fetchAreaElectionStatistics,
  fetchElectionStatisticsDatabase,
  partyColor,
  topParties,
} from '@/services/electionStatistics'

const props = defineProps<{ level: AreaLevel; areaName: string }>()
const { language, t } = useI18n()
const dataset = ref<ResolvedElectionDataset | null>(null)
const database = ref<ElectionStatisticsDatabase | null>(null)

const event = computed(() => (dataset.value ? featuredElection(dataset.value) : null))
const parties = computed(() => (event.value ? topParties(event.value, 3) : []))
const numberFormatter = computed(
  () => new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI'),
)
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(language.value === 'fa' ? 'fa-IR' : 'en-FI', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)

function partyName(code: string): string {
  const meta = database.value?.parties[code]
  if (!meta) return code
  return language.value === 'fa' ? meta.fa : meta.en
}

function eventLabel(): string {
  if (!event.value) return ''
  const type =
    event.value.type === 'municipal'
      ? t('electionTypeMunicipal')
      : event.value.type === 'regional'
        ? t('electionTypeRegional')
        : event.value.type === 'european'
          ? t('electionTypeEuropean')
          : t('electionTypeParliamentary')
  return `${type} ${numberFormatter.value.format(event.value.year)}`
}

onMounted(async () => {
  try {
    const [resolved, db] = await Promise.all([
      fetchAreaElectionStatistics(props.level, props.areaName),
      fetchElectionStatisticsDatabase(),
    ])
    dataset.value = resolved
    database.value = db
  } catch {
    dataset.value = null
  }
})
</script>

<template>
  <div v-if="dataset && event && parties.length" class="election-top-parties">
    <div class="summary-metric__heading">
      <strong>{{ t('topParties') }}</strong>
      <span>{{ eventLabel() }}</span>
    </div>
    <p v-if="dataset.coverage !== 'exact'" class="election-scope-note">
      {{ language === 'fa' ? dataset.note?.fa : dataset.note?.en }}
    </p>
    <div class="party-bars">
      <div v-for="party in parties" :key="party.party" class="party-bar-row">
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
  </div>
</template>
