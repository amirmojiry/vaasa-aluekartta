<script setup lang="ts">
import AreaDetail from '@/components/areas/AreaDetail.vue'
import VaasaMap from '@/components/map/VaasaMap.vue'
import { AREA_BY_SLUG } from '@/config/areas'

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
          <p>Gerby is the first suuralue rendered as a real clickable OSM boundary.</p>
        </aside>
      </div>
    </header>

    <section class="content-grid" aria-label="Map and project information">
      <VaasaMap />

      <aside class="info-panel">
        <p class="eyebrow">Boundary rollout</p>
        <h2>Real OSM polygons</h2>
        <p>
          Gerby is now loaded from its OpenStreetMap relation and drawn as an interactive vector
          polygon. The remaining suuralueet can be added using the same relation metadata pattern.
        </p>

        <dl class="feature-list">
          <div>
            <dt>Suuralueet</dt>
            <dd>1 of 12 configured as a clickable OSM polygon</dd>
          </div>
          <div>
            <dt>Pienalueet</dt>
            <dd>Gerby already exposes 12 child relation IDs for the next step</dd>
          </div>
          <div>
            <dt>Area details</dt>
            <dd>Click Gerby on the map to open its dedicated page</dd>
          </div>
        </dl>
      </aside>
    </section>

    <footer class="site-footer">
      <p>Built as an open-source, static website for GitHub Pages.</p>
    </footer>
  </main>
</template>
