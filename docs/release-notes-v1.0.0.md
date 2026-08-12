# Vaasa Aluekartta v1.0.0

The first stable release consolidates the current Vaasa area map into a shareable, tested static application.

Highlights:

- shareable major- and minor-area views, with the selected boundary level persisted in browser history and URLs;
- multilingual area details, statistics, political analysis, address search, and OpenStreetMap POIs;
- responsive controls with explicit touch-target and reduced-motion safeguards;
- Playwright browser coverage for URL restoration, boundary-level history, address search, and the primary mobile journey;
- production performance and map-data budgets enforced in CI and GitHub Pages deployment.

The remaining known boundary-data gap is the five unresolved Vähäkyrö pienalue geometries. Existing OSM-derived boundary coverage remains the project's working source for the current release.
