<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L, { type Map, type Polygon } from 'leaflet'

import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { AREAS } from '@/config/areas'
import { TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaBoundary, AreaDefinition, PienalueBoundary } from '@/domain/areas'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchAreaRecord, fetchPienalueBoundaries } from '@/services/boundaryData'

const props = defineProps<{ area: AreaDefinition }>()

const { buildUrl, language, t } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const loadingMessage = ref(t('loading'))
const boundary = ref<AreaBoundary | null>(null)
const childAreas = ref<PienalueBoundary[]>([])
const homeHref = buildUrl()
let map: Map | null = null
let polygon: Polygon | null = null

const title = computed(() =>
  localizeAreaName(boundary.value?.names, props.area.name, language.value),
)

function childName(area: PienalueBoundary): string {
  return localizeAreaName(area.names, area.name, language.value)
}

onMounted(async () => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, 11)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)

  try {
    const [areaBoundary, pienalueet] = await Promise.all([
      fetchAreaRecord(props.area),
      fetchPienalueBoundaries(AREAS),
    ])
    boundary.value = areaBoundary
    childAreas.value = pienalueet.filter((item) => item.parentSlug === props.area.slug)

    polygon = L.polygon(areaBoundary.rings, {
      color: '#de6d45',
      weight: 4,
      opacity: 1,
      fillColor: '#de6d45',
      fillOpacity: 0.16,
    }).addTo(map)
    polygon.bindTooltip(`${props.area.ref} · ${title.value}`, { sticky: true })

    const bounds = polygon.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] })
    loadingMessage.value = t('localGeojsonLoaded')
  } catch (error) {
    loadingMessage.value =
      error instanceof Error
        ? `${t('boundaryLoadingFailed')}: ${error.message}`
        : t('boundaryLoadingFailed')
  }
})

onBeforeUnmount(() => {
  polygon?.remove()
  polygon = null
  map?.remove()
  map = null
})
</script>

<template>
  <main class="area-detail-page">
    <header class="area-detail-hero">
      <div class="area-detail-hero__inner">
        <div class="area-detail-toolbar">
          <a class="area-back-link" :href="homeHref">← {{ t('backToMap') }}</a>
          <LanguageSwitcher />
        </div>
        <p class="eyebrow">{{ t('majorArea') }} {{ area.ref }}</p>
        <h1>{{ title }}</h1>
        <p>{{ t('localBoundaryIntro') }} {{ area.relationId }}.</p>
      </div>
    </header>

    <section class="area-detail-layout">
      <article class="map-card area-detail-map-card">
        <div class="map-card__header">
          <div>
            <p class="eyebrow">{{ t('boundary') }}</p>
            <h2>{{ title }} {{ t('onOpenStreetMap') }}</h2>
          </div>
          <span class="map-card__status">{{ loadingMessage }}</span>
        </div>
        <div
          ref="mapElement"
          class="map-canvas area-detail-map"
          role="region"
          :aria-label="`${title} · ${t('boundary')}`"
        />
      </article>

      <aside class="info-panel area-detail-info">
        <p class="eyebrow">{{ t('osmMetadata') }}</p>
        <h2>{{ title }}</h2>
        <dl class="feature-list">
          <div>
            <dt>{{ t('reference') }}</dt>
            <dd>{{ area.ref }}</dd>
          </div>
          <div>
            <dt>{{ t('adminLevel') }}</dt>
            <dd>9 · {{ t('majorArea') }}</dd>
          </div>
          <div>
            <dt>{{ t('osmRelation') }}</dt>
            <dd>
              <a
                :href="`https://www.openstreetmap.org/relation/${area.relationId}`"
                target="_blank"
                rel="noreferrer"
              >
                {{ area.relationId }}
              </a>
            </dd>
          </div>
          <div>
            <dt>{{ t('outerWays') }}</dt>
            <dd>{{ boundary?.outerWayIds.length ?? area.outerWayIds.length }}</dd>
          </div>
          <div>
            <dt>{{ t('minorRelations') }}</dt>
            <dd>{{ childAreas.length }}</dd>
          </div>
          <div>
            <dt>{{ t('boundaryDelivery') }}</dt>
            <dd>{{ t('localSnapshot') }}</dd>
          </div>
          <div>
            <dt>{{ t('source') }}</dt>
            <dd>{{ boundary?.source ?? area.source }}</dd>
          </div>
          <div v-if="boundary?.wikidataId">
            <dt>{{ t('wikidata') }}</dt>
            <dd>
              <a
                :href="`https://www.wikidata.org/wiki/${boundary.wikidataId}`"
                target="_blank"
                rel="noreferrer"
              >
                {{ boundary.wikidataId }}
              </a>
            </dd>
          </div>
          <div>
            <dt>{{ t('wikipedia') }}</dt>
            <dd class="external-link-list">
              <a
                v-if="boundary?.wikipedia.fi"
                :href="boundary.wikipedia.fi"
                target="_blank"
                rel="noreferrer"
              >
                {{ t('finnishWikipedia') }}
              </a>
              <a
                v-if="boundary?.wikipedia.fa"
                :href="boundary.wikipedia.fa"
                target="_blank"
                rel="noreferrer"
              >
                {{ t('persianWikipedia') }}
              </a>
              <span v-if="!boundary?.wikipedia.fi && !boundary?.wikipedia.fa">{{
                t('noWikipedia')
              }}</span>
            </dd>
          </div>
        </dl>

        <section class="related-area-list" :aria-labelledby="`children-${area.slug}`">
          <h3 :id="`children-${area.slug}`">{{ t('childAreas') }}</h3>
          <ul v-if="childAreas.length > 0">
            <li v-for="child in childAreas" :key="child.relationId">
              <a :href="buildUrl({ pienalue: child.relationId })">
                <span v-if="child.ref">{{ child.ref }} · </span>{{ childName(child) }}
              </a>
            </li>
          </ul>
          <p v-else>{{ t('noChildAreas') }}</p>
        </section>
      </aside>
    </section>
  </main>
</template>
