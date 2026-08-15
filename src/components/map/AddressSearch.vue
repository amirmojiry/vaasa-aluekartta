<script setup lang="ts">
import { computed, ref } from 'vue'

import { AREAS } from '@/config/areas'
import type { LocatedAddress } from '@/domain/addressSearch'
import { localizeAreaName, useI18n } from '@/i18n'
import { fetchPienalueBoundaries } from '@/services/boundaryData'
import { searchAndLocateAddress } from '@/services/addressSearch'
import { fetchPostalCodeCollection } from '@/services/postalData'
import { findPostalCodeForPoint } from '@/services/postalGeometry'

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
const targets = ref<Array<{ label: string; name: string; href: string }>>([])

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
      matches: 'این آدرس در این محدوده‌ها قرار دارد:',
      openArea: 'مشاهده',
      unavailable: 'جستجوی آدرس موقتاً در دسترس نیست.',
      source: 'جستجوی آدرس با OpenStreetMap Nominatim',
      major: 'منطقه بزرگ',
      minor: 'منطقه کوچک',
      postal: 'کد پستی',
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
      matches: 'Osoite kuuluu näihin alueisiin:',
      openArea: 'Avaa',
      unavailable: 'Osoitehaku ei ole juuri nyt käytettävissä.',
      source: 'Osoitehaku: OpenStreetMap Nominatim',
      major: 'Suuralue',
      minor: 'Pienalue',
      postal: 'Postinumeroalue',
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
    matches: 'This address belongs to these areas:',
    openArea: 'Open',
    unavailable: 'Address search is temporarily unavailable.',
    source: 'Address search: OpenStreetMap Nominatim',
    major: 'Major area',
    minor: 'Minor area',
    postal: 'Postal code area',
  }
})

function addressParams(address: LocatedAddress): Record<string, string | number> {
  return {
    addressLat: address.lat,
    addressLon: address.lon,
    addressLabel: address.displayName,
  }
}

function minorHref(address: LocatedAddress): string {
  if (!address.area) return ''
  return buildUrl({ pienalue: address.area.relationId, ...addressParams(address) })
}

function isCurrentArea(address: LocatedAddress): boolean {
  if (!address.area) return false
  if (props.mode === 'major') return address.area.parentSlug === props.currentMajorSlug
  if (props.mode === 'minor') return address.area.relationId === props.currentMinorRelationId
  return false
}

async function buildHomeTargets(address: LocatedAddress): Promise<void> {
  if (!address.area) return
  const postalCollection = await fetchPostalCodeCollection()
  const postal = findPostalCodeForPoint(address.lat, address.lon, postalCollection.areas)
  const major = AREAS.find((candidate) => candidate.slug === address.area?.parentSlug)
  const localizedMinor = localizeAreaName(address.area.names, address.area.name, language.value)
  const next: Array<{ label: string; name: string; href: string }> = []

  if (major) {
    next.push({
      label: messages.value.major,
      name: localizeAreaName(undefined, major.name, language.value),
      href: buildUrl({ area: major.slug, ...addressParams(address) }),
    })
  }

  next.push({
    label: messages.value.minor,
    name: localizedMinor,
    href: minorHref(address),
  })

  if (postal) {
    const postalName = language.value === 'fi' ? postal.nameFi : postal.nameSv || postal.nameFi
    next.push({
      label: messages.value.postal,
      name: `${postal.code} · ${postalName}`,
      href: buildUrl({ postal: postal.code, ...addressParams(address) }),
    })
  }

  targets.value = next
}

async function submitSearch(): Promise<void> {
  const normalized = query.value.trim()
  if (!normalized || searching.value) return

  searching.value = true
  status.value = messages.value.searching
  targets.value = []

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

    if (props.mode === 'home') {
      await buildHomeTargets(result)
      status.value = messages.value.matches
      return
    }

    if (isCurrentArea(result)) {
      status.value = messages.value.foundHere
      emit('foundHere', result)
      return
    }

    const localizedAreaName = localizeAreaName(result.area.names, result.area.name, language.value)
    targets.value = [
      { label: messages.value.minor, name: localizedAreaName, href: minorHref(result) },
    ]
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
        <!-- prettier-ignore -->
        <input
          id="vaasa-address-search"
          v-model="query"
          type="search"
          autocomplete="street-address"
          :placeholder="messages.placeholder"
        >
        <button type="submit" :disabled="searching || !query.trim()">
          {{ searching ? messages.searching : messages.button }}
        </button>
      </div>
    </form>

    <div v-if="status" class="address-search__result" role="status">
      <span>{{ status }}</span>
      <div v-if="targets.length" class="address-search__targets">
        <a v-for="target in targets" :key="`${target.label}:${target.href}`" :href="target.href">
          <strong>{{ target.label }}</strong>
          <span>{{ target.name }}</span>
          <small>{{ messages.openArea }}</small>
        </a>
      </div>
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
