# Wikipedia localization audit

Last checked: 2026-08-12

The Vaasa boundary pipeline reads Finnish and Persian Wikipedia sitelinks from Wikidata. `npm run data:update` now performs an additional localization refresh after the OSM boundary snapshot is generated so that new Persian Wikipedia sitelinks and Persian display names are reflected in the generated area data.

For Persian display names, the refresh prefers the current Persian Wikidata label and falls back to the Persian Wikipedia article title when a Persian article exists. Major-area Persian names are also propagated to the parent-name fields used by minor-area pages.

## Persian names filled from current Persian Wikipedia/Wikidata

The 2026-08-12 audit found six area records whose Persian Wikipedia article existed but whose generated `name_fa` was still missing:

- Böle → بوله (واسا)
- Niemeläntie → نییملن‌تیه
- Sokeri → سوکری
- Sundomin saaristo → مجمع‌الجزایر سوندوم
- Yttersundom → ایترسوندوم
- Översundom → اوورسوندوم

The Persian Wikipedia links for these records were already discoverable from current Wikidata sitelinks; the missing piece was the Persian display-name fallback.

## Finnish Wikipedia pages still without Persian Wikipedia

As of the same audit, these 15 mapped Vaasa minor areas have a Finnish Wikipedia sitelink but no Persian Wikipedia sitelink in Wikidata:

- Alkula — Wikidata Q56401328
- Asevelikylä — Wikidata Q11853090
- Haapaniemi — Wikidata Q11861114
- Keskusta 1 — Wikidata Q131387629
- Keskusta 11 — Wikidata Q131387710
- Keskusta 2 — Wikidata Q131387650
- Keskusta 3 — Wikidata Q131387664
- Keskusta 6 — Wikidata Q131387672
- Keskusta 7 — Wikidata Q131387675
- Keskusta 8 — Wikidata Q131387681
- Kotiranta — Wikidata Q11872834
- Kustaala — Wikidata Q56401334
- Melaniemi — Wikidata Q11882018
- Runsor — Wikidata Q18661758
- Satama — Wikidata Q108321354

This list is a point-in-time audit, not a permanent source of truth. Run `npm run wiki:update` to regenerate the boundary snapshot and recheck Wikidata after new Persian Wikipedia pages or sitelinks are added.
