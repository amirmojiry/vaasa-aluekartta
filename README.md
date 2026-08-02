# Vaasa Aluekartta

An interactive web map for exploring Vaasa's **suuralueet** and **pienalueet**.

Users can browse administrative/statistical areas on an OpenStreetMap-based map, select an area, and view structured information about it. The application is designed as a static, privacy-friendly website that can be hosted on GitHub Pages.

> Project status: planning and initial setup.

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
│       ├── suuralueet.geojson
│       ├── pienalueet.geojson
│       └── areas.json
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

## OpenStreetMap Attribution

Any page displaying OpenStreetMap tiles must show visible attribution to OpenStreetMap contributors and comply with the tile provider's usage policy.

Do not remove or obscure map attribution controls.

## Local Development

The exact commands will be available after the application scaffold is added. The intended workflow is:

```bash
npm install
npm run dev
```

Before submitting changes:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## GitHub Pages

The production build must work when hosted below the repository path:

```text
https://amirmojiry.github.io/vaasa-aluekartta/
```

Vite's base path, asset URLs, router behavior, and deep-link strategy must all account for this subdirectory deployment.

Deployment should be handled by a GitHub Actions workflow that builds the application and publishes the generated static assets to GitHub Pages.

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

### Milestone 1 — Foundation

- Scaffold Vue, TypeScript, and Vite.
- Add linting, formatting, tests, and CI.
- Configure GitHub Pages deployment.
- Render a basic Vaasa-centred Leaflet map.

### Milestone 2 — Boundary Data

- Identify and document official boundary sources.
- Add validated suuralue and pienalue GeoJSON.
- Render selectable layers with correct hierarchy.

### Milestone 3 — Area Information

- Add the area content model and detail panel.
- Add search and filtering.
- Add source attribution and update metadata.

### Milestone 4 — Navigation and Sharing

- Persist selected level and area in the URL.
- Support browser back/forward navigation.
- Add shareable area links.

### Milestone 5 — Quality

- Improve mobile layout and accessibility.
- Add browser tests for core journeys.
- Audit performance and map-data size.
- Publish the first stable GitHub Pages release.

## Contributing

1. Read [AGENTS.md](./AGENTS.md) before making implementation changes.
2. Keep changes focused and independently testable.
3. Document new datasets and external dependencies.
4. Include tests for domain logic and important user interactions.
5. Verify the production build with the GitHub Pages base path.

## Licence

A project licence has not yet been selected.

Before redistributing boundary data or other external datasets, verify and document their individual licences. The application source-code licence and dataset licences may differ.
