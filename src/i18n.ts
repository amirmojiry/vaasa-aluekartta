import { computed, ref } from 'vue'

import type { LocalizedAreaNames, LocalizedText } from '@/domain/areas'

export type AppLanguage = 'en' | 'fa'

const messages = {
  en: {
    appName: 'Vaasa Aluekartta',
    language: 'Language',
    english: 'English',
    persian: 'فارسی',
    primaryNavigation: 'Primary navigation',
    homeAria: 'Vaasa Aluekartta home',
    majorAreas: 'Major areas',
    minorAreas: 'Minor areas',
    interactiveMap: 'Interactive map',
    statisticalAreas: 'Vaasa statistical areas',
    boundaryLevel: 'Boundary level',
    areas: 'areas',
    clickForDetails: 'click for details',
    mapped: 'mapped',
    backToMap: 'Back to Vaasa map',
    majorArea: 'Major area',
    minorArea: 'Minor area',
    boundary: 'Boundary',
    reference: 'Reference',
    adminLevel: 'Admin level',
    osmRelation: 'OSM relation',
    outerWays: 'Outer ways',
    minorRelations: 'Minor-area relations',
    source: 'Source',
    parentMajorArea: 'Parent major area',
    loading: 'Loading…',
    notTagged: 'Not tagged',
    childAreas: 'Minor areas in this major area',
    noChildAreas: 'No mapped minor areas are currently available for this major area.',
    siblingAreas: 'Other minor areas in the same major area',
    noSiblingAreas: 'No other mapped sibling areas are currently available.',
    wikipedia: 'Wikipedia',
    finnishWikipedia: 'Finnish Wikipedia',
    persianWikipedia: 'Persian Wikipedia',
    wikidata: 'Wikidata',
    noWikipedia: 'No linked Finnish or Persian Wikipedia article was found.',
    technicalInfo: 'Technical information',
    wikidataDescription: 'Wikidata description',
    externalIdentifiers: 'External identifiers',
    noExternalIdentifiers: 'No external identifiers are listed in Wikidata.',
    loadingAreaFailed: 'Area loading failed',
  },
  fa: {
    appName: 'نقشه مناطق واسا',
    language: 'زبان',
    english: 'English',
    persian: 'فارسی',
    primaryNavigation: 'ناوبری اصلی',
    homeAria: 'صفحه اصلی نقشه مناطق واسا',
    majorAreas: 'مناطق بزرگ',
    minorAreas: 'مناطق کوچک',
    interactiveMap: 'نقشه تعاملی',
    statisticalAreas: 'مناطق آماری واسا',
    boundaryLevel: 'سطح منطقه',
    areas: 'منطقه',
    clickForDetails: 'برای جزئیات کلیک کنید',
    mapped: 'روی نقشه',
    backToMap: 'بازگشت به نقشه واسا',
    majorArea: 'منطقه بزرگ',
    minorArea: 'منطقه کوچک',
    boundary: 'مرز منطقه',
    reference: 'شناسه',
    adminLevel: 'سطح اداری',
    osmRelation: 'رابطه OSM',
    outerWays: 'تعداد مسیرهای مرزی',
    minorRelations: 'تعداد مناطق کوچک',
    source: 'منبع',
    parentMajorArea: 'منطقه بزرگ والد',
    loading: 'در حال بارگذاری…',
    notTagged: 'بدون برچسب',
    childAreas: 'مناطق کوچک این منطقه بزرگ',
    noChildAreas: 'در حال حاضر منطقه کوچک قابل نمایش برای این منطقه بزرگ موجود نیست.',
    siblingAreas: 'دیگر مناطق کوچک هم‌سطح در همین منطقه بزرگ',
    noSiblingAreas: 'در حال حاضر منطقه کوچک هم‌سطح دیگری برای نمایش وجود ندارد.',
    wikipedia: 'ویکی‌پدیا',
    finnishWikipedia: 'ویکی‌پدیای فنلاندی',
    persianWikipedia: 'ویکی‌پدیای فارسی',
    wikidata: 'ویکی‌داده',
    noWikipedia: 'مقاله مرتبطی در ویکی‌پدیای فنلاندی یا فارسی پیدا نشد.',
    technicalInfo: 'اطلاعات فنی',
    wikidataDescription: 'توضیح ویکی‌داده',
    externalIdentifiers: 'شناسه‌های بیرونی',
    noExternalIdentifiers: 'شناسه بیرونی دیگری در ویکی‌داده ثبت نشده است.',
    loadingAreaFailed: 'بارگذاری اطلاعات منطقه ناموفق بود',
  },
} as const

export type MessageKey = keyof (typeof messages)['en']

const initialLanguage: AppLanguage =
  new URLSearchParams(window.location.search).get('lang') === 'fa' ? 'fa' : 'en'
const language = ref<AppLanguage>(initialLanguage)

function applyDocumentLanguage(): void {
  document.documentElement.lang = language.value
  document.documentElement.dir = language.value === 'fa' ? 'rtl' : 'ltr'
}

applyDocumentLanguage()

export function localizeText(
  text: LocalizedText | undefined,
  fallback: string,
  targetLanguage: AppLanguage = language.value,
): string {
  if (!text) return fallback
  if (targetLanguage === 'fa') return text.fa || text.en || text.fi || fallback
  return text.en || text.fi || text.fa || fallback
}

export function localizeAreaName(
  names: LocalizedAreaNames | undefined,
  fallback: string,
  targetLanguage: AppLanguage = language.value,
): string {
  return localizeText(names, fallback, targetLanguage)
}

export function useI18n() {
  const isRtl = computed(() => language.value === 'fa')
  const t = (key: MessageKey): string => messages[language.value][key]

  const buildUrl = (params: Record<string, string | number | null | undefined> = {}): string => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
    }
    search.set('lang', language.value)
    return `${import.meta.env.BASE_URL}?${search.toString()}`
  }

  const languageUrl = (targetLanguage: AppLanguage): string => {
    const search = new URLSearchParams(window.location.search)
    search.set('lang', targetLanguage)
    return `${import.meta.env.BASE_URL}?${search.toString()}`
  }

  return { language, isRtl, t, buildUrl, languageUrl }
}
