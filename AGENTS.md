# AGENTS.md

This file defines the working rules for AI coding agents and human contributors in this repository.

## Project Purpose

Build a static, accessible, multilingual interactive map of Vaasa's **suuralueet** and **pienalueet**.

The application must:

- use an OpenStreetMap-compatible map layer;
- display official or clearly documented area boundaries;
- let users select an area and read structured information;
- work on mobile and desktop;
- deploy successfully to GitHub Pages;
- avoid a backend unless the project requirements later justify one.

## Default Technical Direction

Use this stack unless an existing implementation in the repository establishes otherwise:

- Vue 3
- TypeScript with strict mode
- Vite
- Leaflet
- GeoJSON
- Vitest
- Playwright for critical end-to-end flows
- GitHub Actions for CI and GitHub Pages deployment

Do not replace the core stack without a concrete technical reason documented in the pull request or commit.

## Before Making Changes

1. Read `README.md` and this file.
2. Inspect the current repository structure and configuration.
3. Check existing types, tests, scripts, and conventions before introducing new ones.
4. Identify whether the task affects GitHub Pages paths, map data, accessibility, or source attribution.
5. Prefer the smallest coherent implementation that fully solves the requested task.

Do not assume files or scripts exist. Inspect first.

## Core Architecture Rules

Keep these concerns separate:

1. **Map rendering**
   - Leaflet map lifecycle
   - layers and styles
   - viewport and selection interaction

2. **Domain model**
   - area IDs
   - area hierarchy
   - multilingual names
   - statistics and source metadata

3. **Data access**
   - fetching GeoJSON and area content
   - schema validation
   - loading and error states

4. **Application state**
   - selected area
   - selected boundary level
   - search/filter state
   - URL synchronization

5. **Presentation**
   - controls
   - detail panel
   - accessible area list
   - responsive layout

Do not put all map, state, data-loading, and panel logic into `App.vue`.

## Domain Requirements

Use stable identifiers for all areas.

An area should conceptually support:

```ts
type AreaLevel = 'suuralue' | 'pienalue'

interface LocalizedText {
  fi: string
  sv?: string
  en?: string
}

interface AreaSource {
  label: string
  url: string
  publisher?: string
  licence?: string
  retrievedAt?: string
}

interface AreaRecord {
  id: string
  level: AreaLevel
  name: LocalizedText
  parentId?: string
  description?: Partial<LocalizedText>
  statistics?: {
    population?: number
    referenceYear?: number
    [key: string]: unknown
  }
  sources: AreaSource[]
  updatedAt?: string
}
```

This is a domain guideline, not a requirement to copy the exact interface if a better typed model already exists.

Rules:

- IDs must not be generated from display names at runtime.
- A pienalue parent must reference a valid suuralue ID.
- Missing values must remain explicitly missing; never fabricate values.
- Numeric statistics must include a reference year or equivalent date when relevant.
- Display names and content must not be embedded inside geometry styling code.

## Geospatial Data Rules

Treat boundaries as source data, not hand-drawn UI assets.

For each dataset:

- prefer official City of Vaasa or other authoritative Finnish open-data sources;
- preserve source IDs where possible;
- document source URL, licence, date, and transformations;
- use WGS84 (`EPSG:4326`) GeoJSON in the frontend unless there is a documented reason not to;
- validate all GeoJSON before committing;
- ensure polygon winding and geometry types are supported by the renderer;
- avoid manually editing large generated GeoJSON files;
- implement repeatable conversion/simplification scripts when transformation is required.

If simplifying geometry:

- retain the original source separately or document how to retrieve it;
- make the simplification reproducible;
- test that adjacent boundaries do not visibly diverge at normal zoom levels;
- record the tool and tolerance used.

Never infer or invent municipal/statistical boundaries from OpenStreetMap labels alone.

## OpenStreetMap and Tile Usage

- Always retain visible attribution.
- Do not obscure attribution with overlays.
- Do not commit API tokens or private tile-service credentials.
- Do not assume the public OpenStreetMap tile service is appropriate for unlimited production traffic.
- Keep the tile URL and attribution configurable in one place.

## GitHub Pages Constraints

The site will be hosted under:

```text
/vaasa-aluekartta/
```

Therefore:

- configure Vite's production `base` correctly;
- do not hardcode root-relative asset paths such as `/data/file.json` unless they account for the base URL;
- prefer `import.meta.env.BASE_URL` for public assets;
- ensure refreshes and direct links do not produce a 404;
- use hash-based navigation or a documented Pages-compatible fallback if client-side routing is added;
- run a production build before considering a task complete.

## Vue and TypeScript Conventions

- Use `<script setup lang="ts">` for Vue components unless there is a strong reason not to.
- Keep TypeScript strict; do not silence errors with broad `any` types.
- Prefer explicit domain types and discriminated unions.
- Use composables for reusable stateful behavior.
- Keep components focused and reasonably small.
- Prefer computed state over duplicated mutable state.
- Avoid watchers when a computed value or explicit event can express the behavior.
- Clean up Leaflet listeners and instances during component unmount.
- Do not store non-serializable Leaflet objects in general application state unless isolated intentionally.

## State and URL Behavior

Selection should eventually be shareable and navigable.

When implementing URL state:

- use stable area IDs;
- parse unknown URLs defensively;
- fall back gracefully if an area no longer exists;
- avoid creating history entries for every hover or transient UI event;
- make browser back and forward restore meaningful application state.

## Accessibility Requirements

A map-only interaction is not acceptable.

Every implementation must preserve or improve:

- keyboard access to primary actions;
- a non-map method for selecting areas, such as search or a list;
- visible focus states;
- semantic buttons and form labels;
- adequate contrast;
- selected states that do not rely on colour alone;
- useful loading and error announcements;
- touch targets suitable for mobile devices;
- reduced-motion preferences where animation is introduced.

For map features, ensure the same essential information is available in the detail panel or accessible list.

## Multilingual Content

The domain model should support Finnish, Swedish, and English even if the first version displays only one or two languages.

- Finnish is the default content language unless product requirements state otherwise.
- Do not use area names as translation keys.
- Keep interface strings separate from area data.
- Missing translations should use a predictable fallback, normally Finnish.
- Do not machine-translate official area names without marking or verifying them.

## Styling and Responsive Design

- Design mobile-first.
- The map must remain usable without hiding all controls.
- The area detail view may become a bottom sheet on narrow screens and a side panel on wider screens.
- Avoid fixed pixel dimensions that break smaller screens.
- Do not use colour as the sole signal for hierarchy or selection.
- Keep map layer colours and UI design tokens centralized.

## Performance Requirements

GeoJSON can become large. Agents must actively avoid unnecessary work.

- Fetch static data once and reuse it.
- Avoid deep reactive conversion of large immutable GeoJSON payloads.
- Consider `shallowRef`, `markRaw`, or non-reactive service storage where appropriate.
- Do not repeatedly recreate full Leaflet layers for simple style changes.
- Lazy-load level-specific datasets if this materially improves initial load.
- Measure before adding complex optimization.
- Keep third-party dependencies minimal.

## Data Validation

Add automated validation when area data is introduced.

Validation should detect at least:

- duplicate area IDs;
- missing required names;
- invalid area levels;
- unknown parent IDs;
- pienalue records without a valid parent when hierarchy requires one;
- GeoJSON features without matching content records;
- content records without matching geometry;
- invalid or missing source metadata;
- malformed geometry.

Prefer a script that fails CI over relying on manual inspection.

## Testing Expectations

Write tests at the correct level.

### Unit tests

Use for:

- area hierarchy logic;
- localized-name fallback;
- URL parsing and serialization;
- filtering and search;
- data validation;
- style-selection logic that can be kept independent of Leaflet.

### Component tests

Use for:

- detail panel states;
- search and selection controls;
- loading and error states;
- keyboard behavior.

### End-to-end tests

Cover only essential journeys initially:

1. the site loads under the GitHub Pages base path;
2. an area can be found without using the map;
3. selecting an area updates the detail panel;
4. a shared area URL restores the selection;
5. the key workflow works at a mobile viewport.

Do not write brittle tests against Leaflet's private DOM structure when domain or integration tests can verify the behavior more reliably.

## Required Checks

Before completing a code task, run the available equivalents of:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Run end-to-end tests when the task changes a critical user journey or deployment behavior.

If a command does not exist yet, do not pretend it passed. Add the appropriate script when within task scope, or state clearly that the check is unavailable.

## Dependency Policy

Before adding a dependency:

- verify that the existing stack cannot solve the problem cleanly;
- prefer actively maintained, focused packages;
- check browser compatibility and bundle impact;
- avoid overlapping libraries for the same concern;
- document any dependency that materially shapes architecture.

Never add a backend framework, database, state library, UI framework, or geospatial toolkit merely for convenience.

## Security and Privacy

- Never commit secrets, tokens, credentials, or personal data.
- The initial application should not require user tracking or analytics.
- Do not introduce analytics without an explicit requirement and privacy review.
- Sanitize or safely render any externally sourced rich text.
- Treat URL parameters and imported data as untrusted input.
- Avoid exposing unpublished datasets or private source URLs.

## Source Attribution

Any UI that presents external statistics or descriptions must provide a reasonable path to its source.

Attribution must include, when available:

- publisher;
- dataset or page title;
- source link;
- reference year/date;
- retrieval/update date;
- licence.

Do not present externally sourced facts as original project content.

## Commit and Pull Request Guidance

Use focused commits with imperative messages, for example:

```text
feat: render suuralue boundaries
fix: preserve selection in shared URLs
docs: document Vaasa boundary source
test: validate area parent relationships
```

For pull requests or substantial changes, explain:

- what changed;
- why this approach was chosen;
- how it was tested;
- whether data sources or licences changed;
- any known limitations.

Do not combine unrelated refactors with feature work.

## Definition of Done

A task is complete only when:

- the requested behavior is implemented;
- types are sound;
- relevant tests are added or updated;
- data and attribution rules are satisfied;
- accessibility was considered;
- GitHub Pages path behavior is not broken;
- the production build succeeds when tooling exists;
- documentation is updated when architecture, commands, or datasets change;
- no secrets or generated junk files are committed.

## Current Priorities

Until the initial application is established, prioritize work in this order:

1. project scaffold and quality tooling;
2. GitHub Pages deployment;
3. basic Leaflet map centred on Vaasa;
4. authoritative boundary-source discovery and documentation;
5. validated suuralue/pienalue datasets;
6. area selection and details;
7. search, URL sharing, multilingual UI, and polish.

When a request conflicts with these priorities, follow the explicit user request while preserving the architectural and data-integrity rules above.
