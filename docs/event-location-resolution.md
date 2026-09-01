# Event location resolution proof of concept

Status: **E2 implementation in progress. Local resolution is operational; NLS remote resolution requires an API key before the exit gate can be closed.**

Research/update date: **2026-09-02**

This document records the location-resolution contract for Phase E2 of `docs/events-and-jobs-roadmap.md`.

## Resolution order

The event pipeline resolves locations conservatively in this order:

1. classify an explicitly online source record as `online` when its venue is an online placeholder;
2. exact normalized full source address against the committed OSM POI snapshot;
3. exact normalized street + house-number match after ignoring postal/locality/country suffix differences;
4. exact normalized venue name against OSM `name`, `name:fi`, `name:sv`, and `name:en` values;
5. a deliberately small reviewed venue-alias table;
6. an existing NLS geocoding cache entry;
7. NLS Geocoding Service v2 when `NLS_API_KEY` is configured;
8. otherwise an explicit `online`, `multi-location`, or `unresolved` result.

No fuzzy POI match is promoted to a precise marker. If a local name or canonical street/house address maps to multiple distinct POI features, the resolver does not choose one arbitrarily. A unique reviewed venue match may still disambiguate an ambiguous address; otherwise the event remains unresolved.

## Existing local OSM source

Local first-pass matching uses:

```text
public/data/vaasa-pois.geojson
```

That snapshot is derived from OpenStreetMap via Overpass and carries ODbL 1.0 provenance. Its point coordinates are already stored as WGS84 `[longitude, latitude]`.

The first reviewed spelling alias is intentionally narrow:

```text
Vaasan Sähkö Arena -> Vaasan Sähkö Areena
```

Aliases are not a replacement for a place database. Add an alias only when a recurring source spelling is known to refer to a specific existing POI.

### Exact street/house normalization

Full-string address matching remains the strongest local address match. A second exact key compares only the source-backed street name and house number, so harmless suffix differences do not require a remote lookup. For example:

```text
Kirjastonkatu 13, 65100 Vaasa, Suomi
Kirjastonkatu 13, Vaasa
```

both produce the reviewed key:

```text
kirjastonkatu 13
```

This is not fuzzy geocoding: street names and house numbers are never inferred or corrected. If more than one OSM POI shares the same canonical key, that address is ambiguous unless a unique exact venue match disambiguates it.

## Vaasa geographic guard

A temporary source probe against OpenStreetMap established the current Vaasa municipality relation as:

```text
OSM relation: 1855926
Wikidata: Q125080
boundary: administrative
admin_level: 8
```

Observed relation bounding box:

```text
longitude: 21.0276273 .. 22.2423226
latitude:  62.9594378 .. 63.1788540
```

The bounding box is used only as a coarse rejection guard for impossible/out-of-area points. It is **not** equivalent to polygon containment and must not be presented as proof that a point lies inside the exact municipal boundary.

A second same-name OSM relation exists at `admin_level=9`; it is not used for municipality validation.

## NLS Geocoding Service v2

Official service documentation:

- https://www.maanmittauslaitos.fi/kartat-ja-paikkatieto/aineistot-ja-rajapinnat/paikkatietojen-rajapintapalvelut/geokoodauspalvelu
- https://www.maanmittauslaitos.fi/en/rajapinnat/api-avaimen-ohje
- https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/openapi.json

Forward-geocoding endpoint:

```text
https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v2/pelias/search
```

The adapter uses:

- `addresses,interpolated-road-addresses` for address-like queries;
- `geographic-names` for venue/name queries;
- `lang=fi`;
- `size=5`;
- `options=nowildcard,use_any_codelist_lang_match`;
- `use_postal_code` for address queries that already include a five-digit postal code;
- no `crs` parameter, so v2 uses its default CRS84/WGS84 longitude-latitude response order.

The municipality name `Vaasa` is added only when a query contains neither Vaasa/Vasa nor an explicit five-digit postal code. Explicit postal-place queries are left intact so an out-of-area source value is not silently rewritten into Vaasa; any returned point must still pass the Vaasa geographic guard.

### Authentication

The open service is free to use but requires an API key created through NLS My Account. For a self-programmed client, NLS documents HTTP Basic Authentication with the API key as the user-id and an empty password.

The implementation therefore sends the key only in the HTTPS `Authorization` header. It must never be committed to this repository, embedded in generated JSON, added to a URL, or written to logs.

Automation expects:

```text
NLS_API_KEY
```

as an environment variable / GitHub Actions secret.

If the key is absent, the resolver makes **no remote request** and marks otherwise geocodable records with `reason = remote-key-missing`.

A GitHub Actions proof run on 2026-09-02 referenced `secrets.NLS_API_KEY` without reading or printing any secret value. The environment variable was empty, confirming that this repository does not currently have that secret configured. The fail-closed resolver therefore made no NLS requests and produced no remote-cache changes.

## Licence and source provenance

NLS Geocoding Service data must retain source-specific provenance.

- NLS open datasets such as `geographic-names` and `interpolated-road-addresses`: CC BY 4.0 / NLS attribution.
- `addresses`: building-address data supplied from the Finnish Environment Institute (Syke) Ryhti system through the NLS Geocoding Service; CC BY 4.0 / Syke-Ryhti attribution.

The cache records the raw query, retrieval timestamp, accepted precision, source dataset, coordinates, label when available, provider, licence, source URL, and coordinate-transformation note.

Unknown geocoder source identifiers are rejected rather than cached with guessed attribution.

## Cache contract

Remote accepted results are stored in:

```text
public/data/location-cache.json
```

Cache keys are normalized queries. API credentials and full raw API responses are never stored.

A cached point is reused only after normal snapshot validation confirms that it remains inside the verified Vaasa bounding box and still has provider/licence/retrieval provenance. New cache entries also retain the accepted location precision instead of making later runs infer it from query text.

Identical remote queries are memoized within a resolver run, including unresolved results, so repeated event addresses do not generate duplicate NLS requests during the same update.

## Classification policy

Point geometry is only emitted for high-confidence `exact-address`, `known-venue`, or later reviewed point-resolution states.

Non-point states include:

- `online` — the source explicitly marks the record online and does not provide a source-backed physical venue that should be promoted;
- `multi-location` — source text clearly names several areas/locations;
- `unresolved` — no safe point was established.

The feed contains records whose venue is `Online event` while another field still contains a physical-looking fallback/default address. Such records are classified as `online` instead of creating a misleading marker. Hybrid events can still resolve to a physical point when the source names a real physical venue.

Ambiguity is represented as `precision = unresolved` with an explicit ambiguity reason. Municipality-only and placeholder values such as `Vaasa`, `Vasa`, `Finland`, `Suomi`, `Enter Address`, and online-event placeholders are not sent to a geocoder as if they were precise physical addresses.

## Current local-only proof

The authoritative local-only proof was regenerated from the current resolver against the committed 249-event E1 snapshot after all resolver hardening in this PR:

| Classification | Count |
| --- | ---: |
| total events | 249 |
| exact-address local matches | 4 |
| known-venue local matches | 37 |
| NLS-resolved | 0 |
| online | 7 |
| multi-location | 1 |
| ambiguous | 0 |
| unresolved | 200 |
| unresolved specifically waiting for NLS key | 196 |
| high-confidence mapped | 41 |

Current high-confidence point coverage before remote geocoding is:

```text
41 / 249 = 16.47%
```

These figures are an E2 diagnostic baseline, not the final mapping-coverage result. The final rate must be measured again after a real NLS pass.

## Generated proof-of-concept artifacts

E2 produces:

```text
public/data/event-locations.json
public/data/event-location-report.json
public/data/location-cache.json
```

Run:

```bash
npm run events:locations
npm run events:locations:check
```

The report measures exact-address, known-venue, NLS-resolved, online, multi-location, ambiguous, unresolved, and overall high-confidence mapping counts. Its top-level classifications must partition all source events, and cache entries must retain consistent retrieval and source/licence provenance.

Temporary branch-only proof/format/regeneration workflows were used to establish the source contract, run the no-secret proof, and synchronize generated artifacts. They were removed before the PR was left for review; only the repository's normal CI and deploy workflows remain on the branch.

## E2 exit gate

E2 is complete only after:

- [x] local matching and classifications are validated;
- [x] NLS terms/provenance are documented;
- [ ] an API key is configured outside source control;
- [ ] real remote responses are exercised and cached with source-specific provenance;
- [x] the validator rejects accepted points outside the verified Vaasa geographic guard;
- [ ] the measured final high-confidence mapping rate is reviewed before marker UX begins.

Until a real NLS API key is configured and the remote pass is measured, E2 remains **open** and E3/E4 must not assume remote geocoding has been proven.
