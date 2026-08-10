<script setup lang="ts">
import AreaDetail from '@/components/areas/AreaDetail.vue'
import VaasaMap from '@/components/map/VaasaMap.vue'
import { AREA_BY_SLUG, CONFIGURED_SUBAREA_RELATION_COUNT } from '@/config/areas'

const areaSlug = new URLSearchParams(window.location.search).get('area')
const selectedArea = areaSlug ? (AREA_BY_SLUG.get(areaSlug) ?? null) : null
const homeHref = import.meta.env.BASE_URL
</script>

<template>
  <AreaDetail v-if="selectedArea" :area="selectedArea" />

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
          <strong>Interactive boundaries</strong>
          <p>All 12 suuralueet are configured as clickable OpenStreetMap vector boundaries.</p>
        </aside>
      </div>
    </header>

    <section class="content-grid" aria-label="Map and project information">
      <VaasaMap />

      <aside class="info-panel">
        <p class="eyebrow">Boundary rollout</p>
        <h2>Real OSM polygons</h2>
        <p>
          The main map now assembles all 12 suuralue boundaries from the outer way members of their
          OpenStreetMap relations. Each polygon links to its own detail page.
        </p>

        <dl class="feature-list">
          <div>
            <dt>Suuralueet</dt>
            <dd>12 of 12 configured as clickable OSM polygons</dd>
          </div>
          <div>
            <dt>Pienalueet</dt>
            <dd>
              {{ CONFIGURED_SUBAREA_RELATION_COUNT }} child relation IDs are already known; Vähäkyrö
              child relations still need to be resolved
            </dd>
          </div>
          <div>
            <dt>Area details</dt>
            <dd>Click any suuralue polygon on the map to open its dedicated page</dd>
          </div>
        </dl>
      </aside>
    </section>

    <footer class="site-footer">
      <p>Built as an open-source, static website for GitHub Pages.</p>
    </footer>
  </main>
</template>
