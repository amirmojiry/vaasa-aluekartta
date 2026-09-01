# Events source contract discovery

Status: **E0 complete. Source, coverage, identity, field mapping, time semantics, fixture, and enrichment policy are established.**

Research review completed: **2026-09-01**

This document records the source-contract discovery required by Phase E0 of `docs/events-and-jobs-roadmap.md`. It separates verified source behavior from implementation policy so E1 can start without guessed endpoints or guessed field semantics.

## Official source

The source system is the **Events in Ostrobothnia / Ostrobothnia Events Calendar**.

Official calendar:

- https://events.osterbotten.fi/en/events/

Official information / FAQ:

- https://events.osterbotten.fi/en/feedback
- https://events.osterbotten.fi/fi/palaute-2/tietoa-tapahtumakalenterista/

The official documentation states that the RSS function can be used to import events and can be filtered by municipality or category.

## Vaasa source contract

The repository owner manually selected **Vaasa** in the live English calendar and captured the generated page and RSS URLs.

Calendar URL:

```text
https://events.osterbotten.fi/en/events?Keywords=&EventsFor=&DateFrom=&DateTo=&Municipalities%5B%5D=2&CurrentPage=1
```

This establishes the current Vaasa municipality ID as:

```text
2
```

Calendar-generated Vaasa RSS URL:

```text
https://events.osterbotten.fi/EventService/search?Limit=100&Locale=en_US&Municipalities=2&SortField=Date&SortDir=ASC&Format=rss
```

E1 must use the exact generated endpoint above. Do not reconstruct a path under `/en/events/`; the captured RSS URL is rooted at `/EventService/search`.

Observed browser filter parameter:

```text
Municipalities[]=2
```

Observed RSS search parameters:

```text
Limit=100
Locale=en_US
Municipalities=2
SortField=Date
SortDir=ASC
Format=rss
```

Parameter order is not semantically significant, but the endpoint and values form the current source contract.

## Feed coverage and truncation contract

The calendar-generated URL uses `Limit=100`, but that value is a server-side result cap rather than a guarantee that the current Vaasa result set contains at most 100 events.

A GitHub Actions network probe against the official endpoint on 2026-09-01 produced these results:

- `Limit=100` returned 100 unique items.
- `Limit=101` returned 101 unique items.
- `Limit=200` returned 200 unique items.
- `Limit=250` returned 249 unique items.
- `Limit=500` returned the same 249 unique items.
- `Limit=1000` returned the same 249 unique items.
- Adding `CurrentPage=2` with `Limit=100` returned the same first and last GUIDs as the normal 100-item response, so `CurrentPage` is not an RSS pagination mechanism.

The probe also confirmed an HTTP response content type of `application/rss+xml`.

Therefore the source contract is:

1. `Limit` controls the maximum RSS result count.
2. `CurrentPage` must not be used to paginate RSS results.
3. E1 must request a deliberately high limit and verify that the returned item count is below that limit.
4. If the returned count equals the requested limit, the update must fail with a clear coverage/truncation error rather than silently committing a possibly incomplete snapshot.
5. The requested limit should be isolated as a named ingestion constant so it can be raised without changing parser semantics.

For the E0 probe, `Limit=1000` was sufficient because the complete current result stabilized at 249 items. This is evidence about the current feed, not a permanent guarantee that Vaasa will remain below 1000 events.

## Captured feed and fixture

The browser-saved Vaasa feed initially captured 100 RSS items because it used the calendar-generated `Limit=100` URL. A deliberately small source-faithful fixture containing two source items is committed at:

```text
test/fixtures/events/vaasa-events-source-sample.rss
```

The fixture is test source material only. It is not production event data.

The captured feed is valid RSS 2.0 and declares these namespaces:

```text
atom  = http://www.w3.org/2005/Atom
event = http://events.osterbotten.fi/event-dtd
media = http://search.yahoo.com/mrss/
```

The channel declares:

```text
<language>en</language>
```

and its self link declares:

```text
type="application/rss+xml"
```

The XML declaration is:

```xml
<?xml version="1.0"?>
```

It does not explicitly declare an encoding. The captured file contains valid UTF-8 text and no conflicting encoding declaration, so it is parsed as UTF-8 under XML defaults. HTTP response headers were not preserved by the browser save operation, but the later network probe independently confirmed `Content-Type: application/rss+xml`.

## Stable identity contract

All 100 captured items contained a unique GUID with this form:

```text
EventCalendar_<numeric-id>
```

Example:

```text
EventCalendar_60496
```

All 100 corresponding detail links used the same numeric identifier:

```text
https://events.osterbotten.fi/en/events/show/60496
```

The GUID is marked:

```xml
<guid isPermaLink="false">
```

Therefore E1 should use the RSS GUID as the primary upstream source identifier and preserve it in `source.sourceId`.

Recommended normalized repository ID:

```text
events-in-ostrobothnia:EventCalendar_60496
```

The canonical detail URL remains independently stored in `source.url`. If a future feed item lacks a GUID, fall back to a deterministic ID derived from the canonical detail URL; never derive identity from the display title.

Validation should require:

- normalized ID uniqueness;
- source GUID uniqueness when GUID is present;
- canonical source URL presence;
- numeric ID consistency when both `EventCalendar_<id>` and `/show/<id>` are present.

## RSS item field mapping

The captured 100-item feed established the following source fields and optionality.

- `guid`: present in 100/100; stable upstream ID.
- `link`: present in 100/100; canonical detail URL.
- `title`: present in 100/100; source title for the requested feed locale. Trim surrounding whitespace only.
- `municipality`: present in 100/100 and always `Vaasa`; treat as a source-scope assertion.
- `pubDate`: present in 100/100; source publication/update-like timestamp, not an occurrence time.
- `event:closestDate`: present in 100/100; source convenience field for the closest occurrence.
- `description`: present in 100/100; HTML inside CDATA. Do not blindly persist the full HTML in the first release.
- `category`: present in 100/100; may occur multiple times. Six captured items had multiple categories and the maximum observed was three.
- `event:targetgroup`: present in 82/100; optional target audience.
- `event:dateperiod`: present in 100/100; human-readable source range, secondary to structured occurrences.
- `event:address`: present in 100/100; often generic, including the value `Finland`.
- `event:location`: non-empty in 99/100; venue/location text and frequently more useful than `event:address`.
- `event:onlineevent`: element present in 100/100; three captured values were `1`.
- `event:organizer`: present in 100/100; commonly a contact/person field.
- `event:association`: non-empty in 98/100; commonly the organization/provider.
- `event:dates`: present in 100/100; occurrence starts.
- `event:dates-ext`: present in 100/100; preferred structured occurrence start/end pairs.
- `media:content`: optional and may repeat; do not mirror source images in the first release.
- `media:thumbnail`: optional and may repeat; do not mirror source thumbnails in the first release.

### Categories are plural

The feed can contain multiple `<category>` elements. E1 must normalize categories as an array and preserve all source categories without silently dropping additional values.

### Address and location are not interchangeable

`event:address` is frequently only:

```text
Finland
```

while `event:location` can contain an address-quality string such as:

```text
Raastuvankatu 30, 65100 Vaasa
```

or a named venue such as:

```text
Vaasan Sähkö Arena
```

or multiple locations such as:

```text
Keskusta, Palosaari, Hietalahti, Gerby, Suvilahti, Huutoniemi
```

E1 must preserve both raw fields. Do not treat `event:address = Finland` as address-quality geocoding input. Location resolution belongs to E2.

### Organizer semantics

The feed's `event:organizer` commonly contains a contact person's name. `event:association` often corresponds more closely to the organization displayed by the detail page as the event organizer/provider.

E1 should preserve both separately rather than collapsing them prematurely:

```ts
organizerContact?: string
organizerOrganization?: string
```

The final public label can be decided in the domain/UI layer after more source examples are tested.

## Occurrence and timezone contract

The captured feed contains 858 `event:dates-ext/event:date` occurrences across 100 items.

Observed start offsets:

- `+0300`: 607 occurrences.
- `+0200`: 251 occurrences.

This directly demonstrates Finnish daylight-saving transitions in source values. Recurring autumn events switch from `+0300` to `+0200` after the DST transition.

E1 should parse source occurrence timestamps as offset-bearing instants and serialize normalized values as RFC 3339 while retaining the domain timezone:

```text
Europe/Helsinki
```

`event:dates-ext` is the preferred occurrence source because it provides explicit start/end pairs where an end is available.

Important: **122 captured occurrences had no end value.** An occurrence end is optional and must never be invented.

`event:dates` can be used as a compatibility/checking source for starts, but E1 should prefer `event:dates-ext` when present.

The captured feed did not provide a separate all-day boolean. E1 must not infer all-day events merely from a date-period string. If an item cannot be confidently represented as a timed occurrence, fail or flag it according to parser policy rather than inventing midnight times.

## Online and multi-location semantics

Three captured items had:

```xml
<event:onlineevent>1</event:onlineevent>
```

At least one captured source record also demonstrates why raw source semantics must be preserved carefully: an event can contain address text while also being marked online, and another event may contain online-looking text while the structured online flag is empty.

E1 should preserve the source flag exactly. E2 should classify `online`, `multi-location`, or point-resolvable records using the combined source fields and documented rules rather than trusting one free-text field blindly.

## Description/content policy

The RSS `description` contains HTML inside CDATA and often includes:

- a date/time summary;
- one or more images;
- a short summary;
- longer body text;
- external registration/contact URLs.

The first release should **not** mirror complete long-form descriptions or source images merely because RSS exposes them.

E1 should parse enough of the description to support a conservative short source-provided summary when it can be separated reliably, while retaining the canonical source URL for full details. If robust short-summary extraction is not deterministic, omit the summary rather than storing the entire description.

## Multilingual behavior

The English feed is requested using:

```text
Locale=en_US
```

but individual item content is not guaranteed to be English. Captured English-feed items include Finnish and Swedish titles, categories, and text where an English variant is apparently absent.

Therefore:

- `Locale=en_US` means "request the English presentation/feed", not "every item is English".
- Do not label a value as a verified English translation solely because it came from this feed.
- Preserve source text and use existing UI fallback conventions.
- E1 must not machine-translate missing language variants.
- If full FI/SV/EN structured multilingual coverage is later required, investigate additional locale feeds explicitly rather than assuming one feed carries all language variants.

For E1, it is acceptable to normalize the captured source value as the feed-locale candidate while retaining provenance and allowing fallback behavior.

## Feed/detail-page comparison

Ten source records were checked against their canonical detail-page representations during E0, covering online, recurring, venue-only, address-quality, library, sports, museum, and community events.

Checked IDs included:

```text
60496
61019
61001
58570
60912
59564
42831
60597
962
60784
```

The comparison supports these conclusions:

1. The RSS `link` is the canonical event detail route and its numeric ID matches the GUID.
2. Titles and event identity are consistent enough to treat RSS as the primary ingest source.
3. Structured occurrence dates/times in RSS are suitable as the authoritative ingestion values; no detail-page fetch is required to reconstruct normal occurrence schedules.
4. Venue/location information needed for E1 is already available in RSS.
5. The detail presentation can expose additional display metadata such as price, homepage/contact links, or a differently labelled organizer, but these are not required for the E1 normalized snapshot.
6. Source-language fallback behavior is visible in both feed and detail presentation; the importer must not assume the requested locale guarantees translated content.
7. Source inconsistencies should be preserved or flagged rather than silently corrected by scraping the detail page.

## Detail-page enrichment decision

**Decision for E1: no routine detail-page enrichment.**

The RSS feed directly supplies the fields required to build the first normalized event snapshot:

- stable source identity;
- canonical URL;
- title;
- municipality;
- categories;
- occurrence starts and optional ends;
- venue/location text;
- source address text;
- online flag;
- organizer/contact and association/organization;
- optional target group;
- source description from which a conservative short summary may be derived if reliable.

Do not add an HTML scraper in E1 for price, homepage, contact details, images, or long descriptions. Those are not required by the E1 exit criteria and would unnecessarily couple ingestion to page markup.

If a future product requirement needs a field absent from RSS, add detail-page enrichment only after documenting that field and its source stability.

## E1 parser and coverage requirements derived from E0

E1 should at minimum test:

1. stable GUID + canonical URL parsing;
2. recurring event with multiple `dates-ext` entries;
3. DST transition from `+0300` to `+0200`;
4. missing occurrence end;
5. multiple categories;
6. missing target group;
7. empty association;
8. generic `event:address = Finland` with useful `event:location`;
9. explicit online event;
10. source-language fallback/non-English text in the English feed;
11. description CDATA/HTML handling without mirroring images;
12. validation that every normalized snapshot record remains scoped to municipality `Vaasa`;
13. feed coverage safety: request a high limit and reject a response whose item count equals that limit.

## E0 checklist

- [x] Confirm the official calendar source.
- [x] Confirm official RSS reuse and municipality/category filtering behavior.
- [x] Capture the municipality browser parameter shape: `Municipalities[]`.
- [x] Capture the exact Vaasa municipality value: `2`.
- [x] Capture the exact Vaasa-filtered calendar URL.
- [x] Capture the exact Vaasa-filtered RSS URL from the calendar's own RSS control.
- [x] Save a small raw/source-faithful Vaasa RSS fixture under a test-fixture directory.
- [x] Record RSS version, feed-declared MIME metadata, XML declaration, and encoding behavior.
- [x] Record RSS item field mapping and optionality.
- [x] Establish stable GUID and canonical detail URL identity semantics.
- [x] Compare 10 feed items against their detail-page representations.
- [x] Document multilingual limitations.
- [x] Document detail-page enrichment decision.
- [x] Prove feed coverage behavior and document the saturation guard required by E1.

## E0 exit gate

**E0 exit criteria are satisfied.**

A stable official Vaasa feed has been identified from the calendar's own control, the field/identity/time contract has been inspected from a real captured feed, feed truncation behavior has been measured, a committed source fixture exists for E1 tests, and the importer does not need a guessed endpoint or routine HTML scraping.

The next phase is **E1 — Parser and normalized snapshot, no geocoding**.
