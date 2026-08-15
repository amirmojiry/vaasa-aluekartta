<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { AreaBoundary, PienalueBoundary } from '@/domain/areas'
import type { PostalCodeArea } from '@/domain/postal'
import { localeForLanguage, useI18n } from '@/i18n'
import { fetchPostalCodeCollection } from '@/services/postalData'
import { postalIntersectsBoundary } from '@/services/postalGeometry'

const props = defineProps<{
  boundary: AreaBoundary | PienalueBoundary | null
}>()

const { buildUrl, language } = useI18n()
const postalAreas = ref<PostalCodeArea[]>([])
const failed = ref(false)

const related = computed(() => {
  if (!props.boundary) return []
  return postalAreas.value.filter((postal) => postalIntersectsBoundary(postal, props.boundary!))
})

const title = computed(() => {
  if (language.value === 'fa') return 'کدهای پستی مرتبط'
  if (language.value === 'fi') return 'Alueeseen liittyvät postinumeroalueet'
  return 'Related postal code areas'
})

const note = computed(() => {
  if (language.value === 'fa')
    return 'این ارتباط بر اساس تقاطع هندسی مرزهاست؛ کد پستی و منطقه شهرداری یک تقسیم‌بندی واحد نیستند.'
  if (language.value === 'fi')
    return 'Yhteys perustuu aluegeometrioiden leikkaukseen; postinumeroalue ja kunnan osa-alue eivät ole sama aluejako.'
  return 'Links are based on polygon intersection; postal codes and municipal sub-areas are different geographic systems.'
})

const numberFormatter = computed(() =>
  new Intl.NumberFormat(localeForLanguage(language.value), { useGrouping: false }),
)

function postalName(area: PostalCodeArea): string {
  return language.value === 'fi' ? area.nameFi : area.nameSv || area.nameFi
}

onMounted(async () => {
  try {
    postalAreas.value = (await fetchPostalCodeCollection()).areas
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <section v-if="boundary" class="info-panel related-panel postal-related-panel">
    <p class="eyebrow">Paavo · Statistics Finland</p>
    <h2>{{ title }}</h2>
    <ul v-if="related.length" class="postal-related-list">
      <li v-for="postal in related" :key="postal.code">
        <a :href="buildUrl({ postal: postal.code })">
          {{ numberFormatter.format(Number(postal.code)) }} · {{ postalName(postal) }}
        </a>
      </li>
    </ul>
    <p v-else-if="failed">Paavo data unavailable.</p>
    <p v-else class="postal-related-empty">No intersecting postal code area was found.</p>
    <small class="postal-related-note">{{ note }}</small>
  </section>
</template>
