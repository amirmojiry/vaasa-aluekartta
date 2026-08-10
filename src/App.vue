<script setup lang="ts">
import AreaDetail from '@/components/areas/AreaDetail.vue'
import PienalueDetail from '@/components/areas/PienalueDetail.vue'
import VaasaMap from '@/components/map/VaasaMap.vue'
import { AREA_BY_SLUG } from '@/config/areas'

const searchParams = new URLSearchParams(window.location.search)
const areaSlug = searchParams.get('area')
const selectedArea = areaSlug ? (AREA_BY_SLUG.get(areaSlug) ?? null) : null
const pienalueParam = searchParams.get('pienalue')
const pienalueRelationId =
  pienalueParam && /^\d+$/.test(pienalueParam) ? Number(pienalueParam) : null
const homeHref = import.meta.env.BASE_URL
</script>

<template>
  <PienalueDetail v-if="pienalueRelationId" :relation-id="pienalueRelationId" />
  <AreaDetail v-else-if="selectedArea" :area="selectedArea" />

  <main v-else class="app-shell">
    <header class="hero">
      <nav class="topbar" aria-label="Primary navigation">
        <a class="brand" :href="homeHref" aria-label="Vaasa Aluekartta home">
          <span class="brand__mark" aria-hidden="true">VA</span>
          <span>Vaasa Aluekartta</span>
        </a>
        <a class="topbar__link" href="https://github.com/amirmojiry/vaasa-aluekartta"> GitHub </a>
      </nav>

      <div id="top" class="hero__content">
        <div class="hero__copy">
          <p class="eyebrow">Explore Vaasa by area</p>
          <h1>A clearer way to understand Vaasa's neighbourhood structure.</h1>
          <p class="hero__lead">
            Browse the city's suuralueet and pienalueet on an accessible, source-attributed map.
          </p>
          <div class="hero__meta" aria-label="Project characteristics">
            <span>Open data</span>
            <span>Mobile friendly</span>
            <span>No tracking</span>
          </div>
        </div>

        <aside class="hero__aside" aria-label="Current project status">
          <p class="hero__aside-label">Current milestone</p>
          <strong>Local boundary snapshots</strong>
          <p>
            Both map modes use clickable GeoJSON files served directly by this GitHub Pages site.
          </p>
        </aside>
      </div>
    </header>

    <section class="content-grid" aria-label="Map and project information">
      <VaasaMap />

      <aside class="info-panel">
        <p class="eyebrow">Boundary delivery</p>
        <h2>Static GeoJSON</h2>
        <p>
          OpenStreetMap is used as the source of the boundary snapshot, but visitors do not query
          Overpass. The deployed site serves the generated GeoJSON files locally.
        </p>

        <dl class="feature-list">
          <div>
            <dt>Suuralueet</dt>
            <dd>12 clickable polygons from the local suuralue GeoJSON snapshot</dd>
          </div>
          <div>
            <dt>Pienalueet</dt>
            <dd>60 clickable polygons from the local pienalue GeoJSON snapshot</dd>
          </div>
          <div>
            <dt>Refresh model</dt>
            <dd>Boundary data is regenerated from OSM only when GitHub Pages is deployed</dd>
          </div>
          <div>
            <dt>Area details</dt>
            <dd>Click any polygon to open its dedicated page using the same local snapshot</dd>
          </div>
        </dl>
      </aside>
    </section>

    <footer class="site-footer">
      <p>Built as an open-source, static website for GitHub Pages.</p>
    </footer>
  </main>
</template>
