<script setup lang="ts">
import VaasaMap from '@/components/map/VaasaMap.vue'
</script>

<template>
  <main class="app-shell">
    <header class="hero">
      <nav class="topbar" aria-label="Primary navigation">
        <a class="brand" href="#top" aria-label="Vaasa Aluekartta home">
          <span class="brand__mark" aria-hidden="true">VA</span>
          <span>Vaasa Aluekartta</span>
        </a>
        <a class="topbar__link" href="https://github.com/amirmojiry/vaasa-aluekartta">GitHub</a>
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
          <strong>Foundation</strong>
          <p>Vue, TypeScript, Leaflet, automated checks, and GitHub Pages deployment.</p>
        </aside>
      </div>
    </header>

    <section class="content-grid" aria-label="Map and project information">
      <VaasaMap />

      <aside class="info-panel">
        <p class="eyebrow">Coming next</p>
        <h2>Official area boundaries</h2>
        <p>
          The next milestone will connect authoritative GeoJSON data for Vaasa's statistical
          areas. Each dataset will include its source, licence, and update date.
        </p>

        <dl class="feature-list">
          <div>
            <dt>Suuralueet</dt>
            <dd>High-level statistical areas</dd>
          </div>
          <div>
            <dt>Pienalueet</dt>
            <dd>Detailed subareas within each suuralue</dd>
          </div>
          <div>
            <dt>Area details</dt>
            <dd>Names, hierarchy, descriptions, and verified statistics</dd>
          </div>
        </dl>
      </aside>
    </section>

    <footer class="site-footer">
      <p>Built as an open-source, static website for GitHub Pages.</p>
    </footer>
  </main>
</template>
