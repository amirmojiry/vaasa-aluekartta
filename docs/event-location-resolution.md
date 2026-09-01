# Event location resolution proof of concept

Status: **E2 implementation in progress. Local resolution is operational; NLS remote resolution requires an API key before the exit gate can be closed.**

Research/update date: **2026-09-02**

This document records the location-resolution contract for Phase E2 of `docs/events-and-jobs-roadmap.md`.

## Resolution order

The event pipeline resolves locations conservatively in this order:

1. exact normalized source address against the committed OSM POI snapshot;
2. exact normalized venue name against OSM `name`, `name:fi`, `name:sv`, and `name:en` values;
3. a deliberately small reviewed venue-alias table;
4. an existing NLS geocoding cache entry;
5. NLS Geocoding Service v2 when `NLS_API_KEY` is configured;
6. otherwise an explicit `online`, `multi-location`, or `unresolved` result.

No fuzzy POI match is promoted to a precise marker. If one exact name resolves to multiple distinct POI features, the event remains ambiguous rather than choosing one arbitrarily.

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
- no `crs` parameter, so v2 uses its default CRS84/WGS84 longitude-latitude response order.

The municipality name `Vaasa` is added to queries that do not already contain Vaasa/Vasa.

### Authentication

The open service is free to use but requires an API key created through NLS My Account. For a self-programmed client, NLS documents HTTP Basic Authentication with the API key as the user-id and an empty password.

The implementation therefore sends the key only in the HTTPS `Authorization` header. It must never be committed to this repository, embedded in generated JSON, added to a URL, or written to logs.

Automation expects:

```text
NLS_API_KEY
```

as an environment variable / GitHub Actions secret.

If the key is absent, the resolver makes **no remote request** and marks otherwise geocodable records with `reason = remote-key-missing`.

## Licence and source provenance

NLS Geocoding Service data must retain source-specific provenance.

- NLS open datasets such as `geographic-names` and `interpolated-road-addresses`: CC BY 4.0 / NLS attribution.
- `addresses`: building-address data supplied from the Finnish Environment Institute (Syke) Ryhti system through the NLS Geocoding Service; CC BY 4.0 / Syke-Ryhti attribution.

The cache records the raw query, retrieval timestamp, source dataset, coordinates, label when available, provider, licence, source URL, and coordinate-transformation note.

Unknown geocoder source identifiers are rejected rather than cached with guessed attribution.

## Cache contract

Remote accepted results are stored in:

```text
public/data/location-cache.json
```

Cache keys are normalized queries. API credentials and full raw API responses are never stored.

A cached point is reused only after normal snapshot validation confirms that it remains inside the verified Vaasa bounding box and still has provider/licence provenance.

## Classification policy

Point geometry is only emitted for high-confidence `exact-address`, `known-venue`, or later reviewed point-resolution states.

Non-point states include:

- `online` — explicitly online and no usable physical query;
- `multi-location` — source text clearly names several areas/locations;
- `unresolved` — no safe point was established.

Ambiguity is represented as `precision = unresolved` with an explicit ambiguity reason. Municipality-only values such as `Vaasa`, `Vasa`, `Finland`, and `Suomi` are not converted into a fake central marker.

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

The report measures exact-address, known-venue, NLS-resolved, online, multi-location, ambiguous, unresolved, and overall high-confidence mapping counts.

## E2 exit gate

E2 is complete only after:

- local matching and classifications are validated;
- NLS terms/provenance are documented;
- an API key is configured outside source control;
- real remote responses are exercised and cached with source-specific provenance;
- all accepted points pass Vaasa bounds validation;
- the measured final high-confidence mapping rate is reviewed before marker UX begins.

Until a real NLS API key is configured and the remote pass is measured, E2 remains **open** and E3/E4 must not assume remote geocoding has been proven.
