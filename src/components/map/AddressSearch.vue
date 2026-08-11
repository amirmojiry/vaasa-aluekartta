<script setup lang="ts">
import { computed, ref } from 'vue'

import { AREAS } from '@/config/areas'
import type { LocatedAddress } from '@/domain/addressSearch'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchPienalueBoundaries } from '@/services/boundaryData'
import { searchAndLocateAddress } from '@/services/addressSearch'

const props = defineProps<{
  mode: 'home' | 'major' | 'minor'
  currentMajorSlug?: string
  currentMinorRelationId?: number
}>()

const emit = defineEmits<{
  foundHere: [address: LocatedAddress]
}>()

const { buildUrl, language } = useI18n()
const query = ref('')
const searching = ref(false)
const status = ref('')
const targetHref = ref('')
const targetAreaName = ref('')

const messages = computed(() => {
  if (language.value === 'fa') {
    return {
      label: 'جستجوی آدرس',
      placeholder: 'مثلاً Kauppapuistikko 10',
      button: 'جستجو',
      searching: 'در حال جستجو…',
      notFound: 'آدرسی با این عبارت پیدا نشد.',
      outside: 'این آدرس در محدوده مناطق نقشه‌شده واسا نیست.',
      foundHere: 'آدرس در همین منطقه پیدا شد و روی نقشه نمایش داده شد.',
      foundElsewhere: 'این آدرس در منطقه دیگری از واسا است:',
      opening: 'منطقه پیدا شد؛ در حال باز کردن…',
      openArea: 'رفتن به منطقه',
      unavailable: 'جستجوی آدرس موقتاً در دسترس نیست.',
      source: 'جستجوی آدرس با OpenStreetMap Nominatim',
    }
  }
  if (language.value === 'fi') {
    return {
      label: 'Hae osoitetta',
      placeholder: 'esim. Kauppapuistikko 10',
      button: 'Hae',
      searching: 'Haetaan…',
      notFound: 'Osoitetta ei löytynyt tällä haulla.',
      outside: 'Osoite ei sijaitse Vaasan kartoitetuilla alueilla.',
      foundHere: 'Osoite löytyi tältä alueelta ja näytetään kartalla.',
      foundElsewhere: 'Osoite sijaitsee toisella Vaasan alueella:',
      opening: 'Alue löytyi; avataan…',
      openArea: 'Avaa alue',
      unavailable: 'Osoitehaku ei ole juuri nyt käytettävissä.',
      source: 'Osoitehaku: OpenStreetMap Nominatim',
    }
  }
  return {
    label: 'Search address',
    placeholder: 'e.g. Kauppapuistikko 10',
    button: 'Search',
    searching: 'Searching…',
    notFound: 'No address was found for that search.',
    outside: 'This address is outside the mapped Vaasa areas.',
    foundHere: 'The address is in this area and is now shown on the map.',
    foundElsewhere: 'This address is in another Vaasa area:',
    opening: 'Area found; opening…',
    openArea: 'Open area',
    unavailable: 'Address search is temporarily unavailable.',
    source: 'Address search: OpenStreetMap Nominatim',
  }
})

function addressHref(address: LocatedAddress): string {
  if (!address.area) return ''
  return buildUrl({
    pienalue: address.area.relationId,
    addressLat: address.lat,
    addressLon: address.lon,
    addressLabel: address.displayName,
  })
}

function isCurrentArea(address: LocatedAddress): boolean {
  if (!address.area) return false
  if (props.mode === 'major') return address.area.parentSlug === props.currentMajorSlug
  if (props.mode === 'minor') return address.area.relationId === props.currentMinorRelationId
  return false
}

async function submitSearch(): Promise<void> {
  const normalized = query.value.trim()
  if (!normalized || searching.value) return

  searching.value = true
  status.value = messages.value.searching
  targetHref.value = ''
  targetAreaName.value = ''

  try {
    const boundaries = await fetchPienalueBoundaries(AREAS)
    const result = await searchAndLocateAddress(normalized, language.value, boundaries)
    if (!result) {
      status.value = messages.value.notFound
      return
    }
    if (!result.area) {
      status.value = messages.value.outside
      return
    }

    const localizedAreaName = localizeAreaName(result.area.names, result.area.name, language.value)
    if (props.mode === 'home') {
      status.value = `${messages.value.opening} ${localizedAreaName}`
      window.location.href = addressHref(result)
      return
    }

    if (isCurrentArea(result)) {
      status.value = messages.value.foundHere
      emit('foundHere', result)
      return
    }

    targetAreaName.value = localizedAreaName
    targetHref.value = addressHref(result)
    status.value = messages.value.foundElsewhere
  } catch {
    status.value = messages.value.unavailable
  } finally {
    searching.value = false
  }
}
</script>

<template>
  <section class="address-search" :aria-label="messages.label">
    <form class="address-search__form" @submit.prevent="submitSearch">
      <label class="address-search__label" for="vaasa-address-search">{{ messages.label }}</label>
      <div class="address-search__controls">
        <!-- eslint-disable vue/html-self-closing -->
        <input
          id="vaasa-address-search"
          v-model="query"
          type="search"
          autocomplete="street-address"
          :placeholder="messages.placeholder"
        />
        <!-- eslint-enable vue/html-self-closing -->
        <button type="submit" :disabled="searching || !query.trim()">
          {{ searching ? messages.searching : messages.button }}
        </button>
      </div>
    </form>

    <div v-if="status" class="address-search__result" role="status">
      <span>{{ status }}</span>
      <a v-if="targetHref" :href="targetHref">
        {{ targetAreaName }} · {{ messages.openArea }}
      </a>
    </div>

    <a
      class="address-search__source"
      href="https://www.openstreetmap.org/copyright"
      target="_blank"
      rel="noreferrer"
    >
      {{ messages.source }}
    </a>
  </section>
</template>
