<script setup lang="ts">
import { onMounted, ref } from 'vue'

import RelatedPostalCodes from '@/components/postal/RelatedPostalCodes.vue'
import { AREAS, AREA_BY_SLUG } from '@/config/areas'
import type { AreaBoundary, PienalueBoundary } from '@/domain/areas'
import { fetchAreaRecord, fetchPienalueBoundary } from '@/services/boundaryData'

const props = defineProps<{
  areaSlug?: string | null
  pienalueRelationId?: number | null
}>()

const boundary = ref<AreaBoundary | PienalueBoundary | null>(null)

onMounted(async () => {
  if (props.areaSlug) {
    const area = AREA_BY_SLUG.get(props.areaSlug)
    if (area) boundary.value = await fetchAreaRecord(area)
    return
  }
  if (props.pienalueRelationId) {
    boundary.value = await fetchPienalueBoundary(props.pienalueRelationId, AREAS)
  }
})
</script>

<template>
  <aside class="postal-area-link-shell">
    <RelatedPostalCodes :boundary="boundary" />
  </aside>
</template>
