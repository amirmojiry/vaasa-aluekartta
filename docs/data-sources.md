# Boundary data sources

## Municipal classification

The City of Vaasa states that the municipality uses a hierarchical three-level sub-area classification: major areas, statistical areas, and minor areas. Vaasa has 12 suuralueet and 60 pienalueet.

- City of Vaasa: https://www.vaasa.fi/en/living/neighbourhoods/
- City of Vaasa regional information: https://www.vaasa.fi/en/about-vaasa-and-the-vaasa-region/the-vaasa-region-in-numbers/kuntien-aluetieto-ja-saatavuus/

## Availability limitation

Statistics Finland explains that municipal sub-area boundaries are owned by each municipality and cannot be redistributed by Statistics Finland to third parties. Therefore this repository does not claim that its current boundary artwork is official raw municipal GeoJSON.

- Statistics Finland: https://stat.fi/fi/palvelut/tilastodatapalvelut/paikkatietoaineistot/tilastointialueet/kuntien-osa-alueet

## Current boundary artwork

The application currently uses two cartographic SVG maps by Wikimedia Commons user Tvinnari:

1. `Vaasa major districts map.svg`
   - 12 major districts
   - source page: https://commons.wikimedia.org/wiki/File:Vaasa_major_districts_map.svg
2. `Vaasa districts (statistical) with Vähäkyrö.svg`
   - 60 minor statistical districts including Vähäkyrö
   - source page: https://commons.wikimedia.org/wiki/File:Vaasa_districts_(statistical)_with_V%C3%A4h%C3%A4kyr%C3%B6.svg

Both files are licensed under CC BY-SA 4.0. The application displays attribution and links to the source pages.

## Transformation and accuracy

The SVG maps are displayed as image overlays inside an approximate Vaasa bounding box. No geometry is extracted, simplified, or represented as authoritative GeoJSON. Consequently:

- the overlay is suitable for orientation and hierarchy visualization;
- it must not be used for surveying, legal boundaries, address determination, or precise spatial analysis;
- individual polygons are not yet addressable as GeoJSON features;
- replacing the overlay with municipality-authorized vector data remains the preferred future upgrade.
