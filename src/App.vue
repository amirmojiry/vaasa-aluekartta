<script setup lang="ts">
import AreaDetail from '@/components/areas/AreaDetail.vue'
import CityStatistics from '@/components/areas/CityStatistics.vue'
import CityStatisticsSummary from '@/components/areas/CityStatisticsSummary.vue'
import ElectionHistory from '@/components/areas/ElectionHistory.vue'
import PienalueDetail from '@/components/areas/PienalueDetail.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import VaasaMap from '@/components/map/VaasaMap.vue'
import { AREA_BY_SLUG } from '@/config/areas'
import { useI18n } from '@/i18n'

const searchParams = new URLSearchParams(window.location.search)
const areaSlug = searchParams.get('area')
const selectedArea = areaSlug ? (AREA_BY_SLUG.get(areaSlug) ?? null) : null
const pienalueParam = searchParams.get('pienalue')
const pienalueRelationId =
  pienalueParam && /^\d+$/.test(pienalueParam) ? Number(pienalueParam) : null
const { buildUrl, t } = useI18n()
const homeHref = buildUrl()
</script>

<template>
  <PienalueDetail v-if="pienalueRelationId" :relation-id="pienalueRelationId" />
  <AreaDetail v-else-if="selectedArea" :area="selectedArea" />

  <main v-else class="app-shell">
    <header class="hero hero--compact">
      <nav class="topbar" :aria-label="t('primaryNavigation')">
        <a class="brand" :href="homeHref" :aria-label="t('homeAria')">
          <span class="brand__mark" aria-hidden="true">VA</span>
          <span>{{ t('appName') }}</span>
        </a>
        <div class="topbar__actions">
          <a class="topbar__link" href="https://github.com/amirmojiry/vaasa-aluekartta">GitHub</a>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>

    <section class="home-map-section" :aria-label="t('statisticalAreas')">
      <VaasaMap />
      <CityStatisticsSummary />
      <CityStatistics />
      <ElectionHistory city />
    </section>
  </main>

  <SiteFooter />
</template>
