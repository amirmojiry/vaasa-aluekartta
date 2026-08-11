import L, { type FeatureGroup, type Map as LeafletMap } from 'leaflet'

import { poiCategoryDefinition } from '@/config/pois'
import type { PoiFeature } from '@/domain/pois'
import type { AppLanguage } from '@/i18n'
import { localizedPoiName } from '@/services/poiData'

function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function appendPopupText(container: HTMLElement, value: string | undefined): void {
  if (!value) return
  const row = document.createElement('span')
  row.textContent = value
  container.append(row)
}

function poiPopup(feature: PoiFeature, language: AppLanguage): HTMLElement {
  const container = document.createElement('div')
  container.className = 'poi-popup'

  const definition = poiCategoryDefinition(feature.properties.category)
  const name = document.createElement('strong')
  name.textContent = localizedPoiName(feature, language)
  container.append(name)

  appendPopupText(container, definition.labels[language])
  appendPopupText(container, feature.properties.address)
  appendPopupText(container, feature.properties.openingHours)
  appendPopupText(container, feature.properties.operator)

  const website = safeHttpUrl(feature.properties.website)
  if (website) {
    const link = document.createElement('a')
    link.href = website
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.textContent = 'Website'
    container.append(link)
  }

  const osmLink = document.createElement('a')
  osmLink.href = `https://www.openstreetmap.org/${feature.properties.osmType}/${feature.properties.osmId}`
  osmLink.target = '_blank'
  osmLink.rel = 'noreferrer'
  osmLink.textContent = 'OpenStreetMap'
  container.append(osmLink)

  return container
}

export function addPoiFeatureGroup(
  map: LeafletMap,
  features: PoiFeature[],
  language: AppLanguage,
): FeatureGroup {
  const group = L.featureGroup().addTo(map)

  for (const feature of features) {
    const definition = poiCategoryDefinition(feature.properties.category)
    const [longitude, latitude] = feature.geometry.coordinates
    const radius = feature.properties.category === 'bus-stops' ? 4.5 : 6.5
    const marker = L.circleMarker([latitude, longitude], {
      radius,
      color: '#fffdf8',
      weight: feature.properties.category === 'bus-stops' ? 1.5 : 2,
      opacity: 1,
      fillColor: definition.color,
      fillOpacity: 0.94,
    }).addTo(group)

    marker.bindTooltip(`${definition.labels[language]} · ${localizedPoiName(feature, language)}`, {
      sticky: true,
    })
    marker.bindPopup(poiPopup(feature, language))
  }

  return group
}
