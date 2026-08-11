import L, { type CircleMarker, type Map } from 'leaflet'

import type { GeocodedAddress } from '@/domain/addressSearch'

export function addAddressMarker(map: Map, address: GeocodedAddress): CircleMarker {
  const marker = L.circleMarker([address.lat, address.lon], {
    radius: 9,
    color: '#fffdf8',
    weight: 3,
    opacity: 1,
    fillColor: '#b53d32',
    fillOpacity: 1,
  }).addTo(map)

  const popup = document.createElement('div')
  const label = document.createElement('strong')
  label.textContent = address.displayName
  popup.append(label)
  marker.bindPopup(popup).openPopup()
  marker.bringToFront()
  map.setView([address.lat, address.lon], Math.max(map.getZoom(), 16))
  return marker
}

export function readAddressSearchParams(): GeocodedAddress | null {
  const params = new URLSearchParams(window.location.search)
  const lat = Number(params.get('addressLat'))
  const lon = Number(params.get('addressLon'))
  const displayName = params.get('addressLabel')?.trim() ?? ''
  if (
    !displayName ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null
  }

  return {
    query: displayName,
    displayName,
    lat,
    lon,
  }
}
