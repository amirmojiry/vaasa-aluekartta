<script setup lang="ts">
import AreaDetail from '@/components/areas/AreaDetail.vue'
import PienalueDetail from '@/components/areas/PienalueDetail.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
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
    <header class="hero">
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

      <div id="top" class="hero__content">
        <div class="hero__copy">
          <p class="eyebrow">{{ t('exploreEyebrow') }}</p>
          <h1>{{ t('heroTitle') }}</h1>
          <p class="hero__lead">{{ t('heroLead') }}</p>
          <div class="hero__meta" :aria-label="t('areaDetails')">
            <span>{{ t('openData') }}</span>
            <span>{{ t('mobileFriendly') }}</span>
            <span>{{ t('noTracking') }}</span>
          </div>
        </div>

        <aside class="hero__aside" :aria-label="t('currentMilestone')">
          <p class="hero__aside-label">{{ t('currentMilestone') }}</p>
          <strong>{{ t('localSnapshots') }}</strong>
          <p>{{ t('localSnapshotsDescription') }}</p>
        </aside>
      </div>
    </header>

    <section class="content-grid" :aria-label="t('statisticalAreas')">
      <VaasaMap />

      <aside class="info-panel">
        <p class="eyebrow">{{ t('boundaryDelivery') }}</p>
        <h2>{{ t('staticGeojson') }}</h2>
        <p>{{ t('boundaryDeliveryDescription') }}</p>

        <dl class="feature-list">
          <div>
            <dt>{{ t('majorAreas') }}</dt>
            <dd>{{ t('majorCoverage') }}</dd>
          </div>
          <div>
            <dt>{{ t('minorAreas') }}</dt>
            <dd>{{ t('minorCoverage') }}</dd>
          </div>
          <div>
            <dt>{{ t('refreshModel') }}</dt>
            <dd>{{ t('refreshDescription') }}</dd>
          </div>
          <div>
            <dt>{{ t('areaDetails') }}</dt>
            <dd>{{ t('areaDetailsDescription') }}</dd>
          </div>
        </dl>
      </aside>
    </section>

    <footer class="site-footer">
      <p>{{ t('footer') }}</p>
    </footer>
  </main>
</template>
