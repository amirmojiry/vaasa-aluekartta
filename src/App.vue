<script setup lang="ts">
import MetricAnalysisPage from '@/components/analysis/MetricAnalysisPage.vue'
import PartyAnalysisPage from '@/components/analysis/PartyAnalysisPage.vue'
import AreaDetail from '@/components/areas/AreaDetail.vue'
import CityStatistics from '@/components/areas/CityStatistics.vue'
import CityStatisticsSummary from '@/components/areas/CityStatisticsSummary.vue'
import ElectionHistory from '@/components/areas/ElectionHistory.vue'
import PienalueDetail from '@/components/areas/PienalueDetail.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import VaasaMap from '@/components/map/VaasaMap.vue'
import AreaPostalLinks from '@/components/postal/AreaPostalLinks.vue'
import PostalCodeDetail from '@/components/postal/PostalCodeDetail.vue'
import { AREA_BY_SLUG } from '@/config/areas'
import { useI18n } from '@/i18n'
import { isAnalysisMetric } from '@/services/analysisMetrics'

const searchParams = new URLSearchParams(window.location.search)
const partyCode = searchParams.get('party')?.trim().toUpperCase() || null
const metricParam = searchParams.get('metric')
const analysisMetric = isAnalysisMetric(metricParam) ? metricParam : null
const postalParam = searchParams.get('postal')
const postalCode = postalParam && /^\d{5}$/.test(postalParam) ? postalParam : null
const areaSlug = searchParams.get('area')
const selectedArea = areaSlug ? (AREA_BY_SLUG.get(areaSlug) ?? null) : null
const pienalueParam = searchParams.get('pienalue')
const pienalueRelationId =
  pienalueParam && /^\d+$/.test(pienalueParam) ? Number(pienalueParam) : null
const { buildUrl, t } = useI18n()
const homeHref = buildUrl()
</script>

<template>
  <PartyAnalysisPage v-if="partyCode" :party-code="partyCode" />
  <MetricAnalysisPage v-else-if="analysisMetric" :metric="analysisMetric" />
  <PostalCodeDetail v-else-if="postalCode" :code="postalCode" />
  <template v-else-if="pienalueRelationId">
    <PienalueDetail :relation-id="pienalueRelationId" />
    <AreaPostalLinks :pienalue-relation-id="pienalueRelationId" />
  </template>
  <template v-else-if="selectedArea">
    <AreaDetail :area="selectedArea" />
    <AreaPostalLinks :area-slug="selectedArea.slug" />
  </template>

  <main v-else class="app-shell">
    <header class="hero hero--compact">
      <nav class="topbar" :aria-label="t('primaryNavigation')">
        <a class="brand" :href="homeHref" :aria-label="t('homeAria')">
          <span class="brand__mark" aria-hidden="true">VA</span>
          <span>{{ t('appName') }}</span>
        </a>
        <div class="topbar__actions">
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
