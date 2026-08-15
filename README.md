# Vaasa Aluekartta

Vaasa Aluekartta is a multilingual, interactive web application for exploring Vaasa's **suuralueet** (major statistical areas) and **pienalueet** (minor statistical areas), together with demographic, socioeconomic, election, income, population-history, and OpenStreetMap point-of-interest data.

The application is a client-side Vue application deployed as a static GitHub Pages site. It is designed to keep data provenance visible, distinguish exact observations from approximate geographic matches, and leave unsupported values missing instead of inventing them.

**Live site:** https://amirmojiry.github.io/vaasa-aluekartta/

**Repository:** https://github.com/amirmojiry/vaasa-aluekartta

## What the application provides

### Interactive Vaasa map

The home page contains a Leaflet/OpenStreetMap map with selectable Vaasa statistical boundaries.

- Switch between **12 suuralueet** and the currently mapped **pienalueet**.
- Click a polygon to open its dedicated area page.
- Keep the selected boundary level in the URL for shareable navigation.
- Display localized area names where source-backed translations are available.
- Show visible OpenStreetMap attribution on map views.

The current generated OSM hierarchy provides all 12 major-area polygons and 55 of the expected 60 minor-area polygons. Five Vähäkyrö minor-area geometries remain unresolved in the configured hierarchy and are intentionally not inferred.

### Map-based statistical visualization

The main map can be colored by source-backed statistics rather than only displaying the normal boundary view. Current thematic options include:

- population;
- employed population share;
- student share;
- average taxable income;
- Finnish mother-tongue share;
- Swedish mother-tongue share;
- other mother-tongue share.

The displayed reference year is tied to the underlying dataset. Major-area population uses the latest observation in the population-history dataset, while several minor-area and historical socioeconomic indicators use older source years.

### City statistics and election history

Below the home map, the site provides Vaasa-wide statistical summaries and election information, including links into the dedicated thematic and party-analysis pages.

The city summary includes source-backed indicators such as population, employment, unemployment, students, language distribution, and the Vaasa-wide average taxable income where available. Election components expose party results and historical comparisons rather than presenting political figures without their election context.

### Major-area and minor-area pages

Each mapped area has a dedicated detail view. Depending on source coverage, an area page can include:

- localized area name and hierarchy information;
- an area-focused map;
- demographic and socioeconomic statistics;
- ranking against areas at the same level;
- average taxable income and comparison with the Vaasa average;
- historical population trend for supported major areas;
- election history and top-party results;
- links from statistics and party names to their dedicated analysis pages;
- source and technical metadata;
- local/citywide OpenStreetMap places;
- address lookup behavior appropriate to the selected area.

Missing source data is shown as unavailable rather than converted to zero or estimated without a documented basis.

### Dedicated thematic analysis pages

The application provides reusable comparison pages for these metrics:

- `population`
- `employed`
- `unemployed`
- `students`
- `language-finnish`
- `language-swedish`
- `language-other`
- `income`

Each thematic page can provide:

- a major-area/minor-area level selector;
- a choropleth map;
- ranked comparison bars;
- a collapsible detailed table;
- source attribution and reference year information;
- links from listed areas back to their area pages.

Example:

```text
https://amirmojiry.github.io/vaasa-aluekartta/?metric=income&lang=en
```

### Dedicated political-party pages

Party names in election summaries link to dedicated party-analysis pages. A party page supports:

- election selection;
- major/minor area filtering where corresponding source data exists;
- a support-intensity map based on vote share;
- ranked comparison bars for geographically exact observations;
- a collapsible details table containing vote share, vote count, coverage classification, and source links;
- party profile information from the repository's source-backed profile dataset;
- Persian and Finnish Wikipedia links where available.

Political data requires special geographic care. Voting-district boundaries do not always correspond exactly to statistical-area boundaries. The application therefore distinguishes exact datasets from `partial` or `associated` observations. Approximate observations may be displayed with an explicit warning, but they are excluded from exact area rankings and comparison bars.

Example:

```text
https://amirmojiry.github.io/vaasa-aluekartta/?party=KOK&lang=fa
```

### OpenStreetMap places

The map includes a committed static POI snapshot stored in `public/data/vaasa-pois.geojson`. Visitors do not query Overpass during normal browsing.

Available categories include, among others:

- sights and museums;
- supermarkets and shopping;
- police;
- hospitals, clinics, doctors, and pharmacies;
- libraries;
- universities, colleges, schools, and day care;
- train stations, airports, bus stops, and bus stations;
- restaurants and cafés;
- parks and playgrounds;
- sports facilities;
- banks and ATMs;
- post services and parcel lockers;
- fuel stations and EV charging stations.

POI categories can be enabled or disabled independently. Visible places are also available through an accessible list that can focus the corresponding marker on the map.

### Address search

Address search uses the public OpenStreetMap Nominatim Search API only after the visitor explicitly submits a search. There is no background geocoding or autocomplete traffic.

Search results are biased toward Vaasa and then checked against the locally loaded minor-area polygons. On the home page, a matching Vaasa address can link directly to the corresponding minor-area page. On area pages, the result can be shown inside the current area, linked to another mapped area, or reported as outside the mapped Vaasa polygons.

This is a navigation aid, not an authoritative legal boundary or address determination.

### Languages

The UI supports:

- English (`en`)
- Finnish (`fi`)
- Persian (`fa`)

Language is preserved in shareable URLs. Persian mode also uses RTL-aware presentation and localized number formatting where appropriate.

## URL-based navigation

The application uses query parameters rather than a server-side router, which keeps GitHub Pages deployment simple and makes views directly shareable.

Common parameters include:

```text
?lang=fa
?level=suuralue
?level=pienalue
?area=<major-area-slug>
?pienalue=<osm-relation-id>
?metric=population
?metric=income
?party=KOK
```

Parameters can be combined where supported, for example:

```text
https://amirmojiry.github.io/vaasa-aluekartta/?party=KOK&lang=fa
```

## Data and reference years

The repository intentionally contains datasets from different reference years. The UI keeps the source year visible instead of implying that all values describe the same period.

Current analysis datasets include:

| Dataset                        |                       Typical reference year | Notes                                                                                          |
| ------------------------------ | -------------------------------------------: | ---------------------------------------------------------------------------------------------- |
| Major-area population history  | latest available observation, currently 2024 | Used for the current major-area population comparison                                          |
| Historical area population     |                                         2015 | Used where the historical area-statistics dataset is the available source                      |
| Employed share                 |                                         2013 | Historical area statistics                                                                     |
| Unemployed share               |                                         2013 | Historical area statistics                                                                     |
| Student share                  |                                         2013 | Historical area statistics                                                                     |
| Mother tongue shares           |                                         2015 | Finnish, Swedish, and other languages                                                          |
| Average annual taxable income  |                                         2014 | Residents aged 15+ in the underlying source                                                    |
| Election results               |                            election-specific | Municipality, regional, parliamentary, or European election event depending on source coverage |

The main structured data assets include:

```text
public/data/area-statistics.json
public/data/area-income-2014.json
public/data/major-area-population-history.json
public/data/election-statistics.json
public/data/party-profiles.json
public/data/vaasa-pois.geojson
```

Boundary GeoJSON snapshots are generated by the boundary update script and included in the deployed build.

## Data integrity principles

Data integrity is a core requirement of the project.

- Keep the original source URL and attribution with imported datasets.
- Preserve source identifiers where practical.
- Display the reference year for historical statistics.
- Do not silently treat missing values as zero.
- Do not fabricate missing minor-area polygons or derive unsupported statistics.
- Keep approximate political geographic matches visibly separate from exact observations.
- Treat area/address matching as a convenience feature rather than a legal GIS determination.
- Keep OpenStreetMap attribution visible wherever OSM tiles or derived data are used.

A concrete example is the income dataset: an area with no reliable source value remains missing rather than being displayed as EUR 0.

## Boundary snapshot model

Normal visitors do not query Overpass or the OSM editing API for area geometry. Boundary generation is performed before deployment.

`scripts/update-osm-boundaries.mjs` retrieves the configured OpenStreetMap relation geometry, assembles and validates the polygons, and writes the generated static boundary assets used by the application.

Current boundary target/status:

- 12/12 major areas mapped;
- 55/60 minor areas available from the configured OSM hierarchy;
- five Vähäkyrö minor areas unresolved rather than guessed.

The repository does not present these generated OSM polygons as municipality-authorized raw boundary geometry.

## Technology

The application currently uses:

- Vue 3
- TypeScript
- Vite
- Leaflet
- OpenStreetMap tiles and derived data
- Vitest
- Playwright
- ESLint
- Prettier
- GitHub Actions
- GitHub Pages

The required Node.js version is **22.12.0 or newer**.

## Project structure

```text
.
├── .github/workflows/
│   ├── ci.yml
│   └── deploy-pages.yml
├── docs/
├── e2e/
│   └── core-journeys.spec.ts
├── public/
│   ├── data/
│   │   ├── area-income-2014.json
│   │   ├── area-statistics.json
│   │   ├── election-statistics.json
│   │   ├── major-area-population-history.json
│   │   ├── party-profiles.json
│   │   └── vaasa-pois.geojson
│   └── tools/
├── scripts/
│   ├── audit-performance.mjs
│   ├── enrich-wikidata-metadata.mjs
│   ├── update-osm-boundaries.mjs
│   ├── update-osm-pois.mjs
│   ├── update-wikipedia-localization.mjs
│   └── validate-*.mjs
├── src/
│   ├── components/
│   │   ├── analysis/
│   │   ├── areas/
│   │   └── map/
│   ├── config/
│   ├── domain/
│   ├── services/
│   ├── styles/
│   ├── App.vue
│   └── main.ts
├── AGENTS.md
├── package.json
└── README.md
```

The code keeps map rendering, domain models, data loading, statistical analysis, and presentation components separated rather than placing all behavior in a single map component.

## Local development

Install dependencies:

```bash
npm install
```

Generate/refresh the local boundary and metadata data needed by the application:

```bash
npm run data:update
```

`data:update` performs network-backed refresh work and then validates the relevant datasets. Normal browser use reads the resulting/static project assets rather than requesting boundary geometry from an external API.

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Data maintenance commands

Useful maintenance commands include:

```bash
npm run data:update
npm run wiki:update
npm run pois:update
npm run stats:check
npm run income:check
npm run pois:check
```

`pois:update` is intentionally separate from ordinary page loads and normal deployment behavior because public Overpass services can be rate-limited or temporarily unavailable.

## Quality checks

Before merging application changes, run the relevant quality checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run performance:check
npm run test:e2e
```

The GitHub Actions CI workflow runs formatting, linting, type checks, unit/data validation tests, production build checks, performance-budget checks, and browser tests.

## GitHub Pages deployment

Production is deployed at:

```text
https://amirmojiry.github.io/vaasa-aluekartta/
```

The deployment workflow builds the application for the repository subpath and publishes the resulting static assets to GitHub Pages. Boundary snapshots are generated for the deployed build, so visitors consume static same-site files rather than making boundary API calls.

The site does not require an application backend or database server.

## Accessibility and mobile behavior

The application is designed so the map is not the only way to access important information.

- Primary controls are keyboard-operable.
- Maps expose accessible region labels.
- POIs can be accessed through a list as well as map markers.
- Selected states are not communicated only through color.
- Analysis tables are contained within responsive scroll areas on narrow screens.
- Touch targets and layouts are designed for mobile use.
- Source links and explanatory warnings remain available outside map tooltips.

## Known data limitations

The current application is usable in production, but its datasets have explicit limitations:

1. Five expected Vähäkyrö minor-area boundaries are not present in the configured OSM hierarchy and are not fabricated.
2. Several demographic and socioeconomic indicators are historical and come from different reference years.
3. Election voting districts can differ from statistical-area boundaries; non-exact coverage is labelled and excluded from exact rankings.
4. The POI file is a snapshot and can become outdated as OpenStreetMap changes.
5. Address search depends on public Nominatim availability after explicit user submission.
6. Localized area/Wikipedia metadata depends on the source identifiers and translations available during the latest metadata refresh.

These limitations are surfaced in the application where they materially affect interpretation.

## Attribution and third-party data

OpenStreetMap tiles and OSM-derived boundary/POI data require OpenStreetMap attribution and are subject to the applicable OpenStreetMap/ODbL terms. The application keeps OSM attribution visible on map views and retains source links for derived records.

Other statistical, election, income, and profile datasets retain their own source metadata inside the repository and user interface. Consult the source links shown in the application before reusing a specific dataset outside this project.

No repository-wide software licence is asserted by this README; third-party data and content retain their respective licences and attribution requirements.
