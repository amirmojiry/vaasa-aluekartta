<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type FeatureGroup, type Map as LeafletMap } from 'leaflet'

import { AREAS } from '@/config/areas'
import { INITIAL_ZOOM, TILE_LAYER, VAASA_CENTER } from '@/config/map'
import type { AreaLevel } from '@/domain/areas'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchAreaRecords, fetchPienalueBoundaries } from '@/services/boundaryData'

export interface ThematicMapItem {
  name: string
  value: number
}

const props = defineProps<{
  level: AreaLevel
  items: ThematicMapItem[]
  color: string
  formatValue: (value: number) => string
}>()

const { buildUrl, language } = useI18n()
const mapElement = ref<HTMLElement | null>(null)
const itemByName = computed(() => new Map(props.items.map((item) => [item.name, item])))
let map: LeafletMap | null = null
let areaGroup: FeatureGroup | null = null
let renderToken = 0

function fillOpacity(value: number): number {
  const values = props.items.map((item) => item.value)
  if (!values.length) return 0.12
  const min = Math.min(...values)
  const max = Math.max(...values)
  const normalized = max === min ? 0.5 : (value - min) / (max - min)
  return 0.16 + normalized * 0.64
}

function fitBounds(): void {
  if (!map || !areaGroup) return
  const bounds = areaGroup.getBounds()
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [22, 22] })
}

async function render(): Promise<void> {
  if (!map || !areaGroup) return
  const token = ++renderToken
  areaGroup.clearLayers()

  if (props.level === 'suuralue') {
    const records = await fetchAreaRecords(AREAS)
    if (token !== renderToken || !areaGroup) return

    for (const area of AREAS) {
      const boundary = records.get(area.slug)
      if (!boundary) continue
      const item = itemByName.value.get(area.name)
      const polygon = L.polygon(boundary.rings, {
        color: item ? props.color : '#89938f',
        weight: item ? 3 : 1.5,
        opacity: item ? 0.95 : 0.55,
        fillColor: item ? props.color : '#b7bfbc',
        fillOpacity: item ? fillOpacity(item.value) : 0.06,
      }).addTo(areaGroup)
      const localizedName = localizeAreaName(boundary.names, area.name, language.value)
      polygon.bindTooltip(
        item ? `${localizedName} · ${props.formatValue(item.value)}` : localizedName,
        { sticky: true },
      )
      polygon.on('click', () => {
        window.location.href = buildUrl({ area: area.slug })
      })
    }
  } else {
    const boundaries = await fetchPienalueBoundaries(AREAS)
    if (token !== renderToken || !areaGroup) return

    for (const boundary of boundaries) {
      const item = itemByName.value.get(boundary.name)
      const polygon = L.polygon(boundary.rings, {
        color: item ? props.color : '#89938f',
        weight: item ? 2 : 1,
        opacity: item ? 0.95 : 0.5,
        fillColor: item ? props.color : '#b7bfbc',
        fillOpacity: item ? fillOpacity(item.value) : 0.045,
      }).addTo(areaGroup)
      const localizedName = localizeAreaName(boundary.names, boundary.name, language.value)
      polygon.bindTooltip(
        item ? `${localizedName} · ${props.formatValue(item.value)}` : localizedName,
        { sticky: true },
      )
      polygon.on('click', () => {
        window.location.href = buildUrl({ pienalue: boundary.relationId })
      })
    }
  }

  fitBounds()
}

onMounted(() => {
  if (!mapElement.value) return
  map = L.map(mapElement.value, { zoomControl: true }).setView(VAASA_CENTER, INITIAL_ZOOM)
  L.tileLayer(TILE_LAYER.url, TILE_LAYER.options).addTo(map)
  areaGroup = L.featureGroup().addTo(map)
  void render()
})

watch(
  () => [props.level, props.items, language.value] as const,
  () => void render(),
  { deep: true },
)

onBeforeUnmount(() => {
  renderToken += 1
  map?.remove()
  map = null
  areaGroup = null
})
</script>

<template>
  <div ref="mapElement" class="thematic-map" />
</template>

<style scoped>
.thematic-map {
  width: 100%;
  min-height: clamp(24rem, 60vh, 42rem);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  overflow: hidden;
  background: #e8eeeb;
}
</style>
