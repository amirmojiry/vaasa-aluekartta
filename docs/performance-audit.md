# Performance audit

Baseline generated 2026-08-12 from a production build after refreshing the local OSM boundary snapshots. Budgets are conservative regression guards, not claims about network transfer size after HTTP compression.

| Measure           | Current build |    Budget |
| ----------------- | ------------: | --------: |
| JavaScript        |     346.8 KiB | 800.0 KiB |
| CSS               |      49.2 KiB | 250.0 KiB |
| Largest data file |     307.9 KiB |  5.00 MiB |
| All data files    |     554.0 KiB | 12.00 MiB |
| Full dist         |     968.8 KiB | 15.00 MiB |

Largest data file: `dist/data/vaasa-pois.geojson`.

The audit is run in CI and during GitHub Pages deployment via `npm run performance:check`. The deployment run is the authoritative map-data check because it regenerates current boundary snapshots before building.
