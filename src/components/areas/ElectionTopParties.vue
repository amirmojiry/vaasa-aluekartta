<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { AreaLevel } from '@/domain/areas'
import type { ElectionStatisticsDatabase, ResolvedElectionDataset } from '@/domain/elections'
import { localeForLanguage, useI18n } from '@/i18n'
import {
  featuredElection,
  fetchAreaElectionStatistics,
  fetchElectionStatisticsDatabase,
  partyColor,
  topParties,
} from '@/services/electionStatistics'

const props = defineProps<{ level: AreaLevel; areaName: string }>()
const { buildUrl, language, t } = useI18n()
const dataset = ref<ResolvedElectionDataset | null>(null)
const database = ref<ElectionStatisticsDatabase | null>(null)

const event = computed(() => (dataset.value ? featuredElection(dataset.value) : null))
const parties = computed(() => (event.value ? topParties(event.value, 3) : []))
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

function partyName(code: string): string {
  const meta = database.value?.parties[code]
  if (!meta) return code
  if (language.value === 'fa') return meta.fa || meta.en || meta.fi
  if (language.value === 'fi') return meta.fi || meta.en || meta.fa
  return meta.en || meta.fi || meta.fa
}

function localizedNote(): string {
  if (!dataset.value?.note) return ''
  if (language.value === 'fa') return dataset.value.note.fa || dataset.value.note.en
  if (language.value === 'fi') return dataset.value.note.fi || dataset.value.note.en
  return dataset.value.note.en || dataset.value.note.fi
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
  return `${type} ${yearFormatter.value.format(event.value.year)}`
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
      {{ localizedNote() }}
    </p>
    <div class="party-bars">
      <div v-for="party in parties" :key="party.party" class="party-bar-row">
        <div class="party-bar-row__label">
          <a class="party-analysis-link" :href="buildUrl({ party: party.party })">
            {{ party.party }} · {{ partyName(party.party) }}
          </a>
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

<style scoped>
.party-analysis-link {
  color: inherit;
  font-weight: 750;
  text-underline-offset: 0.16rem;
}
</style>
