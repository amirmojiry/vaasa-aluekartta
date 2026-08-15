# Follow-up: VASEK, newer Vaasa research, and postal-code crosswalks

This follow-up records the results of three additional investigations carried out after the initial data-freshness audit:

1. whether the public VASEK / City of Vaasa regional-statistics dashboard exposes reusable area data;
2. whether newer theses or research reproduce the kind of Vaasa sub-area statistics extracted from Sanna Komsi (2016);
3. whether Statistics Finland Paavo postal-code statistics can be related to Vaasa `suuralue` / `pienalue` polygons without inventing unsupported values.

The review date is 2026-08-16.

## 1. VASEK / City of Vaasa: public visualization, but reuse terms remain unresolved

VASEK's `Kuntien aluetieto ja saavutettavuus` page explicitly states that its maps use the municipal **pienalue** level. It also states that the service shows the latest municipal population figures and population by municipal districts.

Public page:

- https://www.vasek.fi/aluekehitys/tietopalvelu/kuntien-aluetieto-ja-saavutettavuus/

VASEK's 2025 announcement says the renewed service includes municipal-district population on a map and that the service is continuously updated with the newest available data:

- https://www.vasek.fi/meista/viestinta/tiedotteet/uudistunut-tietopalvelu-tarjoaa-tarkentunutta-tietoa-vaasan-seudusta-ja-sen-kehityksesta

The embedded regional-information visualization is served from **Tableau Public**. The discovered workbook/view identifiers are:

- workbook: `VASEKintietopalveluLuonnos`
- municipal-regional-information sheet/view: `Paikkatieto01`
- Tableau Public host: `public.tableau.com`

The current visualization exposes recent values (including 2024 population and 2023 workplaces in the reviewed view), so it is materially newer than the project's 2013-2015 historical socioeconomic dataset.

VASEK has also stated publicly that its statistics can be downloaded from the service as PDF, PowerPoint, or images and that the visualizations update automatically as source providers publish new statistics:

- https://www.vasek.fi/meista/viestinta/tiedotteet/tilastotietoa-vaasan-seudusta-tuoretta-tietoa-kaikkien-kayttoon

### Why the repository still does not import those values

A public Tableau visualization is not, by itself, proof that the underlying dataset may be redistributed as a committed project dataset. During this review, no explicit open-data licence or VASEK/City statement was found authorising redistribution of the underlying `pienalue` table as raw JSON/CSV.

This distinction matters because some VASEK visualizations may ultimately be built from source products whose own licences or access terms differ. The safest current use of the VASEK view is therefore:

- public validation/cross-checking;
- linking users to the official/current visualization;
- not committing manually extracted Tableau values as if they were an openly licensed source dataset.

A direct written confirmation from VASEK or the City of Vaasa that the relevant municipal-subarea table may be downloaded, transformed, and redistributed would remove this blocker.

## 2. Newer Vaasa research found

The search found several newer Vaasa studies, but none that clearly reproduce Komsi's comprehensive citywide table across all Vaasa `suuralue` / `pienalue` units with current population, employment, unemployment, students, languages, and income.

### Salla Viljas (2022): Ristinummi

**Vaasan Ristinummi: Asuinalueen maine – rasite vai mahdollisuus?** is a 2022 University of Vaasa master's thesis focused on Ristinummi.

Repository record:

- https://osuva.uwasa.fi/items/8a1ca57c-4d95-4afc-92eb-1472e8b5f3cd

The thesis is important for this project because it explicitly uses **Statistics Finland Paavo open postal-code data** as a statistical source. It cites `Paavo (Postinumeroalueittainen avoin tieto): Asukasrakenne, 2020` and reports 4,246 residents for Ristinummi in 2020.

The same thesis explicitly distinguishes the **Ristinummi suuralue** from the narrower Ristinummi neighbourhood that is the actual research subject. It states that the major area also includes Vanha Vaasa, Haapaniemi and Alkula.

This is useful precedent for using Paavo to describe a named Vaasa neighbourhood, but it is **not evidence of a universal one-to-one postal-code-to-pienalue mapping**.

### Joona Luhta (2017): housing-market differentiation

**Vaasan asuntomarkkinoiden alueellinen eriytyminen: Asuntojen hintojen alueelliset erot ja niihin vaikuttavat tekijät** studies housing-price differentiation in Vaasa during 2005-2016 and explicitly analyses the city by **postal code areas**.

Repository record:

- https://osuva.uwasa.fi/items/5890bc49-ac60-4f1f-b86f-c9cc9caba902/full

It is relevant to a postal-code analysis layer, but it does not provide a newer replacement for the current municipal-subarea socioeconomic dataset.

### Lähiö-Inno (2020-2022; outputs through 2023)

The University of Vaasa `Lähiö-Inno` project studied Ristinummi and the Olympiakortteli/Vöyrinkaupunki context as cases of neighbourhood development and segregation.

Project page:

- https://www.uwasa.fi/fi/tutkimus/hankkeet/paikkaperustaiset-innovaatiot-asuinalueiden-kehittamisessa-kaksoistapaustutkimus

Research/output page:

- https://sites.uwasa.fi/lahioinno/tutkimus/

The project and related outputs contain newer neighbourhood-level indicators and discussion than Komsi (2016), but they cover selected case areas rather than all Vaasa municipal sub-areas. They are therefore useful for validation and contextual enrichment, not as a complete replacement dataset.

### Research conclusion

No newer thesis or research output was found in this review that can replace `area-statistics.json` and `area-income-2014.json` across the full existing map coverage with the same breadth as Komsi (2016).

The newer research instead supports two narrower uses:

- validation/context for selected neighbourhoods such as Ristinummi and Vöyrinkaupunki;
- evidence that Paavo postal-code data is already an accepted source in Vaasa-focused academic work when the research geography is compatible.

## 3. Postal codes can be related to municipal areas geometrically

Statistics Finland publishes Paavo postal-code geometry as open geographic data. The current dataset is available in formats including GeoJSON and ESRI Shapefile and through WFS/WMS interfaces.

Official source:

- https://stat.fi/en/services/statistical-data-services/geographic-data/geographic-data-by-postal-code-area
- WFS endpoint: `https://geo.stat.fi/geoserver/postialue/wfs`

The 2026 Paavo release contains data through 2024 and includes population structure, education, income, workplaces and main activity.

Statistics Finland also publishes a postal-code-to-municipality key, but no official postal-code-to-Vaasa-municipal-subarea key was found.

### Crosswalk method

Because both sides can be represented as polygons, a crosswalk can be computed by spatial intersection:

```text
Paavo postal-code polygon
        intersect
Vaasa suuralue/pienalue polygon
        -> overlap areas and confidence
```

For every postal-code polygon `P` and municipal polygon `A`, a generated crosswalk can record at least:

```text
postalCoverage = area(P ∩ A) / area(P)
municipalCoverage = area(P ∩ A) / area(A)
```

This permits a transparent classification such as:

- `near-exact`: both polygons overlap almost completely;
- `dominant`: one municipal area contains most of the postal area, or vice versa;
- `split`: multiple areas have substantial overlap;
- `weak`: overlap exists but is not strong enough for statistical substitution.

Thresholds must be documented and tested rather than chosen to force matches. For example, a conservative implementation could treat only >95% mutual coverage as `near-exact` and leave the rest explicitly approximate.

### Important statistical limitation

A geometric crosswalk does **not** automatically make Paavo values exact municipal-area statistics.

Simple polygon-area weighting assumes residents are uniformly distributed across the polygon. That assumption is poor for many Vaasa areas containing coast, industrial land, parks, sparse housing, or dense apartment clusters.

The risk differs by metric:

| Metric type | Crosswalk suitability |
| --- | --- |
| Boundary/navigation relationship | Good; geometric overlap is appropriate |
| Near-exact postal/municipal matches | Potentially usable if confidence is very high and clearly labelled |
| Population counts | Area-weighted estimates are possible but should remain labelled estimates |
| Employed/unemployed/student counts | Same problem as population; residents are not uniformly distributed |
| Percentages/rates | Must not be transferred by simple polygon overlap |
| Average income | Must not be transferred by simple area weighting |
| Language shares | Must not be treated as exact unless source geography is effectively identical |

If an estimate is ever generated from split postal codes, population-weighted or address/building-based allocation is preferable to pure land-area weighting. Even then, the result should be a separate estimated dataset rather than silently replacing exact municipal-subarea observations.

## 4. Recommended implementation path

The safest path is now clearer:

### A. Add Paavo as a first-class postal-code analysis layer

This is the strongest immediately implementable option. It would use:

- official open Paavo polygons;
- official Paavo PxWeb/API statistics;
- current data through 2024;
- its real postal-code geography, with no reinterpretation as municipal areas.

This can provide current population, income, employed, unemployed, student and related indicators without purchasing Väestötilastopalvelu.

### B. Generate a postal-code-to-municipal-area crosswalk for navigation and evidence

A generated crosswalk should store overlap percentages and confidence. It can be used to:

- show which postal codes intersect a `suuralue`/`pienalue`;
- link between postal and municipal views;
- identify a small subset of effectively equivalent polygons;
- document where conversion is unsafe.

It should not automatically convert all Paavo statistics into municipal-area statistics.

### C. Use exact matches only if validation supports them

If spatial analysis shows that a postal-code polygon and one municipal polygon are effectively identical, Paavo may be usable for that specific area with an explicit `postal-derived / near-exact` provenance label.

Areas with split or weak mappings should remain historical on the municipal layer until an exact open source is available.

### D. Continue pursuing the VASEK/City source

The public VASEK `pienalue` visualization is the most promising source for a genuine modern municipal-area population update. Before importing its values, obtain either:

- a documented downloadable dataset with reuse terms; or
- written permission/confirmation from VASEK or the City of Vaasa that the underlying table may be redistributed.

## Decision after follow-up

The follow-up changes the recommendation, but not the existing numeric municipal-area dataset yet:

- **Yes:** build a Paavo postal-code layer from open official data.
- **Yes:** compute a transparent spatial crosswalk between Paavo polygons and current municipal polygons.
- **Possibly:** use Paavo for individual municipal areas only where the crosswalk proves near-equivalence and provenance is clearly labelled.
- **No:** do not mass-convert postal-code values into `pienalue`/`suuralue` statistics by simple area weighting.
- **Not yet:** do not commit VASEK Tableau values as raw project data until reuse rights for the underlying data are clear.
