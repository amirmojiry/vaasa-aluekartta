# Vaasa Aluekartta

An interactive web map for exploring Vaasa's **suuralueet** and **pienalueet**.

Users can browse administrative/statistical areas on an OpenStreetMap-based map, select an area, and view structured information about it. The application is designed as a static, privacy-friendly website that can be hosted on GitHub Pages.

> Project status: Milestone 2 in progress. Selectable OSM-derived GeoJSON snapshots are generated for the site; municipality-authorized raw boundary geometry remains pending.

## Goals

- Display Vaasa suuralue and pienalue boundaries on an interactive map.
- Make the hierarchy between suuralueet and pienalueet easy to understand.
- Show a detail panel when a user selects an area.
- Support reliable, source-attributed area information.
- Work well on mobile, tablet, and desktop.
- Run without a backend and deploy automatically to GitHub Pages.

## Planned MVP

The first usable version should include:

1. An OpenStreetMap base layer.
2. GeoJSON layers for suuralueet and pienalueet.
3. A control for switching between area levels.
4. Hover/focus highlighting and selected-area styling.
5. A detail panel containing at least:
   - official area name;
   - area level;
   - parent suuralue, where applicable;
   - short description;
   - population or other statistics when a reliable source is available;
   - source and data-update date.
6. Search by area name.
7. A shareable URL for the selected area.
8. Responsive and keyboard-accessible interaction.

## Proposed Technology

- [Vue 3](https://vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Leaflet](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/) tiles
- GeoJSON for area boundaries
- Vitest for unit tests
- Playwright for essential browser tests
- GitHub Actions and GitHub Pages for deployment

The project should remain a client-side static application unless a backend becomes demonstrably necessary.

## Suggested Project Structure

```text
.
├── public/
│   └── data/
│       ├── vaasa-suuralueet.geojson
│       ├── vaasa-pienalueet.geojson
│       └── boundary-metadata.json
├── scripts/
│   └── update-osm-boundaries.mjs
├── src/
│   ├── components/
│   │   ├── map/
│   │   └── area-details/
│   ├── composables/
│   ├── domain/
│   ├── services/
│   ├── stores/
│   ├── styles/
│   ├── App.vue
│   └── main.ts
├── tests/
├── AGENTS.md
└── README.md
```

This structure is a starting point. Keep map rendering, area-domain logic, and content/data loading separated.

## Data Model

Boundary geometry and descriptive content should be kept separate when practical.

Example area record:

```json
{
  "id": "example-area-id",
  "level": "pienalue",
  "name": {
    "fi": "Example",
    "sv": "Exempel",
    "en": "Example"
  },
  "parentId": "example-suuralue-id",
  "description": {
    "fi": "",
    "sv": "",
    "en": ""
  },
  "statistics": {
    "population": null,
    "referenceYear": null
  },
  "sources": [],
  "updatedAt": null
}
```

Stable IDs must not depend on translated display names.

## Data Sources and Integrity

Area boundaries and statistics must come from authoritative or clearly documented sources, preferably the City of Vaasa or another official Finnish open-data provider.

For every imported dataset:

- record the original source URL;
- record the licence;
- record the retrieval or publication date;
- preserve the original area identifiers when available;
- document any geometry simplification or transformation;
- never invent missing boundaries, names, or statistics.

Generated or transformed files should be reproducible through scripts rather than manual editing whenever possible.

Current boundary-source research and limitations are documented in [docs/data-sources.md](./docs/data-sources.md). The deployed selectable layers are generated from OpenStreetMap administrative relations. They are local static GeoJSON snapshots at runtime, but they are not represented as municipality-authorized raw GeoJSON.

## OpenStreetMap Attribution

Any page displaying OpenStreetMap tiles must show visible attribution to OpenStreetMap contributors and comply with the tile provider's usage policy.

Do not remove or obscure map attribution controls.

## Local Development

Generate a fresh local boundary snapshot before starting the app:

```bash
npm install
npm run data:update
npm run dev
```

`npm run data:update` contacts Overpass once and writes the generated files under `public/data/`. Normal page loads then read those static local files and do not contact Overpass.

Before submitting changes:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

## GitHub Pages

The production build works below the repository path:

```text
https://amirmojiry.github.io/vaasa-aluekartta/
```

Vite's base path, asset URLs, router behavior, and deep-link strategy must all account for this subdirectory deployment.

Deployment is handled by a GitHub Actions workflow. The workflow regenerates the OSM-derived GeoJSON snapshot once, builds the application, and publishes the static assets to GitHub Pages. Visitors only download the generated files from GitHub Pages; they do not query Overpass.

Running **Deploy GitHub Pages → Run workflow** manually also refreshes the boundary snapshot.

## Accessibility

The map is not sufficient as the only way to access area information. The application should also provide an accessible list or search interface.

Required principles:

- all primary actions must be keyboard-operable;
- selected and focused states must not rely only on colour;
- controls need accessible names;
- text and UI contrast must meet WCAG AA where applicable;
- the detail panel must expose updates meaningfully to assistive technology;
- touch targets must be suitable for mobile use.

## Performance

- Load only the data needed for the current view when datasets become large.
- Simplify geometry for web display while preserving useful boundary accuracy.
- Avoid unnecessary reactive copies of large GeoJSON objects.
- Keep the first load small enough for normal mobile connections.
- Cache versioned static data where appropriate.

## Roadmap

### [x] Milestone 1 — Foundation

- [x] Scaffold Vue, TypeScript, and Vite.
- [x] Add linting, formatting, tests, and CI.
- [x] Configure GitHub Pages deployment.
- [x] Render a basic Vaasa-centred Leaflet map.

### [ ] Milestone 2 — Boundary Data

- [x] Identify and document boundary authorities, licensed references, and redistribution limitations.
- [x] Add selectable suuralue and pienalue cartographic reference layers with attribution.
- [x] Add typed hierarchy metadata and automated 12/60 count validation.
- [x] Generate reproducible OSM-derived suuralue and pienalue GeoJSON snapshots for the deployed site.
- [x] Render individually selectable polygons with the OSM parent hierarchy.
- [ ] Acquire municipality-authorized georeferenced boundary geometry.
- [ ] Validate the OSM-derived geometry against a municipality-authorized source before treating it as official municipal boundary data.

Tracking issue: [Acquire authoritative Vaasa boundary geometry](https://github.com/amirmojiry/vaasa-aluekartta/issues/2).

### [ ] Milestone 3 — Area Information

- [ ] Add the area content model and detail panel.
- [ ] Add search and filtering.
- [ ] Add source attribution and update metadata.

### [ ] Milestone 4 — Navigation and Sharing

- [ ] Persist selected level and area in the URL.
- [ ] Support browser back/forward navigation.
- [ ] Add shareable area links.

### [ ] Milestone 5 — Quality

- [ ] Improve mobile layout and accessibility.
- [ ] Add browser tests for core journeys.
- [ ] Audit performance and map-data size.
- [ ] Publish the first stable GitHub Pages release.
