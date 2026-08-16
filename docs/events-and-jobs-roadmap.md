# Events and jobs data roadmap

This document records the research, implementation constraints, proposed data model, and phased delivery plan for adding **current events** and **current job vacancies** to Vaasa Aluekartta.

The goal is to make both datasets usable as first-class, searchable map content while preserving the project's existing rules around provenance, accessibility, missing data, and static GitHub Pages deployment.

Research review date: **2026-08-16**.

## 1. Target outcome

The intended user experience is broader than simply adding more map markers.

A visitor should eventually be able to:

- turn **Events** and **Jobs** on or off independently from statistical boundaries and ordinary POIs;
- search events and jobs together with areas, postal codes, and places;
- filter events by time and category;
- filter jobs by employer, deadline, contract type, or other source-backed metadata where available;
- open a marker or non-map list item and see a concise localized summary;
- follow the original source link for the authoritative/current record;
- use the same content without interacting with Leaflet, including on keyboard and screen-reader workflows;
- distinguish an exact address from an approximate/municipality-only location.

The data should refresh automatically through repository maintenance workflows, but normal visitors should continue consuming **same-origin static files** from GitHub Pages rather than calling third-party event, job, or geocoding APIs directly.

## 2. Architecture decision

The recommended architecture is:

```text
Official/approved external source
        ↓
Scheduled repository data-update script
        ↓
Normalize + validate + geocode/cache
        ↓
Committed static snapshot
        ↓
GitHub Pages build
        ↓
Vue/Leaflet UI + accessible lists/search
```

This follows the same general model already used by the repository for boundaries, Paavo postal data, and OpenStreetMap POIs.

Do **not** make browser clients depend on a live event/job API when the information can be refreshed ahead of deployment. This keeps the site deployable as static GitHub Pages, avoids exposing credentials, makes data validation reproducible, and reduces runtime failure modes.

## 3. Events: source research and decision

### 3.1 Vaasa and Events in Ostrobothnia share the regional calendar ecosystem

The Regional Council of Ostrobothnia's event-calendar documentation says that an event added to the regional calendar gains visibility in the Ostrobothnia calendar, the Vaasa Region event calendar, and several municipal calendars.

Official documentation:

- Events in Ostrobothnia information / FAQ: https://events.osterbotten.fi/en/feedback
- Finnish information page: https://events.osterbotten.fi/fi/palaute-2/tietoa-tapahtumakalenterista/
- Vaasa events frontend: https://www.vaasa.fi/en/events/

The Finnish information page explicitly says that events entered into the shared calendar are automatically shown in the Ostrobothnia calendar and the Vaasa Region calendar.

**Implementation consequence:** do not ingest both `vaasa.fi` and `events.osterbotten.fi` as independent sources. That would create avoidable duplicate-event reconciliation. Treat the Ostrobothnia event calendar as the source system and Vaasa's events page as another presentation of that ecosystem.

### 3.2 An official RSS feed exists

The event-calendar FAQ states that an **RSS** link is available at the bottom of the event-calendar homepage. It also explicitly says the feed can be used to import events to an organization's own website and can be filtered, for example, by **municipality** or **category**.

Official references:

- https://events.osterbotten.fi/en/feedback
- https://events.osterbotten.fi/fi/palaute-2/tietoa-tapahtumakalenterista/

This is preferable to HTML scraping.

**Current unresolved detail:** the generated, current Vaasa-specific RSS URL has not yet been committed to this repository. It should be captured manually from the calendar's own RSS control during Phase E0 below, then tested and documented. Do not hard-code a historical or guessed endpoint.

### 3.3 Event content available in the public calendar

Current public event pages/listings expose the kinds of fields needed by this project, including combinations of:

- title;
- category;
- date or date range;
- start/end time where provided;
- venue;
- street address where provided;
- description;
- organizer;
- price/free status where provided;
- original event URL;
- multilingual text where the organizer has entered language variants.

The event-calendar FAQ also explains that an organizer creates one event and can provide separate Finnish, Swedish, and English text fields while common fields such as time and place are entered once.

This makes a multilingual normalized model practical without generating translated event content ourselves.

## 4. Event ingestion: preferred source hierarchy

Use this order:

1. **Official municipality-filtered RSS feed** from Events in Ostrobothnia.
2. Event detail page only when the feed contains a stable event link and a required field is not present in the feed.
3. HTML listing-page scraping only as a temporary diagnostic/fallback, not the production contract.

The importer should tolerate feed fields changing or being absent. It should fail validation rather than silently invent required data.

## 5. Event data model

A practical first model can look like this conceptually:

```ts
interface EventRecord {
  id: string
  source: {
    provider: 'events-in-ostrobothnia'
    sourceId?: string
    url: string
    retrievedAt: string
  }
  title: Partial<Record<'fi' | 'sv' | 'en', string>>
  description?: Partial<Record<'fi' | 'sv' | 'en', string>>
  category?: {
    id?: string
    label: Partial<Record<'fi' | 'sv' | 'en', string>>
  }
  occurrences: Array<{
    startsAt: string
    endsAt?: string
    allDay?: boolean
  }>
  venue?: string
  address?: {
    street?: string
    postalCode?: string
    city?: string
    countryCode?: 'FI'
  }
  organizer?: string
  priceText?: string
  location: LocationResolution
  updatedAt?: string
}
```

Use a stable upstream identifier when available. If RSS does not provide one directly, derive the repository ID from a stable canonical source URL, not from the display title.

### Repeating events

Do not duplicate the entire event record for every occurrence unless the source model makes that necessary.

Prefer one event with an `occurrences[]` collection. This makes search deduplication and detail views clearer while still allowing the map/list to answer queries such as "today" or "this weekend".

If the source represents repeated occurrences as independent event IDs, preserve the source model first and only group when the relationship can be established reliably.

## 6. Event refresh strategy

The update job should build a **canonical current snapshot**, not only append new records.

Each successful run should:

1. fetch the current Vaasa event feed;
2. normalize all currently relevant events;
3. reconcile with the previous snapshot by stable ID/source URL;
4. update changed title/time/location/description metadata;
5. remove or archive records no longer present according to an explicitly documented retention policy;
6. remove occurrences that are in the past from the active search dataset when appropriate;
7. geocode only locations not already present in the location cache;
8. validate the result;
9. write `public/data/events.json` only when the normalized output is valid.

A current snapshot is safer than an append-only system because events can be changed, cancelled, moved, or corrected by organizers.

## 7. Geocoding events and jobs

### 7.1 Why geocoding needs an explicit confidence model

External records can contain very different location quality:

```text
Hovioikeudenpuistikko 15 A, 65100 Vaasa
Vaasa Market Square
Vaasa City Hall
Several libraries
Online event
Vaasa
```

These must not all become equally precise map markers.

Use a shared location-resolution model for both events and jobs:

```ts
type LocationPrecision =
  | 'exact-address'
  | 'known-venue'
  | 'postal-area'
  | 'municipality'
  | 'multi-location'
  | 'online'
  | 'unresolved'

interface LocationResolution {
  precision: LocationPrecision
  latitude?: number
  longitude?: number
  label?: string
  geocoder?: string
  geocodedAt?: string
  confidence?: number
  sourceAddress?: string
}
```

Only location states with meaningful point geometry should be displayed as precise markers. A municipality-only job must not be pinned to a random central building.

### 7.2 First resolve against local known places

Before calling a remote geocoder, try to match a location against the project's existing local place information.

Possible inputs include:

- exact normalized address;
- known venue aliases;
- OSM POIs already present in `public/data/vaasa-pois.geojson`;
- a manually reviewed small venue alias table for recurring event venues.

Examples:

```text
Vaasa Market Square
Vaasan kaupungintalo
Vaasa Main Library
Kuntsi Museum
Ostrobothnian Museum
Lemonsoft Stadion
Ritz
```

Do not create a large hand-maintained place database when OSM or authoritative address data can resolve the location; the alias table should contain only high-value recurring cases and documented corrections.

### 7.3 National Land Survey of Finland Geocoding API

For Finnish addresses, the preferred geocoder to investigate for the automated data-update pipeline is the **National Land Survey of Finland (Maanmittauslaitos) Geocoding Service**.

Official documentation:

- API description: https://www.maanmittauslaitos.fi/en/maps-and-spatial-data/expert-users/kartta-ja-paikkatietojen-rajapintapalvelut/geokoodauspalvelu
- OpenAPI document: https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/openapi.json
- API-key instructions: https://www.maanmittauslaitos.fi/en/rajapinnat/api-avaimen-ohje

The service supports forward and reverse geocoding, uses sources including geographic names and addresses, and returns extended GeoJSON. The open interface uses API-key authentication.

For this repository, keep the API key only in a GitHub Actions secret, for example:

```text
NLS_GEOCODING_API_KEY
```

Never embed the key in Vue client code or a committed generated URL.

### 7.4 Coordinate-system requirement

The NLS documentation states that ETRS-TM35FIN (`EPSG:3067`) is fully supported and WGS84 (`EPSG:4326`) is supported for some sources.

The frontend's GeoJSON/Leaflet data should remain WGS84.

The importer must therefore either:

- request `EPSG:4326` only for a source where NLS documents support; or
- request the authoritative `EPSG:3067` result and transform it reproducibly to WGS84 before writing project JSON.

Never write projected Finnish coordinates into fields named latitude/longitude.

### 7.5 Geocoding cache

Create a committed cache such as:

```text
public/data/location-cache.json
```

Conceptually:

```json
{
  "vaasa market square|65100|vaasa": {
    "precision": "known-venue",
    "latitude": 63.095,
    "longitude": 21.615,
    "provider": "reviewed/local",
    "resolvedAt": "2026-08-16"
  }
}
```

The exact values above are illustrative only; do not copy them as authoritative coordinates without validation.

Cache keys should be normalized but preserve the raw source string in the result for auditability.

Benefits:

- avoids repeatedly geocoding the same venue/address;
- reduces API dependency and rate usage;
- provides reproducibility;
- makes manual corrections possible without changing source records.

### 7.6 Do not bulk-geocode through public Nominatim

The project's current browser address search uses public Nominatim only after explicit user submission. Keep that use case separate.

Do not turn the public Nominatim endpoint into the scheduled bulk geocoder for daily event/job updates. Its public usage policy is not intended as a generic unrestricted batch-geocoding backend.

If NLS cannot be used for a production scenario, evaluate a dedicated/self-hosted/commercial geocoding service rather than silently moving automated batch work to the public Nominatim server.

## 8. Event content rights and attribution

The event calendar explicitly documents RSS/site-feed reuse for showing events on another website, which is strong support for this integration pattern.

However, the reviewed pages do not provide a simple repository-wide Creative Commons statement authorizing arbitrary republication of every user-uploaded image or long description.

References:

- RSS/reuse guidance: https://events.osterbotten.fi/en/feedback
- Calendar information: https://events.osterbotten.fi/fi/palaute-2/tietoa-tapahtumakalenterista/
- Terms and conditions: https://events.osterbotten.fi/fi/palaute-2/kaeyttoeehdot/

Conservative implementation policy for the first release:

- store title;
- store date/time;
- store category;
- store venue/address;
- store organizer if provided;
- store source URL;
- store a short source-provided summary only when the feed itself supplies it;
- do not mirror event images initially;
- do not treat full long-form descriptions/attachments as freely licensed project content unless reuse rights are confirmed.

Always show a clear source link back to the original event record.

Before expanding to cached full descriptions or event images, request written clarification from the calendar operator (`portal(at)obotnia.fi`) if the published terms do not answer the intended use clearly enough.

## 9. Jobs: two-source strategy

There are two useful scopes and they should be implemented separately.

### J1: City of Vaasa / public-sector jobs through Kuntarekry

The City of Vaasa states that all City of Vaasa job vacancies are published on **Kuntarekry**.

Official references:

- City of Vaasa vacancies: https://www.vaasa.fi/en/education-and-working/working-opportunities/vacancies-in-the-city-of-vaasa/
- Kuntarekry employer page: https://kuntarekry.fi/en/for-employers/
- Kuntarekry site information: https://www.kuntarekry.fi/en/about-this-site/

Kuntarekry's employer documentation says employers can obtain **RSS/XML feeds** for linking job advertisements to their own websites/intranets. Its site information also states that multiple RSS feeds are subscribable.

This makes Kuntarekry the preferred first job-source proof of concept for City of Vaasa/public-sector vacancies.

**Important practical point:** public documentation confirms that feeds exist, but the exact organization-specific feed URL and whether it can be consumed without an employer login must be verified during implementation. Do not assume an undocumented URL pattern.

### J2: Broad Vaasa labour market through Job Market Finland

For broader coverage, the stronger long-term official integration is **Job Market Finland (Työmarkkinatori)** and its Job Posting Retrieval API.

Official references:

- Interfaces for job postings: https://tyomarkkinatori.fi/en/instructions-and-support/interfaces/interfaces-for-job-postings
- Retrieval interface description/instructions: https://tyomarkkinatori.fi/en/instructions-and-support/interfaces/interfaces-for-job-postings/retrieval-interface-description-and-instructions
- API terms: https://tyomarkkinatori.fi/en/instructions-and-support/partners/interfaces-for-job-postings/terms-of-use-for-job-market-finlands-job-posting-apis

The current official documentation describes version 2 of the retrieval interface as a REST API for external organizations that want to retrieve Job Market Finland job postings into their own e-services.

### 9.1 Job Market Finland is not an anonymous open endpoint

Using the retrieval API requires an onboarding process with the KEHA Centre.

The official instructions state that an organization must:

1. submit an activation/implementation notification;
2. accept the API terms;
3. be checked by the KEHA Centre;
4. receive credentials for the test environment;
5. test the integration;
6. request/receive production credentials when ready.

API access is associated with the organization's Business ID.

Therefore, this cannot be implemented as "just call a public endpoint". Treat organization eligibility and credentials as a project prerequisite for J2.

### 9.2 Job Market Finland terms relevant to this project

The current terms permit a retrieval-interface user to present retrieved job postings in its own service and combine them with other data, but impose important conditions.

Among the requirements documented by Job Market Finland:

- indicate the original source;
- keep retrieved job postings up to date;
- remove postings when required and do not retain removed postings in a way that keeps them retrievable;
- do not present the integrating service as an official Job Market Finland service;
- do not forward the API data to third parties without separate permission;
- comply with the current API terms and technical instructions.

These requirements strongly support a regularly rebuilt **active snapshot** rather than a permanent historical archive of every job ad.

### 9.3 Job Market Finland technical model

The version-2 documentation should be treated as the authoritative contract during implementation.

The previously reviewed technical schema supports the kinds of fields needed for this project, including job title/description, employer, publication/expiry metadata, application URL, employment information, language/occupation/skills metadata, and workplace address information where supplied.

Do not commit assumptions about field names from this roadmap into production code. During J2 implementation, download the current official YAML/technical guide linked from the Retrieval Interface page and generate/validate against that version.

The importer should use source-supported filters such as municipality and modification/publication dates when available in the current contract so that refresh work remains efficient.

## 10. Job data model

A normalized model can be conceptually:

```ts
interface JobRecord {
  id: string
  source: {
    provider: 'kuntarekry' | 'job-market-finland'
    sourceId?: string
    url: string
    retrievedAt: string
  }
  title: string
  description?: string
  employer?: string
  workplaceName?: string
  publishedAt?: string
  modifiedAt?: string
  applicationDeadline?: string
  applicationUrl?: string
  employmentType?: string
  salaryText?: string
  workLanguages?: string[]
  occupations?: string[]
  skills?: string[]
  address?: {
    street?: string
    postalCode?: string
    city?: string
    municipality?: string
  }
  location: LocationResolution
}
```

Kuntarekry and Job Market Finland do not need to fill every field. Missing values remain missing.

If the same vacancy is received from more than one source, preserve provenance and implement explicit duplicate detection. Do not merge records solely because titles look similar.

## 11. Jobs refresh strategy

Jobs should also be treated as a current active snapshot.

A run should:

1. fetch the selected source(s);
2. filter to Vaasa according to the source's structured municipality/workplace data;
3. normalize identifiers and timestamps;
4. exclude clearly expired/withdrawn jobs;
5. geocode newly encountered exact addresses;
6. mark municipality-only/postal-only locations with the correct precision instead of fabricating a point;
7. validate source attribution and expiry state;
8. write `public/data/jobs.json`;
9. remove source records no longer permitted/current according to the upstream terms.

For Job Market Finland, compliance with the current deletion/update requirements is a release blocker, not an optional cleanup task.

## 12. Proposed repository files

When implementation begins, prefer this structure unless the actual source contract suggests a better division:

```text
public/data/
├── events.json
├── jobs.json
└── location-cache.json

scripts/
├── update-events.mjs
├── validate-events.mjs
├── update-jobs.mjs
├── validate-jobs.mjs
└── lib/
    ├── geocoding.mjs
    ├── location-cache.mjs
    └── source-normalization.mjs

src/domain/
├── event.ts
├── job.ts
└── location.ts

src/services/
├── eventData.ts
└── jobData.ts

src/components/
├── events/
└── jobs/

.github/workflows/
├── update-events.yml
└── update-jobs.yml
```

Do not duplicate the same geocoding and coordinate-validation logic in separate event and job scripts.

## 13. GitHub Actions design

### 13.1 Scheduled events workflow

Proposed behavior:

```yaml
name: Update events

on:
  workflow_dispatch:
  schedule:
    - cron: '15 3,15 * * *'
```

The exact cadence can be adjusted later. Twice daily is a reasonable starting point for events because same-day changes are useful, while avoiding needless polling.

Workflow logic:

```text
checkout
npm ci
fetch/normalize event feed
resolve cached/new locations
validate events dataset
run relevant unit/data tests
commit public/data/events.json + cache if changed
push to main through the repository's chosen automation strategy
```

The workflow must include concurrency protection so two refresh runs cannot race and overwrite each other.

### 13.2 Scheduled jobs workflow

Once a source is ready:

```yaml
name: Update jobs

on:
  workflow_dispatch:
  schedule:
    - cron: '45 4 * * *'
```

Daily is a sufficient initial cadence unless source requirements or user needs justify more frequent refreshes.

### 13.3 Credentials

Potential secrets:

```text
NLS_GEOCODING_API_KEY
JOB_MARKET_FINLAND_API_KEY
JOB_MARKET_FINLAND_*   # exact names depend on current auth contract
```

Do not create speculative secret names in production until the current API authentication scheme is implemented.

### 13.4 Network allowlisting risk for Job Market Finland

If the KEHA integration requires fixed source-IP allowlisting, standard GitHub-hosted Actions runners can be problematic because their public address ranges are not designed as one small stable application IP.

Before choosing GitHub-hosted Actions for J2, verify the current Job Market Finland production network requirements supplied during onboarding.

If a fixed outbound IP is required, options may include:

- a self-hosted runner with controlled egress;
- an approved runner/hosting option with static outbound networking;
- moving only the secured ingestion job to a small scheduled backend and committing/publishing the resulting sanitized snapshot.

Do not redesign the whole frontend into a backend application just to solve one ingestion credential constraint.

## 14. Search integration

Events and jobs should enter a shared search abstraction instead of each component implementing unrelated text matching.

Conceptual search result type:

```ts
type SearchResult =
  | { type: 'area'; id: string; label: string }
  | { type: 'postal'; id: string; label: string }
  | { type: 'poi'; id: string; label: string }
  | { type: 'event'; id: string; label: string; date?: string }
  | { type: 'job'; id: string; label: string; employer?: string }
```

For a query such as `Gerby`, the UI may eventually group results under:

```text
Areas
Postal codes
Places
Events
Jobs
```

Search should use localized event text only when a corresponding source language exists. Do not machine-translate incoming event/job descriptions merely to fill search indexes.

## 15. Map layer design

Events and jobs should be independent overlay layers, not ordinary POI categories.

Suggested top-level layer concepts:

```text
Statistical boundaries
Places
Events
Jobs
```

Events need time-aware filtering that POIs do not have. Jobs need deadline/employer/contract semantics that POIs do not have. Keeping them separate prevents the POI implementation from becoming an untyped generic bucket.

### Event filters

First useful filters:

- today;
- tomorrow;
- this weekend;
- next 7 days;
- custom date range;
- category;
- text search.

### Job filters

First useful filters depend on actual source coverage, but likely include:

- application deadline;
- employer;
- employment type;
- source;
- text search.

Only expose filters backed by reliable normalized fields.

## 16. Marker behavior and clustering

Do not render hundreds of always-visible event/job markers at every zoom level without measurement.

Initial implementation can:

- render only the currently filtered active records;
- reuse Leaflet layer groups;
- avoid recreating every marker for unrelated UI changes;
- consider clustering only after measuring real Vaasa snapshot sizes and interaction quality.

A dedicated clustering dependency is not required for the first proof of concept.

## 17. Accessible non-map experience

The map must not be the only way to inspect an event or a job.

Every release that adds the corresponding markers must also provide a list/search path that exposes at least:

### Event

- localized title;
- date/time;
- venue/address or location-status text;
- category if available;
- source link.

### Job

- title;
- employer if available;
- application deadline if available;
- location/address or precision/status;
- application/source link.

For markers, accessible list actions may focus/open the matching map marker, but reading the essential information must not require interacting with Leaflet.

## 18. URL/shareable state

Do not put the entire filter model into ad-hoc component state.

When the feature stabilizes, support meaningful shareable URL parameters, for example:

```text
?layers=events
?event=<stable-event-id>
?eventRange=week
?layers=jobs
?job=<stable-job-id>
```

Exact parameter names should follow current application URL conventions and be implemented defensively.

Do not create history entries for every minor checkbox or transient map interaction.

## 19. Validation requirements

### `validate-events.mjs`

At minimum check:

- root/schema version;
- duplicate event IDs;
- source URL presence;
- at least one non-empty title language;
- valid ISO date/time values;
- occurrence ordering (`endsAt >= startsAt` when both exist);
- no NaN/invalid coordinates;
- latitude/longitude in plausible Vaasa/near-Vaasa bounds for point-resolved local events;
- allowed location precision enum;
- exact-address/known-venue records with coordinates;
- source attribution metadata;
- no accidentally embedded API key/query secret.

### `validate-jobs.mjs`

At minimum check:

- duplicate job IDs within a provider;
- title and source URL;
- valid publication/deadline timestamps;
- no active snapshot item whose known deadline has already expired beyond the documented grace period;
- allowed source/provider names;
- valid location-precision semantics;
- coordinates only when a point location is actually resolved;
- source attribution required by the upstream provider;
- no secrets in generated output.

## 20. Unit and integration testing

Add fixture-based parser tests before relying on scheduled automation.

Recommended tests:

1. Event RSS fixture with a normal exact-address event.
2. Event fixture with multiple occurrences.
3. Event fixture missing an English translation.
4. Event fixture that is online-only.
5. Event fixture with an ambiguous venue.
6. Kuntarekry fixture with a Vaasa vacancy.
7. Job fixture containing only municipality-level location.
8. Geocoding-cache hit avoids remote resolution.
9. Invalid geocoder coordinates fail validation.
10. Snapshot reconciliation removes/updates stale records correctly.

Network calls should not be required for ordinary unit tests. Use committed minimal fixtures and dependency injection around fetch/geocoding.

## 21. Browser/e2e testing

When UI work starts, add Playwright coverage for the user-facing contract rather than only checking that markers render.

Critical journeys:

- enable Events layer and find a current event through the non-map list;
- filter events by a date range and verify list/map counts agree;
- search an event by title;
- open an event source link;
- enable Jobs and inspect a job without touching the map;
- municipality-only job is not presented as an exact address marker;
- narrow mobile viewport has no document-wide horizontal overflow;
- Persian UI preserves RTL behavior where project translations exist;
- keyboard navigation can reach filters and list entries.

## 22. Performance and snapshot size

The Events in Ostrobothnia documentation says the calendar publishes roughly 2,000 events per year across the regional service. Vaasa-only active data is expected to be a much smaller subset, but the implementation should measure the actual generated JSON before introducing a large client-side index or clustering dependency.

Prefer:

- compact normalized JSON;
- no duplicated long description per occurrence;
- no mirrored event images in the first version;
- lazy-load `events.json` only when event/search functionality needs it if this materially improves initial load;
- same approach for `jobs.json`.

Update `scripts/audit-performance.mjs` budgets if and only if the new data materially changes production payloads and the change is justified.

## 23. Implementation plan: events

### E0 — Source contract discovery

**Goal:** prove the source before writing application code.

Steps:

1. Open the official Events in Ostrobothnia calendar.
2. Use the calendar's RSS control.
3. Select/filter municipality = Vaasa.
4. Capture the exact generated RSS URL.
5. Save a small raw fixture under a test-fixture directory, not under production data.
6. Record feed headers/content type/encoding.
7. Determine which fields are present directly in RSS.
8. Determine whether each item includes a stable event ID and canonical detail URL.
9. Compare 10-20 items against their detail pages for time/address/multilingual consistency.
10. Document any required detail-page enrichment.

**Exit criteria:** stable official feed identified, field mapping documented, no guessed endpoints.

### E1 — Parser and normalized snapshot, no geocoding

1. Add `scripts/update-events.mjs`.
2. Add parser fixtures/tests.
3. Define TypeScript/domain shape mirrored by validator rules.
4. Normalize source IDs, title languages, occurrences, venue, address, category, organizer, URL.
5. Write `public/data/events.json`.
6. Add `scripts/validate-events.mjs` and `npm run events:check`.
7. Do not add map UI yet.

**Exit criteria:** deterministic current Vaasa event snapshot can be regenerated and validated locally.

### E2 — Location resolution proof of concept

1. Add shared location types.
2. Try exact matches against existing local OSM POIs/known venue aliases.
3. Obtain NLS API key for development/automation.
4. Implement forward geocoding behind an isolated service function.
5. Add `location-cache.json`.
6. Validate point results against Vaasa geographic bounds.
7. Explicitly classify online/multi-location/unresolved events.
8. Produce a geocoding report:
   - exact/known venue count;
   - geocoder-resolved count;
   - ambiguous count;
   - unresolved count.

**Exit criteria:** high-confidence mapping rate measured before any marker UX is committed.

### E3 — Event list and search

1. Add `eventData.ts`.
2. Load snapshot from `import.meta.env.BASE_URL`.
3. Add accessible event list.
4. Add date/category filters.
5. Add event results to shared search.
6. Add localized fallbacks following existing UI conventions.
7. Add source attribution.

**Exit criteria:** events are useful without a map.

### E4 — Event map layer

1. Add Events overlay layer.
2. Add markers only for records with valid point resolution.
3. Keep unresolved/online events in the list.
4. Link list and marker selection.
5. Ensure map markers are not the only source of information.
6. Test mobile behavior and visible counts.

**Exit criteria:** filtered list and map agree; ambiguous locations are not misrepresented.

### E5 — Scheduled update workflow

1. Add `update-events.yml` with `workflow_dispatch` first.
2. Store NLS key in repository secret.
3. Run update/validation/tests in Actions.
4. Confirm generated diff contains data/cache only.
5. Add safe commit/push behavior.
6. Add concurrency group.
7. Enable schedule after several successful manual runs.
8. Confirm a data commit triggers/works with Pages deployment.

**Exit criteria:** unattended refresh is reproducible and failures do not publish invalid JSON.

### E6 — Rights/reuse review before richer content

If product wants full descriptions/images:

1. review current event-calendar terms again;
2. document exactly what would be stored and displayed;
3. request written operator permission/clarification where needed;
4. only then expand the normalized dataset.

## 24. Implementation plan: jobs

### J0 — Choose first scope

Start with **City of Vaasa/Kuntarekry**, not every employer in Vaasa.

Reason: it gives a constrained public-sector proof of concept and the City confirms Kuntarekry as its vacancy source.

### J1 — Verify Kuntarekry feed access

1. Identify City of Vaasa's Kuntarekry employer/search page.
2. Locate the RSS/XML subscription mechanism.
3. Verify whether a Vaasa/organization-specific feed is publicly fetchable.
4. Save a minimal fixture.
5. Document fields and stable identifiers.
6. If the feed requires employer credentials or cannot be legally/reliably reused, stop and record that constraint instead of scraping undocumented endpoints.

**Exit criteria:** explicit usable feed or explicit blocker.

### J2 — Kuntarekry snapshot

If J1 succeeds:

1. add `scripts/update-jobs.mjs` with Kuntarekry adapter;
2. normalize active City of Vaasa jobs;
3. add `validate-jobs.mjs`;
4. store source links/deadlines/employer/location text;
5. reuse shared geocoding/cache only for address-quality records;
6. expose municipality/postal-only precision correctly.

**Exit criteria:** reliable static `jobs.json` from Kuntarekry.

### J3 — Jobs accessible UI/search

1. add Jobs list;
2. add title/employer search;
3. show application deadline prominently;
4. keep original application/source link;
5. add map markers only for exact/known point locations;
6. preserve municipality-only jobs in the list.

### J4 — Kuntarekry scheduled workflow

Enable a daily refresh only after several successful manual runs and fixture-based parser tests.

### J5 — Job Market Finland onboarding

In parallel with J1-J4, determine whether the project/operator has an eligible Business ID and wants to accept the Job Market Finland API terms.

Steps:

1. read the current interfaces page and terms;
2. submit KEHA activation/implementation notification;
3. receive test credentials;
4. download the current v2 technical guide/YAML;
5. verify authentication and network/IP requirements;
6. document deletion/update obligations in code comments/tests;
7. test municipality=Vaasa retrieval in the test environment;
8. verify real field coverage and address quality;
9. obtain production credentials when accepted.

**Exit criteria:** documented approved production access, not merely a successful unauthenticated experiment.

### J6 — Add Job Market Finland adapter

1. implement a separate source adapter behind the same normalized `JobRecord` model;
2. filter by structured municipality/source fields;
3. use modified/publication filters where the current API contract supports them;
4. reconcile removed/expired postings according to terms;
5. preserve required source statement;
6. deduplicate only with explicit source identifiers/strong evidence;
7. update tests with official-schema fixtures.

### J7 — Broader map/search release

Once J2 and/or J6 are reliable, expose source filter and broader Vaasa job coverage.

Do not scrape LinkedIn, Indeed, Duunitori, individual company career sites, or dozens of employer pages as the default strategy while an approved aggregate/official interface can provide the needed coverage.

## 25. Suggested npm scripts

When corresponding scripts exist:

```json
{
  "scripts": {
    "events:update": "node scripts/update-events.mjs && npm run events:check",
    "events:check": "node scripts/validate-events.mjs",
    "jobs:update": "node scripts/update-jobs.mjs && npm run jobs:check",
    "jobs:check": "node scripts/validate-jobs.mjs"
  }
}
```

Do not add these package scripts until their target scripts are implemented.

Eventually `npm test` can include `events:check` / `jobs:check` if the static datasets become required production assets.

## 26. Failure policy for scheduled updates

An upstream outage must not destroy the last known good snapshot.

Rules:

- write to a temporary file first;
- validate before replacing the committed output;
- require a reasonable non-zero record count unless the source explicitly confirms zero results;
- reject malformed dates/coordinates;
- preserve last successful snapshot on network/parser failure;
- make Actions fail loudly rather than committing an empty dataset;
- never log API credentials;
- include source response diagnostics only when they do not expose secrets/personal data.

For a suspicious source drop, such as 150 active events becoming 2, fail or require review rather than blindly publishing.

## 27. Observability without a backend

Each snapshot should contain top-level metadata or have a companion metadata section/file with:

```text
source
retrievedAt
schemaVersion
recordCount
sourceFilter (for example municipality=Vaasa)
```

The UI can optionally expose "Data updated" information near source attribution.

The scheduled workflow should also print a concise update report:

```text
Fetched: 184
Active: 176
Added: 8
Updated: 13
Removed: 6
Geocode cache hits: 155
New geocodes: 4
Unresolved locations: 17
```

This makes source changes visible in Actions history without introducing application telemetry.

## 28. Security and privacy

- Keep source/API credentials only in server-side/scheduled execution.
- Never put secrets into `public/data` or built JavaScript.
- Treat organizer/contact fields conservatively; include only fields clearly intended for public event display.
- Do not collect applicant data. This feature is only about public vacancy listings.
- Do not proxy application submissions.
- External links should use the project's existing safe-link conventions.
- Sanitize/validate any external website URL before rendering it.

## 29. Provenance rules

Every Event/Job detail must make the original provider visible.

Examples:

```text
Source: Events in Ostrobothnia
Source: Kuntarekry
Source: Job Market Finland's customer information system
```

Use the exact source wording required by the provider when terms specify it.

The map/site itself must not imply that it is the official Vaasa event calendar or an official Job Market Finland service.

## 30. Important open questions before implementation

### Events

- What is the exact current Vaasa municipality-filtered RSS URL generated by the official calendar?
- Does the RSS provide all fields needed, or is detail-page enrichment necessary?
- Does the feed expose one item per event or per occurrence?
- What stable ID is available?
- What description length/content is included in RSS?
- Are cancellation/deletion states represented explicitly or only by disappearance?
- Do we need written clarification before persisting full descriptions or images?

### Kuntarekry

- Is a City of Vaasa RSS/XML feed publicly accessible without employer authentication?
- What are its reuse/attribution conditions?
- Does it include exact workplace address or mostly municipality/postcode?
- Does it expose stable IDs and modification timestamps?

### Job Market Finland

- Is the project/operator eligible and willing to onboard with Business ID?
- What authentication mechanism is supplied for the 2026 v2 production interface?
- Are there fixed-IP allowlisting requirements?
- What are the exact current limits/cadence recommendations?
- What source string must be rendered exactly?
- Which workplace fields are populated often enough to justify geocoding?

### Geocoding

- Does the chosen NLS request mode consistently return WGS84 for the address source we use, or should we standardize on EPSG:3067 + conversion?
- What rate/usage limits should the scheduled importer enforce?
- How should ambiguous multiple matches be scored/reviewed?

These are implementation questions, not reasons to abandon the feature. The phased plan is designed to resolve them before they can become production data-integrity problems.

## 31. Recommended delivery order

The recommended order is:

```text
E0 source discovery
→ E1 event snapshot
→ E2 geocoding proof
→ E3 accessible event list/search
→ E4 map layer
→ E5 automation

then

J0/J1 Kuntarekry source proof
→ J2 snapshot
→ J3 UI
→ J4 automation

in parallel

J5 Job Market Finland onboarding
→ J6 adapter
→ J7 broader Vaasa job coverage
```

This delivers value early without coupling the event feature to the more formal Job Market Finland onboarding process.

## 32. Definition of done for the first event release

The first production Event release is complete only when:

- source is the official feed, not undocumented scraping;
- snapshot refresh is deterministic;
- data validator exists;
- source links are visible;
- date/time filtering works;
- map shows only confidence-appropriate point locations;
- unresolved/online events remain discoverable in a non-map list;
- search finds events;
- mobile/keyboard accessibility is tested;
- API key is not present in client code/output;
- scheduled update failure preserves the last known good data;
- data-source/reuse notes are documented.

## 33. Definition of done for the first jobs release

The first production Jobs release is complete only when:

- one explicitly approved/reliable source is integrated;
- every listing has clear original-source attribution;
- expired/withdrawn records are removed according to source rules;
- deadline/source/application links are validated;
- exact vs municipality-only location is visibly distinguished;
- list/search provides a complete non-map access path;
- map markers are limited to defensible point locations;
- scheduled refresh cannot publish an empty/corrupt snapshot silently;
- source-specific terms are documented and met.

## 34. Primary documentation links

### Events

- Events in Ostrobothnia FAQ / RSS guidance: https://events.osterbotten.fi/en/feedback
- Events calendar information (Finnish): https://events.osterbotten.fi/fi/palaute-2/tietoa-tapahtumakalenterista/
- Events calendar terms (Finnish): https://events.osterbotten.fi/fi/palaute-2/kaeyttoeehdot/
- Vaasa events frontend: https://www.vaasa.fi/en/events/

### Geocoding

- National Land Survey Geocoding Service: https://www.maanmittauslaitos.fi/en/maps-and-spatial-data/expert-users/kartta-ja-paikkatietojen-rajapintapalvelut/geokoodauspalvelu
- Geocoding OpenAPI: https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/openapi.json
- NLS API-key instructions: https://www.maanmittauslaitos.fi/en/rajapinnat/api-avaimen-ohje

### Kuntarekry / City of Vaasa

- City of Vaasa vacancies: https://www.vaasa.fi/en/education-and-working/working-opportunities/vacancies-in-the-city-of-vaasa/
- Kuntarekry for employers / RSS and XML feed reference: https://kuntarekry.fi/en/for-employers/
- Kuntarekry site information: https://www.kuntarekry.fi/en/about-this-site/

### Job Market Finland

- Job-posting APIs overview: https://tyomarkkinatori.fi/en/instructions-and-support/interfaces/interfaces-for-job-postings
- Retrieval Interface v2 description/instructions: https://tyomarkkinatori.fi/en/instructions-and-support/interfaces/interfaces-for-job-postings/retrieval-interface-description-and-instructions
- Job-posting API terms: https://tyomarkkinatori.fi/en/instructions-and-support/partners/interfaces-for-job-postings/terms-of-use-for-job-market-finlands-job-posting-apis

## Decision

Proceed with the feature incrementally.

**Events are ready for a technical proof of concept now**, starting by capturing and testing the official Vaasa-filtered RSS feed.

**Jobs should start with a Kuntarekry source-access proof**, while Job Market Finland onboarding is treated as the preferred long-term path for broad Vaasa vacancy coverage when organizational credentials and API conditions are satisfied.

In both cases, keep source ingestion, geocoding, validation, and UI rendering separate so a source change does not require rewriting the map application.