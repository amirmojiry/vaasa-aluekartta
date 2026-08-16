# Events source contract discovery

Status: **E0 partially completed; one source-selection value still requires manual capture from the calendar UI.**

Research date: **2026-08-16**

This document records the source-contract discovery required by Phase E0 of `docs/events-and-jobs-roadmap.md`. It deliberately separates verified behavior from unresolved details so later ingestion code does not depend on a guessed endpoint.

## Official source

The source system is the **Events in Ostrobothnia / Ostrobothnia Events Calendar** operated in cooperation with the Regional Council of Ostrobothnia, KulturOsterbotten, Vaasa Region / City of Vaasa, VASEK, and Visit Vaasa.

Official calendar:

- https://events.osterbotten.fi/en/events/

Official information / FAQ:

- https://events.osterbotten.fi/en/feedback
- https://events.osterbotten.fi/fi/palaute-2/tietoa-tapahtumakalenterista/

The official documentation explicitly states that the RSS function can be used to import events and can be filtered by municipality or category.

## Verified RSS behavior

The RSS link on the unfiltered English calendar resolves to:

```text
https://events.osterbotten.fi/en/events/EventService/allEvents?Format=rss&Limit=100&Locale=en_US&SortDir=ASC&SortField=Date
```

A municipality-filtered calendar page uses a query parameter shaped as:

```text
Municipalities[]=<municipality-id>
```

The RSS control on a verified municipality-filtered page resolves to the search endpoint shaped as:

```text
https://events.osterbotten.fi/en/events/EventService/search?Format=rss&Limit=100&Locale=en_US&Municipalities=<municipality-id>&SortDir=ASC&SortField=Date
```

This was verified with the calendar's own RSS control using Kristiinankaupunki, whose current calendar filter value is `8`:

```text
https://events.osterbotten.fi/en/events/?CurrentPage=1&DateFrom=&DateTo=&EventsFor=&Keywords=&Municipalities%5B%5D=8
```

and the RSS link produced by that filtered page:

```text
https://events.osterbotten.fi/en/events/EventService/search?Format=rss&Limit=100&Locale=en_US&Municipalities=8&SortDir=ASC&SortField=Date
```

This confirms the production integration must use the calendar-generated municipality ID rather than deriving a municipality name into the endpoint.

## Vaasa municipality value: unresolved manual capture

The public calendar UI includes **Vaasa** in its municipality selector, but the non-interactive retrieval environment used for this discovery does not expose the underlying `<option value>` for that selector and cannot submit the select control.

Therefore the Vaasa municipality ID is **not recorded here by inference**.

Before E1 starts, capture it manually from the live calendar:

1. Open https://events.osterbotten.fi/en/events/ in a normal browser.
2. Set **Place = Vaasa**.
3. Confirm the result page contains only the expected Vaasa-scoped event set.
4. Click the footer **RSS** link.
5. Copy the complete generated URL exactly as produced by the site.
6. Record both the calendar filter URL and RSS URL in this document.
7. Save a raw RSS sample under the event test-fixture directory.

Do not replace this step with a guessed numeric municipality ID.

## Current page/filter contract

Observed public filter query parameters include:

```text
CurrentPage
DateFrom
DateTo
EventsFor
Keywords
Municipalities[]
Categories[]
```

The RSS service uses server-side search parameters rather than reproducing the browser query string verbatim. At minimum, a municipality filter becomes:

```text
Municipalities=<municipality-id>
```

The feed locale is explicit in the observed English RSS URL:

```text
Locale=en_US
```

The observed feed also requests:

```text
Format=rss
Limit=100
SortDir=ASC
SortField=Date
```

These values are source behavior, not yet an application-level guarantee. E1 should tolerate missing or changed optional fields and validation should fail clearly if the source contract materially changes.

## Public calendar fields observed

The public event listing exposes the following field classes across current records:

- title;
- category;
- short description/summary where supplied;
- date or date range;
- start/end time where supplied;
- venue/location text;
- street/postal address where supplied;
- canonical event detail link.

The source also supports multilingual event entry. The official FAQ states that organizers can enter separate Finnish, Swedish, and English text variants while shared fields such as time and place are entered once.

## Stable identity and detail URL

The roadmap requirement remains:

- prefer a stable upstream event identifier when the RSS exposes one;
- otherwise derive the repository identity from the stable canonical detail URL;
- never derive identity from the display title.

The exact RSS item identity fields (`guid`, link shape, or equivalent) still need to be recorded from the Vaasa raw RSS fixture because the feed body itself could not be retrieved in this environment.

## Headers, content type, and encoding

The exact response headers, MIME type, charset, and XML declaration still need to be captured from the Vaasa RSS response together with the raw fixture.

Do not assume `application/rss+xml`, `application/xml`, or UTF-8 until the response is captured.

## Detail-page enrichment decision

No production detail-page enrichment is approved yet.

E1 must first inspect the raw Vaasa RSS fixture and map fields directly available in the feed. Detail-page fetches should only be added for a field that is required by the normalized contract and demonstrably absent from RSS.

The first release should remain conservative about copied content: title, time, category, venue/address, organizer when supplied, source URL, and only source-provided short summary text. Do not mirror images or long-form descriptions during E1.

## E0 checklist

- [x] Confirm the official calendar source.
- [x] Confirm the official documentation permits RSS reuse and municipality/category filtering.
- [x] Capture the unfiltered RSS endpoint from the calendar's own RSS control.
- [x] Verify the municipality browser parameter shape: `Municipalities[]`.
- [x] Verify that a municipality-filtered RSS link uses `EventService/search` with `Municipalities=<id>`.
- [ ] Capture the exact **Vaasa** municipality value from the live selector.
- [ ] Capture the exact Vaasa-filtered RSS URL from the calendar's own RSS control.
- [ ] Save a small raw Vaasa RSS fixture under a test-fixture directory.
- [ ] Record feed headers, MIME type, charset, and XML declaration.
- [ ] Record RSS item field mapping, including stable ID/GUID and canonical detail URL.
- [ ] Compare 10-20 feed items against their detail pages for time, address, and multilingual consistency.
- [ ] Document any required detail-page enrichment.

## E0 exit gate

**E0 is not considered complete until the unchecked source-capture items above are completed.**

This is intentional. The roadmap explicitly forbids hard-coding a historical or guessed endpoint. E1 (`scripts/update-events.mjs`, parser fixtures, normalized snapshot, and validation) must not begin from an inferred Vaasa municipality ID.
