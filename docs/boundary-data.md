# Vaasa boundary data

## Required datasets

Milestone 2 requires two WGS84 GeoJSON `FeatureCollection` files:

- `public/data/suuralueet.geojson` — 12 major statistical areas
- `public/data/pienalueet.geojson` — 60 statistical subareas

Each feature must have these properties:

```json
{
  "id": "stable-source-id",
  "level": "suuralue or pienalue",
  "nameFi": "Official Finnish name",
  "nameSv": "Official Swedish name when available",
  "parentId": "required for pienalue"
}
```

## Verified structure sources

The City of Vaasa describes the city as 12 suuralueet divided into 60 pienalueet. The official Vaasa map service is the preferred geometry authority:

- City map service: https://kartta.vaasa.fi/IMS
- City information page: https://www.vaasa.fi/en/about-vaasa-and-the-vaasa-region/developing-vaasa/statistics-and-research/

## Licensed cartographic reference

Wikimedia Commons provides cartographic SVG references based on Vaasa source maps. These are useful for visual comparison, but they are not georeferenced GIS datasets and must not be converted to GeoJSON by guessing map bounds.

- Statistical districts including Vähäkyrö: https://commons.wikimedia.org/wiki/File:Vaasa_districts_(statistical)_with_V%C3%A4h%C3%A4kyr%C3%B6.svg
- Major districts: https://commons.wikimedia.org/wiki/File:Vaasa_major_districts_map.svg
- Author: Tvinnari
- Licence: CC BY-SA 4.0

## Current blocker

No publicly documented City of Vaasa GeoJSON, WFS, or ArcGIS FeatureServer endpoint for these statistical boundaries has been identified. The application must not ship manually drawn or approximately georeferenced boundaries.

Milestone 2 can be completed when one of these is available:

1. an official downloadable GIS dataset;
2. a documented public WFS/FeatureServer layer;
3. written permission and a reproducible conversion from an authoritative source file.

## Acceptance checks

Before committing geometry:

- coordinates are longitude/latitude in EPSG:4326;
- there are exactly 12 unique suuralue features;
- there are exactly 60 unique pienalue features;
- every pienalue has a valid suuralue `parentId`;
- all geometries are Polygon or MultiPolygon;
- every feature has an official or source-preserved stable ID;
- source URL, licence, retrieval date, and transformations are recorded;
- boundaries visually match the Vaasa reference maps without visible gaps caused by processing.
