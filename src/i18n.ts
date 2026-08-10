import { computed, ref } from 'vue'

import type { LocalizedAreaNames } from '@/domain/areas'

export type AppLanguage = 'en' | 'fa'

const messages = {
  en: {
    appName: 'Vaasa Aluekartta',
    language: 'Language',
    english: 'English',
    persian: 'فارسی',
    primaryNavigation: 'Primary navigation',
    homeAria: 'Vaasa Aluekartta home',
    exploreEyebrow: 'Explore Vaasa by area',
    heroTitle: "A clearer way to understand Vaasa's neighbourhood structure.",
    heroLead:
      "Browse the city's major and minor statistical areas on an accessible, source-attributed map.",
    openData: 'Open data',
    mobileFriendly: 'Mobile friendly',
    noTracking: 'No tracking',
    currentMilestone: 'Current milestone',
    localSnapshots: 'Local boundary snapshots',
    localSnapshotsDescription:
      'Available OSM boundaries are packaged as GeoJSON and served directly by this GitHub Pages site.',
    boundaryDelivery: 'Boundary delivery',
    staticGeojson: 'Static GeoJSON',
    boundaryDeliveryDescription:
      'OpenStreetMap is used as the source of the boundary snapshot, but visitors do not query a boundary API. The deployed site serves the generated GeoJSON files locally.',
    majorAreas: 'Major areas',
    minorAreas: 'Minor areas',
    refreshModel: 'Refresh model',
    areaDetails: 'Area details',
    majorCoverage: '12 of 12 clickable polygons in the local major-area GeoJSON snapshot',
    minorCoverage:
      '55 of 60 clickable polygons are available in the current OSM hierarchy; the five Vähäkyrö minor-area boundaries remain unresolved',
    refreshDescription: 'Boundary data is regenerated from OSM when the GitHub Pages snapshot is built',
    areaDetailsDescription:
      'Click any mapped polygon to open its dedicated page using the same local snapshot',
    footer: 'Built as an open-source, static website for GitHub Pages.',
    interactiveMap: 'Interactive map',
    statisticalAreas: 'Vaasa statistical areas',
    boundaryLevel: 'Boundary level',
    areas: 'areas',
    clickForDetails: 'click for details',
    mapped: 'mapped',
    mapBoundaryNote:
      'Boundary geometry is served as static GeoJSON from this GitHub Pages site. OpenStreetMap is contacted only when the deployment snapshot is regenerated; visitors do not query boundary APIs.',
    backToMap: 'Back to Vaasa map',
    majorArea: 'Major area',
    minorArea: 'Minor area',
    localBoundaryIntro:
      'This page renders a locally hosted GeoJSON snapshot generated from OpenStreetMap relation',
    boundary: 'Boundary',
    onOpenStreetMap: 'on OpenStreetMap',
    osmMetadata: 'OSM metadata',
    reference: 'Reference',
    adminLevel: 'Admin level',
    osmRelation: 'OSM relation',
    outerWays: 'Outer ways',
    minorRelations: 'Minor-area relations',
    source: 'Source',
    parentMajorArea: 'Parent major area',
    localSnapshot: 'Local GeoJSON snapshot served by this site',
    loading: 'Loading…',
    notTagged: 'Not tagged',
    childAreas: 'Minor areas in this major area',
    noChildAreas:
      'No mapped minor-area boundaries are currently available for this major area in the OSM snapshot.',
    siblingAreas: 'Other minor areas in the same major area',
    noSiblingAreas: 'No other mapped sibling areas are available in the current snapshot.',
    wikipedia: 'Wikipedia',
    finnishWikipedia: 'Finnish Wikipedia',
    persianWikipedia: 'Persian Wikipedia',
    wikidata: 'Wikidata',
    noWikipedia: 'No linked Finnish or Persian Wikipedia article was found in the current metadata.',
    localGeojsonLoaded: 'Local GeoJSON boundary loaded.',
    localMinorGeojsonLoaded: 'Local GeoJSON minor-area boundary loaded.',
    boundaryLoadingFailed: 'Boundary loading failed',
  },
  fa: {
    appName: 'نقشه مناطق واسا',
    language: 'زبان',
    english: 'English',
    persian: 'فارسی',
    primaryNavigation: 'ناوبری اصلی',
    homeAria: 'صفحه اصلی نقشه مناطق واسا',
    exploreEyebrow: 'کاوش واسا بر اساس منطقه',
    heroTitle: 'راهی روشن‌تر برای شناخت ساختار محله‌ها و مناطق واسا.',
    heroLead: 'مناطق بزرگ و کوچک آماری واسا را روی نقشه‌ای تعاملی و مستند به منبع بررسی کنید.',
    openData: 'داده باز',
    mobileFriendly: 'مناسب موبایل',
    noTracking: 'بدون رهگیری',
    currentMilestone: 'وضعیت فعلی',
    localSnapshots: 'مرزهای محلی GeoJSON',
    localSnapshotsDescription:
      'مرزهای موجود در OSM به صورت GeoJSON تولید شده و مستقیماً از همین سایت GitHub Pages ارائه می‌شوند.',
    boundaryDelivery: 'ارائه مرزها',
    staticGeojson: 'GeoJSON ثابت',
    boundaryDeliveryDescription:
      'OpenStreetMap منبع داده مرزهاست، اما بازدیدکنندگان برای دریافت مرزها هیچ API خارجی را فراخوانی نمی‌کنند. فایل‌های GeoJSON از خود سایت بارگذاری می‌شوند.',
    majorAreas: 'مناطق بزرگ',
    minorAreas: 'مناطق کوچک',
    refreshModel: 'به‌روزرسانی داده',
    areaDetails: 'صفحه هر منطقه',
    majorCoverage: '۱۲ منطقه بزرگ از ۱۲ منطقه به صورت چندضلعی قابل انتخاب در دسترس است',
    minorCoverage:
      '۵۵ منطقه کوچک از ۶۰ منطقه در ساختار فعلی OSM موجود است؛ مرز پنج منطقه کوچک Vähäkyrö هنوز در OSM مشخص نیست',
    refreshDescription: 'هنگام ساخت نسخه جدید GitHub Pages، snapshot مرزها از OSM دوباره تولید می‌شود',
    areaDetailsDescription: 'با انتخاب هر چندضلعی، صفحه اختصاصی همان منطقه از روی داده محلی باز می‌شود',
    footer: 'یک وب‌سایت متن‌باز و کاملاً استاتیک روی GitHub Pages.',
    interactiveMap: 'نقشه تعاملی',
    statisticalAreas: 'مناطق آماری واسا',
    boundaryLevel: 'سطح منطقه',
    areas: 'منطقه',
    clickForDetails: 'برای جزئیات کلیک کنید',
    mapped: 'روی نقشه',
    mapBoundaryNote:
      'هندسه مرزها به صورت GeoJSON ثابت از همین GitHub Pages ارائه می‌شود. OpenStreetMap فقط هنگام تولید snapshot جدید استفاده می‌شود و مرورگر کاربران API مرزها را فراخوانی نمی‌کند.',
    backToMap: 'بازگشت به نقشه واسا',
    majorArea: 'منطقه بزرگ',
    minorArea: 'منطقه کوچک',
    localBoundaryIntro: 'این صفحه مرز محلی GeoJSON ساخته‌شده از رابطه OpenStreetMap شماره',
    boundary: 'مرز منطقه',
    onOpenStreetMap: 'روی OpenStreetMap',
    osmMetadata: 'فراداده OSM',
    reference: 'شناسه',
    adminLevel: 'سطح اداری',
    osmRelation: 'رابطه OSM',
    outerWays: 'تعداد مسیرهای مرزی',
    minorRelations: 'تعداد مناطق کوچک',
    source: 'منبع',
    parentMajorArea: 'منطقه بزرگ والد',
    localSnapshot: 'GeoJSON محلی ارائه‌شده از همین سایت',
    loading: 'در حال بارگذاری…',
    notTagged: 'بدون برچسب',
    childAreas: 'مناطق کوچک این منطقه بزرگ',
    noChildAreas: 'در snapshot فعلی OSM هیچ مرز قابل نمایش برای مناطق کوچک این منطقه موجود نیست.',
    siblingAreas: 'دیگر مناطق کوچک هم‌سطح در همین منطقه بزرگ',
    noSiblingAreas: 'در snapshot فعلی منطقه کوچک هم‌سطح دیگری برای نمایش وجود ندارد.',
    wikipedia: 'ویکی‌پدیا',
    finnishWikipedia: 'ویکی‌پدیای فنلاندی',
    persianWikipedia: 'ویکی‌پدیای فارسی',
    wikidata: 'ویکی‌داده',
    noWikipedia: 'در فراداده فعلی، مقاله‌ای در ویکی‌پدیای فنلاندی یا فارسی برای این منطقه پیدا نشد.',
    localGeojsonLoaded: 'مرز محلی GeoJSON بارگذاری شد.',
    localMinorGeojsonLoaded: 'مرز محلی GeoJSON منطقه کوچک بارگذاری شد.',
    boundaryLoadingFailed: 'بارگذاری مرز ناموفق بود',
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

export function localizeAreaName(
  names: LocalizedAreaNames | undefined,
  fallback: string,
  targetLanguage: AppLanguage = language.value,
): string {
  if (!names) return fallback
  if (targetLanguage === 'fa') return names.fa || names.en || names.fi || fallback
  return names.en || names.fi || fallback
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
