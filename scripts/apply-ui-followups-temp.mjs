import fs from 'node:fs'

function replaceOnce(path, oldText, newText, label) {
  const text = fs.readFileSync(path, 'utf8')
  const count = text.split(oldText).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  fs.writeFileSync(path, text.replace(oldText, newText))
}

const election = 'src/components/areas/ElectionLineChart.vue'
replaceOnce(
  election,
  "import { partyColor, partyWikipediaLinks } from '@/services/electionStatistics'",
  "import { partyColor } from '@/services/electionStatistics'",
  'remove wikipedia import',
)
replaceOnce(
  election,
  "const selectedLinks = computed(() =>\n  props.selectedParty ? partyWikipediaLinks(props.selectedParty) : {},\n)\n",
  '',
  'remove selected wikipedia links',
)
replaceOnce(
  election,
  `        <a v-if="selectedLinks.fa" :href="selectedLinks.fa" target="_blank" rel="noreferrer">
          {{ t('persianWikipedia') }}
        </a>
        <span v-if="selectedLinks.fa" aria-hidden="true">|</span>
        <a :href="buildUrl({ party: selectedParty })">{{ dedicatedPageLabel }}</a>
        <span v-if="selectedLinks.fi" aria-hidden="true">|</span>
        <a v-if="selectedLinks.fi" :href="selectedLinks.fi" target="_blank" rel="noreferrer">
          {{ t('finnishWikipedia') }}
        </a>`,
  `        <a :href="buildUrl({ party: selectedParty })">{{ dedicatedPageLabel }}</a>`,
  'remove wikipedia links from election charts',
)

const postal = 'src/components/postal/PostalCodeDetail.vue'
replaceOnce(
  postal,
  `const activePoiCategories = ref<PoiCategory[]>([])
const poiLoading = ref(true)`,
  `const activePoiCategories = ref<PoiCategory[]>([])
const poiScope = ref<'postal' | 'vaasa'>('postal')
const poiLoading = ref(true)`,
  'add postal POI scope',
)
replaceOnce(
  postal,
  `const visiblePoiFeatures = computed(() =>
  postalPoiFeatures.value.filter((feature) =>
    activePoiCategories.value.includes(feature.properties.category),
  ),
)`,
  `const scopedPoiFeatures = computed(() =>
  poiScope.value === 'postal' ? postalPoiFeatures.value : allPoiFeatures.value,
)
const visiblePoiFeatures = computed(() =>
  scopedPoiFeatures.value.filter((feature) =>
    activePoiCategories.value.includes(feature.properties.category),
  ),
)`,
  'scope visible postal POIs',
)
replaceOnce(
  postal,
  "  return `${poiLabel('placesShown')}: ${numberFormatter.value.format(visiblePoiFeatures.value.length)}/${numberFormatter.value.format(postalPoiFeatures.value.length)}`",
  "  return `${poiLabel('placesShown')}: ${numberFormatter.value.format(visiblePoiFeatures.value.length)}/${numberFormatter.value.format(scopedPoiFeatures.value.length)}`",
  'scope POI status count',
)
replaceOnce(
  postal,
  `function poiCategoryCount(category: PoiCategory): number {
  return postalPoiFeatures.value.filter((feature) => feature.properties.category === category)
    .length
}`,
  `function poiCategoryCount(category: PoiCategory): number {
  return scopedPoiFeatures.value.filter((feature) => feature.properties.category === category).length
}`,
  'scope POI category counts',
)
replaceOnce(
  postal,
  `function hideAllPois(): void {
  activePoiCategories.value = []
  renderPoiLayers()
}

function fitAreaOnMap(): void {`,
  `function hideAllPois(): void {
  activePoiCategories.value = []
  renderPoiLayers()
}

function setPoiScope(scope: 'postal' | 'vaasa'): void {
  poiScope.value = scope
  renderPoiLayers()
}

function fitAreaOnMap(): void {`,
  'add POI scope setter',
)
replaceOnce(
  postal,
  `                <button
                  type="button"
                  :disabled="poiLoading || poiFailed || visiblePoiFeatures.length === 0"
                  @click="fitAllPoisOnMap"
                >
                  {{ poiLabel('showAllPostal') }}
                </button>
                <button type="button" @click="showAllPois">{{ poiLabel('showAll') }}</button>`,
  `                <button
                  type="button"
                  :disabled="poiLoading || poiFailed || visiblePoiFeatures.length === 0"
                  @click="fitAllPoisOnMap"
                >
                  {{ poiLabel('fitVisible') }}
                </button>
                <button
                  type="button"
                  :class="{ 'is-active': poiScope === 'postal' }"
                  :aria-pressed="poiScope === 'postal'"
                  @click="setPoiScope('postal')"
                >
                  {{ poiLabel('showPostalOnly') }}
                </button>
                <button
                  type="button"
                  :class="{ 'is-active': poiScope === 'vaasa' }"
                  :aria-pressed="poiScope === 'vaasa'"
                  @click="setPoiScope('vaasa')"
                >
                  {{ poiLabel('showAllVaasa') }}
                </button>
                <button type="button" @click="showAllPois">{{ poiLabel('showAll') }}</button>`,
  'add postal and Vaasa scope controls',
)

const i18n = 'src/poiI18n.ts'
replaceOnce(
  i18n,
  `    postalHint: 'Only OpenStreetMap places inside this postal code area are included.',
    focusArea: 'Focus this area',
    showAllVaasa: 'Show all Vaasa places',
    showAllPostal: 'Fit postal-area places',`,
  `    postalHint:
      'Start with places inside this postal code area, or switch to all Vaasa OpenStreetMap places.',
    focusArea: 'Focus this area',
    fitVisible: 'Fit visible places',
    showPostalOnly: 'Show postal-area places',
    showAllVaasa: 'Show all Vaasa places',
    showAllPostal: 'Fit postal-area places',`,
  'English POI labels',
)
replaceOnce(
  i18n,
  `    postalHint: 'Mukana ovat vain tämän postinumeroalueen sisällä olevat OpenStreetMap-kohteet.',
    focusArea: 'Kohdista alueeseen',
    showAllVaasa: 'Näytä kaikki Vaasan paikat',
    showAllPostal: 'Sovita postinumeroalueen paikat',`,
  `    postalHint:
      'Aloita tämän postinumeroalueen paikoista tai vaihda näyttämään kaikki Vaasan OpenStreetMap-kohteet.',
    focusArea: 'Kohdista alueeseen',
    fitVisible: 'Sovita näkyvät paikat',
    showPostalOnly: 'Näytä postinumeroalueen paikat',
    showAllVaasa: 'Näytä kaikki Vaasan paikat',
    showAllPostal: 'Sovita postinumeroalueen paikat',`,
  'Finnish POI labels',
)
replaceOnce(
  i18n,
  `    postalHint: 'فقط مکان‌های OpenStreetMap داخل همین منطقه کد پستی در نظر گرفته می‌شوند.',
    focusArea: 'تمرکز روی این منطقه',
    showAllVaasa: 'نمایش همه مکان‌های واسا',
    showAllPostal: 'نمایش محدوده همه مکان‌های کد پستی',`,
  `    postalHint:
      'ابتدا مکان‌های داخل همین کد پستی نمایش داده می‌شوند؛ در صورت نیاز می‌توانید همه مکان‌های واسا را نمایش دهید.',
    focusArea: 'تمرکز روی این منطقه',
    fitVisible: 'نمایش محدوده مکان‌های قابل مشاهده',
    showPostalOnly: 'نمایش مکان‌های همین کد پستی',
    showAllVaasa: 'نمایش همه مکان‌های واسا',
    showAllPostal: 'نمایش محدوده همه مکان‌های کد پستی',`,
  'Persian POI labels',
)

const styles = 'src/styles/pois.css'
replaceOnce(
  styles,
  `.poi-control__category.is-active {
  border-color: var(--green);
  background: #e8f1ed;
  box-shadow: inset 0 0 0 1px rgba(23, 100, 93, 0.12);
}`,
  `.poi-control__category.is-active,
.poi-control__actions button.is-active {
  border-color: var(--green);
  background: #e8f1ed;
  box-shadow: inset 0 0 0 1px rgba(23, 100, 93, 0.12);
}`,
  'style active POI scope',
)
