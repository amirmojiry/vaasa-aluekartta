import fs from 'node:fs'

function replaceOnce(path, oldValue, newValue, label) {
  const text = fs.readFileSync(path, 'utf8')
  const count = text.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  fs.writeFileSync(path, text.replace(oldValue, newValue))
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
  `const selectedLinks = computed(() =>\n  props.selectedParty ? partyWikipediaLinks(props.selectedParty) : {},\n)\n`,
  '',
  'remove selected wikipedia links',
)
replaceOnce(
  election,
  `        <a v-if="selectedLinks.fa" :href="selectedLinks.fa" target="_blank" rel="noreferrer">\n          {{ t('persianWikipedia') }}\n        </a>\n        <span v-if="selectedLinks.fa" aria-hidden="true">|</span>\n        <a :href="buildUrl({ party: selectedParty })">{{ dedicatedPageLabel }}</a>\n        <span v-if="selectedLinks.fi" aria-hidden="true">|</span>\n        <a v-if="selectedLinks.fi" :href="selectedLinks.fi" target="_blank" rel="noreferrer">\n          {{ t('finnishWikipedia') }}\n        </a>`,
  `        <a :href="buildUrl({ party: selectedParty })">{{ dedicatedPageLabel }}</a>`,
  'remove wikipedia links from election charts',
)

const postal = 'src/components/postal/PostalCodeDetail.vue'
replaceOnce(
  postal,
  `const activePoiCategories = ref<PoiCategory[]>([])\nconst poiLoading = ref(true)`,
  `const activePoiCategories = ref<PoiCategory[]>([])\nconst poiScope = ref<'postal' | 'vaasa'>('postal')\nconst poiLoading = ref(true)`,
  'add postal POI scope',
)
replaceOnce(
  postal,
  `const visiblePoiFeatures = computed(() =>\n  postalPoiFeatures.value.filter((feature) =>\n    activePoiCategories.value.includes(feature.properties.category),\n  ),\n)`,
  `const scopedPoiFeatures = computed(() =>\n  poiScope.value === 'postal' ? postalPoiFeatures.value : allPoiFeatures.value,\n)\nconst visiblePoiFeatures = computed(() =>\n  scopedPoiFeatures.value.filter((feature) =>\n    activePoiCategories.value.includes(feature.properties.category),\n  ),\n)`,
  'scope visible postal POIs',
)
replaceOnce(
  postal,
  `  return \`${'${poiLabel(\'placesShown\')}'}: ${'${numberFormatter.value.format(visiblePoiFeatures.value.length)}'}/${'${numberFormatter.value.format(postalPoiFeatures.value.length)}'}\``,
  `  return \`${'${poiLabel(\'placesShown\')}'}: ${'${numberFormatter.value.format(visiblePoiFeatures.value.length)}'}/${'${numberFormatter.value.format(scopedPoiFeatures.value.length)}'}\``,
  'scope POI status count',
)
replaceOnce(
  postal,
  `function poiCategoryCount(category: PoiCategory): number {\n  return postalPoiFeatures.value.filter((feature) => feature.properties.category === category)\n    .length\n}`,
  `function poiCategoryCount(category: PoiCategory): number {\n  return scopedPoiFeatures.value.filter((feature) => feature.properties.category === category).length\n}`,
  'scope POI category counts',
)
replaceOnce(
  postal,
  `function hideAllPois(): void {\n  activePoiCategories.value = []\n  renderPoiLayers()\n}\n\nfunction fitAreaOnMap(): void {`,
  `function hideAllPois(): void {\n  activePoiCategories.value = []\n  renderPoiLayers()\n}\n\nfunction setPoiScope(scope: 'postal' | 'vaasa'): void {\n  poiScope.value = scope\n  renderPoiLayers()\n}\n\nfunction fitAreaOnMap(): void {`,
  'add POI scope setter',
)
replaceOnce(
  postal,
  `                <button\n                  type="button"\n                  :disabled="poiLoading || poiFailed || visiblePoiFeatures.length === 0"\n                  @click="fitAllPoisOnMap"\n                >\n                  {{ poiLabel('showAllPostal') }}\n                </button>\n                <button type="button" @click="showAllPois">{{ poiLabel('showAll') }}</button>`,
  `                <button\n                  type="button"\n                  :disabled="poiLoading || poiFailed || visiblePoiFeatures.length === 0"\n                  @click="fitAllPoisOnMap"\n                >\n                  {{ poiLabel('fitVisible') }}\n                </button>\n                <button\n                  type="button"\n                  :class="{ 'is-active': poiScope === 'postal' }"\n                  :aria-pressed="poiScope === 'postal'"\n                  @click="setPoiScope('postal')"\n                >\n                  {{ poiLabel('showPostalOnly') }}\n                </button>\n                <button\n                  type="button"\n                  :class="{ 'is-active': poiScope === 'vaasa' }"\n                  :aria-pressed="poiScope === 'vaasa'"\n                  @click="setPoiScope('vaasa')"\n                >\n                  {{ poiLabel('showAllVaasa') }}\n                </button>\n                <button type="button" @click="showAllPois">{{ poiLabel('showAll') }}</button>`,
  'add postal and Vaasa scope controls',
)

const i18n = 'src/poiI18n.ts'
replaceOnce(
  i18n,
  `    postalHint: 'Only OpenStreetMap places inside this postal code area are included.',\n    focusArea: 'Focus this area',\n    showAllVaasa: 'Show all Vaasa places',\n    showAllPostal: 'Fit postal-area places',`,
  `    postalHint:\n      'Start with places inside this postal code area, or switch to all Vaasa OpenStreetMap places.',\n    focusArea: 'Focus this area',\n    fitVisible: 'Fit visible places',\n    showPostalOnly: 'Show postal-area places',\n    showAllVaasa: 'Show all Vaasa places',\n    showAllPostal: 'Fit postal-area places',`,
  'English POI scope labels',
)
replaceOnce(
  i18n,
  `    postalHint: 'Mukana ovat vain tämän postinumeroalueen sisällä olevat OpenStreetMap-kohteet.',\n    focusArea: 'Kohdista alueeseen',\n    showAllVaasa: 'Näytä kaikki Vaasan paikat',\n    showAllPostal: 'Sovita postinumeroalueen paikat',`,
  `    postalHint:\n      'Aloita tämän postinumeroalueen paikoista tai vaihda näyttämään kaikki Vaasan OpenStreetMap-kohteet.',\n    focusArea: 'Kohdista alueeseen',\n    fitVisible: 'Sovita näkyvät paikat',\n    showPostalOnly: 'Näytä postinumeroalueen paikat',\n    showAllVaasa: 'Näytä kaikki Vaasan paikat',\n    showAllPostal: 'Sovita postinumeroalueen paikat',`,
  'Finnish POI scope labels',
)
replaceOnce(
  i18n,
  `    postalHint: 'فقط مکان‌های OpenStreetMap داخل همین منطقه کد پستی در نظر گرفته می‌شوند.',\n    focusArea: 'تمرکز روی این منطقه',\n    showAllVaasa: 'نمایش همه مکان‌های واسا',\n    showAllPostal: 'نمایش محدوده همه مکان‌های کد پستی',`,
  `    postalHint:\n      'ابتدا مکان‌های داخل همین کد پستی نمایش داده می‌شوند؛ در صورت نیاز می‌توانید همه مکان‌های واسا را نمایش دهید.',\n    focusArea: 'تمرکز روی این منطقه',\n    fitVisible: 'نمایش محدوده مکان‌های قابل مشاهده',\n    showPostalOnly: 'نمایش مکان‌های همین کد پستی',\n    showAllVaasa: 'نمایش همه مکان‌های واسا',\n    showAllPostal: 'نمایش محدوده همه مکان‌های کد پستی',`,
  'Persian POI scope labels',
)

const styles = 'src/styles/pois.css'
replaceOnce(
  styles,
  `.poi-control__category.is-active {\n  border-color: var(--green);\n  background: #e8f1ed;\n  box-shadow: inset 0 0 0 1px rgba(23, 100, 93, 0.12);\n}`,
  `.poi-control__category.is-active,\n.poi-control__actions button.is-active {\n  border-color: var(--green);\n  background: #e8f1ed;\n  box-shadow: inset 0 0 0 1px rgba(23, 100, 93, 0.12);\n}`,
  'style active POI scope',
)
