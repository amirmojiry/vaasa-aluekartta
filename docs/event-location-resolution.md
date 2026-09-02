# Event location resolution contract

Status: **E2 complete. Local and remote location resolution have been exercised, validated, and measured before marker UX.**

Research/update date: **2026-09-02**

This document records the location-resolution contract for Phase E2 of `docs/events-and-jobs-roadmap.md`.

## Resolution order

The event pipeline resolves locations conservatively in this order:

1. classify an explicitly online source record as `online` when its venue is an online placeholder;
2. exact normalized full source address against the committed OSM POI snapshot;
3. exact normalized street + house-number match only when the remaining postal/locality context is explicitly Vaasa-compatible;
4. exact normalized venue name against OSM `name`, `name:fi`, `name:sv`, and `name:en` values;
5. a deliberately small reviewed venue-alias table;
6. a previously accepted NLS cache entry that passed the current source/query verification policy;
7. NLS Geocoding Service v2 when `NLS_API_KEY` is configured;
8. otherwise an explicit `online`, `multi-location`, or `unresolved` result.

No fuzzy POI match is promoted to a precise marker. If a local name or canonical street/house address maps to multiple distinct POI features, the resolver does not choose one arbitrarily. A unique reviewed venue match may disambiguate an otherwise ambiguous local address only when the source address does not contain conflicting locality context.

## Existing local OSM source

Local first-pass matching uses:

```text
public/data/vaasa-pois.geojson
```

That snapshot is derived from OpenStreetMap via Overpass and carries ODbL 1.0 provenance. Its point coordinates are stored as WGS84 `[longitude, latitude]`.

The reviewed spelling alias layer is intentionally narrow. For example:

```text
Vaasan Sähkö Arena -> Vaasan Sähkö Areena
```

Aliases are not a replacement for a place database. Add one only when a recurring source spelling is known to refer to a specific existing POI.

### Exact street/house normalization

Full-string address matching remains the strongest local address match. A secondary exact key compares the source-backed street and house number so harmless suffix differences can be handled without a remote lookup. For example:

```text
Kirjastonkatu 13, 65100 Vaasa, Suomi
Kirjastonkatu 13, Vaasa
```

both contain the key:

```text
kirjastonkatu 13
```

The secondary key is used only after validating the remaining context. Explicit conflicting locality or postal context is never discarded. Therefore a value such as:

```text
Kirjastonkatu 13, 00100 Helsinki
```

cannot resolve to the Vaasa main-library POI merely because the street and house number happen to match. A bare postal-code suffix without a confirmed Vaasa/Vasa locality is also left for remote verification rather than stripped locally.

Address-based OSM matches do not copy the matched POI's name into the event label. The event's own source venue remains authoritative; this prevents a nearby pharmacy, cafe, or other POI sharing the address from being presented as the event venue.

## Vaasa geographic guard

The Vaasa municipality guard is based on:

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

The bounding box is a coarse rejection guard for impossible/out-of-area points. It is **not** equivalent to polygon containment and must not be presented as proof that a point lies inside the exact municipal boundary.

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

- `addresses` as the authoritative first source for address-like queries;
- `interpolated-road-addresses` only when the direct `addresses` source returns no result;
- `geographic-names` for venue/name queries;
- `lang=fi`;
- `size=5`;
- `options=nowildcard,use_any_codelist_lang_match`;
- `use_postal_code` when an address query already contains a five-digit postal code;
- no `crs` parameter, so v2 uses its default CRS84/WGS84 longitude-latitude response order.

The source-priority rule is important because a single real-world address can appear once in `addresses` and again as an interpolated road address. Those are not treated as two competing places. Multiple candidates inside the authoritative `addresses` source, however, remain ambiguous.

### Acceptance evidence

A singleton result is **not** accepted merely because it is a supported point inside the Vaasa bounding box.

For an address result, all of the following must hold:

- the returned municipality identifier is Vaasa (`905`);
- the normalized returned street + house number exactly matches the source query;
- the source query itself does not carry conflicting non-Vaasa locality context;
- the point passes the geographic guard;
- the source dataset has documented provenance/licensing.

For a geographic-name result, the normalized returned name must exactly match the queried venue/name after removing only explicit Vaasa/Vasa search context, and the municipality must again be `905`.

Results that fail this evidence are stored as no point with `reason = geocoder-result-mismatch`. Multiple verified candidates remain `ambiguous-geocoder-match`.

### Authentication

The service requires an API key created through NLS My Account. For a self-programmed client, NLS documents HTTP Basic Authentication with the API key as the user-id and an empty password.

The implementation sends the key only in the HTTPS `Authorization` header. It is never committed to the repository, embedded in generated JSON, placed in the query URL, or intentionally written to logs.

Automation reads:

```text
NLS_API_KEY
```

from the environment / GitHub Actions secret store. The final E2 proof run confirmed that the secret is configured and successfully exercised real NLS responses without exposing the secret value.

If the key is absent in another environment, the resolver makes no remote request and returns `reason = remote-key-missing` for otherwise geocodable uncached records.

## Licence and source provenance

NLS Geocoding Service data retains source-specific provenance.

- NLS open datasets such as `geographic-names` and `interpolated-road-addresses`: CC BY 4.0 / NLS attribution.
- `addresses`: building-address data supplied from the Finnish Environment Institute (Syke) Ryhti system through the NLS Geocoding Service; CC BY 4.0 / Syke-Ryhti attribution.

The cache records the raw query, retrieval timestamp, accepted precision, source dataset, coordinates, label when available, provider, licence, source URL, coordinate-transformation note, and verification-policy marker.

Unknown geocoder source identifiers are rejected rather than cached with guessed attribution.

## Cache contract

Remote accepted results are stored in:

```text
public/data/location-cache.json
```

Cache keys are normalized queries. API credentials and full raw API responses are never stored.

A cached point is reused only when it carries the current verification marker (`source-query-v2`) and still passes structural, geographic, source/licence, and retrieval-provenance validation. Older cache entries are discarded and re-queried instead of being grandfathered into a stricter policy.

Identical remote queries are memoized within a resolver run, including unresolved results, so repeated event addresses do not generate duplicate NLS requests during the same update.

## Event snapshot freshness contract

Every record in `public/data/event-locations.json` carries a SHA-256 `sourceLocationSignature` derived from the event's current source `venue`, `addressText`, and `online` fields.

`npm run events:locations:check` recomputes that signature from `public/data/events.json`. If an events refresh changes location-relevant source fields while preserving the event ID and total count, validation fails until location resolution is regenerated. This prevents a stale coordinate from remaining silently attached to a moved or reclassified event.

## Classification policy

Point geometry is emitted only for high-confidence `exact-address`, `known-venue`, or later explicitly reviewed point-resolution states.

Non-point states include:

- `online` — the source explicitly marks the record online and its venue is an online placeholder;
- `multi-location` — source text clearly names several areas/locations;
- `unresolved` — no safe point was established.

The feed contains records whose venue is `Online event` while another field still contains a physical-looking fallback/default address. Such records are classified as `online` instead of creating a misleading marker. Hybrid events can still resolve to a physical point when the source names a real physical venue.

Ambiguity is represented as `precision = unresolved` with an explicit reason. Municipality-only and placeholder values such as `Vaasa`, `Vasa`, `Finland`, `Suomi`, `Enter Address`, and online-event placeholders are not sent to a geocoder as if they were precise physical addresses.

## Final measured E2 result

The final hardened proof was run against the committed 249-event E1 snapshot with real NLS access after review fixes and cache re-verification:

| Classification | Count |
| --- | ---: |
| total events | 249 |
| high-confidence mapped | 84 |
| exact-address | 47 |
| known-venue | 37 |
| NLS-resolved | 43 |
| online | 7 |
| multi-location | 1 |
| ambiguous | 28 |
| unresolved | 157 |
| remote-key-missing | 0 |

Final measured high-confidence point coverage is:

```text
84 / 249 = 33.73%
```

This is deliberately a **precision-first** result, not a coverage target. The remaining unresolved and ambiguous events stay available to later list/search UX but must not be given invented marker coordinates.

## Generated artifacts and validation

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

The final proof run passed the focused E2 tests plus repository-wide formatting, lint, type-check, data/unit tests, and production build before committing the generated artifacts.

Temporary branch-only proof and diagnostic workflows were used to safely exercise the secret-backed remote service and inspect representative candidate behavior. They are not part of the production pipeline and are removed before merge.

## E2 exit gate

- [x] local matching and classifications are validated;
- [x] NLS terms/provenance are documented;
- [x] an API key is configured outside source control;
- [x] real remote responses are exercised and accepted results are cached with source-specific provenance;
- [x] accepted results require source/query and Vaasa municipality evidence, not only bbox containment;
- [x] the validator rejects accepted points outside the verified Vaasa geographic guard;
- [x] stale location records are rejected when event location source fields change;
- [x] the final high-confidence mapping rate is measured before marker UX.

**E2 is complete.** E3 can consume the event and location snapshots for list/search UX. E4 may render markers only for records whose location resolution contains validated point geometry.
