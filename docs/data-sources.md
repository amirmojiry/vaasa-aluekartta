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

## Points of interest

The application displays a committed static point-of-interest snapshot derived from OpenStreetMap at `public/data/vaasa-pois.geojson`. Normal browsing and GitHub Pages deployments do not depend on a live third-party POI API: the browser only downloads this repository asset.

Current categories are:

- sights: selected `tourism=*` values such as attractions, museums, galleries, viewpoints, zoos, aquariums, and theme parks;
- supermarkets: `shop=supermarket`;
- police: `amenity=police`;
- healthcare: selected `amenity=*` and `healthcare=*` values for hospitals, clinics, doctors, and pharmacies;
- libraries: `amenity=library`;
- universities: named `amenity=university` and `amenity=college` objects;
- schools: named `amenity=school` objects;
- day care: named `amenity=kindergarten` and `amenity=childcare` objects;
- train stations: named `railway=station` and `railway=halt` objects;
- airports: named `aeroway=aerodrome` objects;
- bus stops: named `highway=bus_stop`, `amenity=bus_station`, and `public_transport=platform` objects tagged `bus=yes`;
- restaurants: named `amenity=restaurant` objects;
- cafés: named `amenity=cafe` objects;
- parks and playgrounds: named `leisure=park` and `leisure=playground` objects;
- sports facilities: named sports centres, fitness centres, stadiums, swimming pools, and pitches;
- shopping: named convenience shops, malls, department stores, and marketplaces;
- banking: `amenity=bank` and `amenity=atm` objects, using brand or operator names when a name tag is absent;
- post services: post offices and parcel lockers, using brand or operator names when available;
- fuel and charging: fuel stations and EV charging stations, using brand or operator names when available.

The same citywide snapshot is available on the main map and on every major-area and minor-area detail map. Area pages initially focus on the selected boundary but load POIs from all Vaasa areas. Their POI controls allow each category to be shown or hidden independently, alongside controls for focusing the selected area or the currently visible citywide POIs.

The browser never queries Overpass directly. `npm run pois:check` validates the committed snapshot in CI, including stable IDs, coordinates, categories, OSM source identifiers, licence metadata, and category coverage.

For an explicit refresh, `npm run pois:update` first regenerates the Vaasa major-area boundaries and then runs `scripts/update-osm-pois.mjs`. The refresh script calculates a bounding box from those boundary polygons, queries public Overpass instances for matching OSM tags, and clips every returned point to the actual major-area polygons before writing a replacement snapshot. Refresh is intentionally separate from the normal deployment pipeline because public Overpass instances can be rate-limited, overloaded, or temporarily unavailable.

POI data is © OpenStreetMap contributors and is distributed under the Open Data Commons Open Database License (ODbL). The UI retains a visible OpenStreetMap attribution link. Names, opening hours, addresses, operators, websites, and categorisation reflect the tags available in the source snapshot and may be incomplete or outdated.

- OpenStreetMap copyright and licence: https://www.openstreetmap.org/copyright
- Overpass API documentation and public instances: https://wiki.openstreetmap.org/wiki/Overpass_API

## Address search

Address search is the one map feature that intentionally uses a live external OpenStreetMap service. A request to the public Nominatim Search API is sent only after the visitor explicitly submits the search form; the application does not implement autocomplete or background geocoding.

Searches are limited to Finland, biased toward the bounding box of the locally loaded Vaasa minor-area polygons, cached for the current page session, and rate-limited to at most one new Nominatim request per second. Up to five candidate coordinates are returned. The application then performs its own point-in-polygon check against the local minor-area boundaries and prefers a candidate that falls inside a mapped Vaasa minor area.

On the main map, an address inside Vaasa links directly to its matching minor-area page. On area pages, an address inside the current area is marked on that map; an address in another mapped Vaasa minor area produces a link to that area; and a geocoded address outside all mapped Vaasa minor-area polygons is reported as outside the mapped Vaasa area. This classification is a convenience feature based on the application's local boundary snapshot and must not be treated as an authoritative legal address or boundary determination.

- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- Nominatim Search API: https://nominatim.org/release-docs/latest/api/Search/
