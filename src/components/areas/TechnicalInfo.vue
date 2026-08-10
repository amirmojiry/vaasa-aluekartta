<script setup lang="ts">
import { computed } from 'vue'

import type { ExternalIdentifier, LocalizedText, WikipediaLinks } from '@/domain/areas'
import { localizeText, useI18n } from '@/i18n'

const props = defineProps<{
  relationId: number
  reference: string
  adminLevel: number
  levelLabel: string
  outerWayCount: number | string
  source: string
  wikidataId?: string | null
  wikidataDescription?: LocalizedText
  wikipedia: WikipediaLinks
  externalIdentifiers: ExternalIdentifier[]
  childCount?: number
}>()

const { language, t } = useI18n()

const description = computed(() => localizeText(props.wikidataDescription, '', language.value))

const identifiers = computed(() =>
  props.externalIdentifiers.filter(
    (identifier) =>
      !(identifier.propertyId === 'P402' && identifier.value === String(props.relationId)),
  ),
)

function identifierLabel(identifier: ExternalIdentifier): string {
  return localizeText(identifier.labels, identifier.propertyId, language.value)
}
</script>

<template>
  <section class="technical-panel" :aria-labelledby="`technical-${relationId}`">
    <h2 :id="`technical-${relationId}`">{{ t('technicalInfo') }}</h2>

    <div v-if="description" class="technical-description">
      <strong>{{ t('wikidataDescription') }}</strong>
      <p>{{ description }}</p>
    </div>

    <dl class="technical-list">
      <div>
        <dt>{{ t('reference') }}</dt>
        <dd>{{ reference || t('notTagged') }}</dd>
      </div>
      <div>
        <dt>{{ t('adminLevel') }}</dt>
        <dd>{{ adminLevel }} · {{ levelLabel }}</dd>
      </div>
      <div>
        <dt>{{ t('osmRelation') }}</dt>
        <dd>
          <a
            :href="`https://www.openstreetmap.org/relation/${relationId}`"
            target="_blank"
            rel="noreferrer"
          >
            {{ relationId }}
          </a>
        </dd>
      </div>
      <div>
        <dt>{{ t('outerWays') }}</dt>
        <dd>{{ outerWayCount }}</dd>
      </div>
      <div v-if="childCount !== undefined">
        <dt>{{ t('minorRelations') }}</dt>
        <dd>{{ childCount }}</dd>
      </div>
      <div>
        <dt>{{ t('source') }}</dt>
        <dd>{{ source }}</dd>
      </div>
      <div v-if="wikidataId">
        <dt>{{ t('wikidata') }}</dt>
        <dd>
          <a :href="`https://www.wikidata.org/wiki/${wikidataId}`" target="_blank" rel="noreferrer">
            {{ wikidataId }}
          </a>
        </dd>
      </div>
      <div>
        <dt>{{ t('wikipedia') }}</dt>
        <dd class="external-link-list">
          <a v-if="wikipedia.fi" :href="wikipedia.fi" target="_blank" rel="noreferrer">
            {{ t('finnishWikipedia') }}
          </a>
          <a v-if="wikipedia.fa" :href="wikipedia.fa" target="_blank" rel="noreferrer">
            {{ t('persianWikipedia') }}
          </a>
          <span v-if="!wikipedia.fi && !wikipedia.fa">{{ t('noWikipedia') }}</span>
        </dd>
      </div>
    </dl>

    <details v-if="identifiers.length > 0" class="identifier-details">
      <summary>{{ t('externalIdentifiers') }} ({{ identifiers.length }})</summary>
      <ul>
        <li v-for="identifier in identifiers" :key="`${identifier.propertyId}-${identifier.value}`">
          <a
            class="identifier-property"
            :href="`https://www.wikidata.org/wiki/Property:${identifier.propertyId}`"
            target="_blank"
            rel="noreferrer"
          >
            {{ identifierLabel(identifier) }}
          </a>
          <a v-if="identifier.url" :href="identifier.url" target="_blank" rel="noreferrer">
            {{ identifier.value }}
          </a>
          <span v-else>{{ identifier.value }}</span>
        </li>
      </ul>
    </details>
    <p v-else class="technical-empty">{{ t('noExternalIdentifiers') }}</p>
  </section>
</template>
