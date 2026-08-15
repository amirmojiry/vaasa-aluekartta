# Data freshness and open-data availability

This note records which newer datasets can safely replace the historical area statistics used by the application and which cannot.

The important distinction is geographic compatibility. The application is built around Vaasa's municipal sub-area hierarchy (`suuralue` / `pienalue`). A newer dataset is not a safe replacement if it is only available by municipality or postal code, because those areas do not match the application's polygons.

## Current application data

| Metric | Current reference year | Current source |
| --- | ---: | --- |
| Major-area population history | 2024 | Publicly available compiled source recorded in `major-area-population-history.json` |
| Historical area population | 2015 | Sanna Komsi (2016), based on Statistics Finland data |
| Employed share | 2013 | Sanna Komsi (2016) / derived from the historical labour-force observations |
| Unemployed share | 2013 | Sanna Komsi (2016) |
| Student share | 2013 | Sanna Komsi (2016) |
| Mother-tongue shares | 2015 | Sanna Komsi (2016) |
| Average annual taxable income | 2014 | Sanna Komsi (2016), underlying Statistics Finland source |
| Election results | election-specific, through 2025 | Public election/Wikipedia-backed records with coverage metadata |
| OpenStreetMap POIs | snapshot | OpenStreetMap via Overpass |

## Statistics Finland: exact municipal sub-areas are paid

Statistics Finland's **Väestötilastopalvelu** provides the modern datasets that are the closest one-to-one replacements for the historical statistics in this repository. Many tables are available down to `kunnan osa-alue`, which is the required geographic level for Vaasa's municipal sub-areas.

However, Statistics Finland explicitly classifies Väestötilastopalvelu as a **paid** service. Subscriber credentials are required for the detailed databases and their API access.

Relevant databases include:

- Population structure (`Väestörakenne`): municipal sub-area population data through 2025.
- Employment structure and commuting (`Elinkeinorakenne ja työssäkäynti`): municipal sub-area employment/main-activity data.
- Income (`Tulot`): municipal sub-area income data.

Official service pages:

- https://stat.fi/fi/palvelut/tilastodatapalvelut/tilastotietokannat/vaestotilastopalvelu
- https://stat.fi/fi/palvelut/tilastodatapalvelut/tilastotietokannat/vaestotilastopalvelu/vaestorakenne

Because the repository does not have a licence for this paid service, these datasets must not be copied into the project from subscriber-only tables.

## Free Statistics Finland data is not a direct geographic replacement

Statistics Finland also publishes extensive free data.

### StatFin

The public StatFin database contains current municipality-level population and language statistics, including 2025 population-structure data. This is useful for citywide validation, but it does not provide Vaasa `pienalue` values in the free tables.

Examples:

- https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/11rm.px/
- https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/11s2.px/

### Paavo open data by postal code area

Paavo is explicitly free of charge and provides current data by postal code area. The 2026 release contains data through 2024 for population structure, income, and main type of activity, including employed, unemployed, and student counts.

Official service pages:

- https://stat.fi/en/services/statistical-data-services/statistical-databases/paavo
- https://pxdata.stat.fi/PxWeb/pxweb/en/Postinumeroalueittainen_avoin_tieto/Postinumeroalueittainen_avoin_tieto__uusin/

Paavo **must not be substituted directly** for the existing `suuralue` / `pienalue` statistics. Postal code areas and Vaasa municipal sub-areas have different boundaries, so assigning a postal-code statistic to a municipal-area polygon would create unsupported values.

A future feature could expose Paavo as a separate `postal code` analysis layer, with its own geometry and labels. That would be a new dataset, not a replacement for the existing municipal-area metrics.

## VASEK / City of Vaasa public regional statistics

VASEK and the City of Vaasa publish a public regional statistics service. Its municipal regional information view states that population is available on a map using the municipality's `pienalue` level, and the service was expanded in 2025.

Public pages:

- https://www.vasek.fi/aluekehitys/tietopalvelu/kuntien-aluetieto-ja-saavutettavuus/
- https://www.vaasa.fi/en/about-vaasa-and-the-vaasa-region/the-vaasa-region-in-numbers/kuntien-aluetieto-ja-saatavuus/

This is currently useful as a public cross-check. During the 2026-08 review, no documented machine-readable download/API and no explicit open-data licence for redistributing the `pienalue` values were found on the public page. For reproducibility and licensing reasons, the repository should not manually transcribe the dashboard into committed JSON unless VASEK/City of Vaasa publishes a downloadable source or confirms reuse terms.

## Open data that can be refreshed safely

### OpenStreetMap POIs

The POI snapshot is open data under ODbL and can be refreshed with the existing repository tooling:

```bash
npm run pois:update
```

The current repository snapshot was generated in August 2026, so it is already recent at the time of this audit.

### Public municipality-level validation

Free StatFin and VASEK data can be used to validate citywide totals and detect obvious inconsistencies in derived totals. They should not silently replace area-level figures when the geographic units differ.

## Replacement decision

As of 2026-08-16, no newer **freely downloadable, reproducible, and geographically equivalent** dataset was found that can safely replace the project's 2013-2015 employment, unemployment, student, language, and income values for the existing Vaasa `suuralue` / `pienalue` polygons.

Therefore this audit intentionally does **not** replace those numeric values with postal-code or municipality-level statistics.

Recommended next steps, in priority order:

1. Ask VASEK / City of Vaasa for a downloadable, reusable export of the public `pienalue` population dataset and its reuse terms.
2. Ask whether the City of Vaasa can provide its own municipal sub-area statistics as open data; the municipality owns its sub-area definitions.
3. If exact current socioeconomic sub-area statistics are required and no open municipal export exists, obtain the appropriate Statistics Finland Väestötilastopalvelu licence.
4. Keep Paavo available as a candidate for a separate postal-code analysis layer rather than mixing it with municipal sub-area data.
