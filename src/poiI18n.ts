import type { AppLanguage } from '@/i18n'

const messages = {
  en: {
    places: 'Places on the map',
    placesHint: 'Show or hide OpenStreetMap points of interest.',
    showAll: 'Show all',
    hideAll: 'Hide all',
    placesShown: 'Places shown',
    placeList: 'Accessible place list',
    openOnMap: 'Show on map',
    loading: 'Loading places…',
    unavailable: 'Place data is unavailable right now.',
    source: 'POI data: OpenStreetMap contributors',
    allAreasHint: 'All Vaasa POIs are loaded on this area map, not only places inside this area.',
    focusArea: 'Focus this area',
    showAllVaasa: 'Show all Vaasa places',
  },
  fi: {
    places: 'Paikat kartalla',
    placesHint: 'Näytä tai piilota OpenStreetMapin kiinnostavia kohteita.',
    showAll: 'Näytä kaikki',
    hideAll: 'Piilota kaikki',
    placesShown: 'Näkyvät paikat',
    placeList: 'Saavutettava paikkaluettelo',
    openOnMap: 'Näytä kartalla',
    loading: 'Paikkoja ladataan…',
    unavailable: 'Paikkatietoja ei juuri nyt ole saatavilla.',
    source: 'POI-aineisto: OpenStreetMapin tekijät',
    allAreasHint: 'Tällä aluekartalla ladataan kaikki Vaasan POI-kohteet, ei vain tämän alueen kohteita.',
    focusArea: 'Kohdista alueeseen',
    showAllVaasa: 'Näytä kaikki Vaasan paikat',
  },
  fa: {
    places: 'مکان‌های مهم روی نقشه',
    placesHint: 'نمایش یا پنهان‌کردن نقاط مهم OpenStreetMap.',
    showAll: 'نمایش همه',
    hideAll: 'پنهان کردن همه',
    placesShown: 'مکان‌های نمایش‌داده‌شده',
    placeList: 'فهرست دسترس‌پذیر مکان‌ها',
    openOnMap: 'نمایش روی نقشه',
    loading: 'در حال بارگذاری مکان‌ها…',
    unavailable: 'در حال حاضر داده مکان‌ها در دسترس نیست.',
    source: 'داده POI: مشارکت‌کنندگان OpenStreetMap',
    allAreasHint: 'همه POIهای واسا روی نقشه این منطقه بارگذاری می‌شوند، نه فقط مکان‌های داخل همین منطقه.',
    focusArea: 'تمرکز روی این منطقه',
    showAllVaasa: 'نمایش همه مکان‌های واسا',
  },
} as const

export type PoiMessageKey = keyof (typeof messages)['en']

export function poiText(language: AppLanguage, key: PoiMessageKey): string {
  return messages[language][key]
}
