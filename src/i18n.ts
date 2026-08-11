import { computed, ref } from 'vue'

import type { LocalizedAreaNames, LocalizedText } from '@/domain/areas'

export type AppLanguage = 'en' | 'fi' | 'fa'

const messages = {
  en: {
    appName: 'Vaasa Aluekartta',
    language: 'Language',
    english: 'English',
    finnishLanguage: 'Suomi',
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
    areaStatistics: 'Area statistics',
    historicalStatistics: 'Historical statistics',
    statisticsYearNote: 'Historical figures; the reference year is shown for each metric.',
    statisticsUnavailable: 'Statistics are not available for this mapped area yet.',
    statisticsOverview: 'Statistics overview',
    population: 'Population',
    studentsShare: 'Students (share of labour force)',
    employedShare: 'Employed (share of labour force)',
    unemploymentRate: 'Unemployed (share of labour force)',
    employment: 'Employment',
    employed: 'Employed',
    unemployed: 'Unemployed',
    students: 'Students',
    populationRank: 'rank',
    rank: 'rank',
    rankOf: 'of',
    among: 'among',
    comparedWith: 'vs',
    populationHistory: 'Population development',
    populationHistoryChartAria: 'Population development over the available measurement years',
    populationHistorySource: 'Population history source',
    derivedMetric: 'derived',
    motherTongue: 'Mother tongue',
    languageShare: 'Language share',
    finnish: 'Finnish',
    swedish: 'Swedish',
    otherLanguages: 'Other languages',
    statisticsSource: 'Statistics source',
    colorMapBy: 'Color map by',
    normalView: 'Default',
    populationView: 'Population',
    employmentView: 'Employment',
    studentsView: 'Students',
    languageView: 'Language share',
    politics: 'Politics',
    electionStatistics: 'Election statistics',
    electionHistory: 'Party support over time',
    vaasaElectionHistory: 'Party support in Vaasa',
    topParties: 'Most supported parties',
    votes: 'votes',
    voteShare: 'Vote share',
    voteShareTrend: 'Vote share (%)',
    voteCountTrend: 'Number of votes',
    dataScope: 'Data scope',
    electionComparisonNote:
      'The series includes different election types. Compare points with that context in mind.',
    showElectionTable: 'Show detailed election table',
    election: 'Election',
    party: 'Party',
    electionStatisticsUnavailable: 'No structured party-vote series is available yet.',
    electionTypeMunicipal: 'Municipal election',
    electionTypeRegional: 'County election',
    electionTypeEuropean: 'European Parliament election',
    electionTypeParliamentary: 'Parliamentary election',
    electionShortMunicipal: 'Municipal',
    electionShortRegional: 'County',
    electionShortEuropean: 'EU',
    electionShortParliamentary: 'Parl.',
    electionChartAria: 'Party support over the available election measurements',
    partyInfo: 'Party positions',
    partyInfoAria: 'Show documented party positions',
    partyProfileBasis:
      'Concise summary of the party’s own published programmes and policy pages. This is not an independent political rating.',
    partyProfileUnavailable: 'No documented profile is available for this party yet.',
    partyProfileSources: 'Official sources',
    designedBy: 'Design: Amir Mojiri',
  },
  fi: {
    appName: 'Vaasan aluekartta',
    language: 'Kieli',
    english: 'English',
    finnishLanguage: 'Suomi',
    persian: 'فارسی',
    primaryNavigation: 'Päänavigointi',
    homeAria: 'Vaasan aluekartan etusivu',
    majorAreas: 'Suuralueet',
    minorAreas: 'Pienalueet',
    interactiveMap: 'Interaktiivinen kartta',
    statisticalAreas: 'Vaasan tilastoalueet',
    boundaryLevel: 'Aluetaso',
    areas: 'aluetta',
    clickForDetails: 'avaa tiedot',
    mapped: 'kartalla',
    backToMap: 'Takaisin Vaasan kartalle',
    majorArea: 'Suuralue',
    minorArea: 'Pienalue',
    boundary: 'Alueraja',
    reference: 'Tunnus',
    adminLevel: 'Hallinnollinen taso',
    osmRelation: 'OSM-relaatio',
    outerWays: 'Ulkorajan viivat',
    minorRelations: 'Pienaluerelaatiot',
    source: 'Lähde',
    parentMajorArea: 'Suuralue',
    loading: 'Ladataan…',
    notTagged: 'Ei tunnistetta',
    childAreas: 'Suuralueen pienalueet',
    noChildAreas: 'Tälle suuralueelle ei ole tällä hetkellä kartoitettuja pienalueita.',
    siblingAreas: 'Muut saman suuralueen pienalueet',
    noSiblingAreas: 'Muita kartoitettuja saman tason alueita ei ole tällä hetkellä.',
    wikipedia: 'Wikipedia',
    finnishWikipedia: 'Suomenkielinen Wikipedia',
    persianWikipedia: 'Persiankielinen Wikipedia',
    wikidata: 'Wikidata',
    noWikipedia: 'Linkitettyä suomen- tai persiankielistä Wikipedia-artikkelia ei löytynyt.',
    technicalInfo: 'Tekniset tiedot',
    wikidataDescription: 'Wikidata-kuvaus',
    externalIdentifiers: 'Ulkoiset tunnisteet',
    noExternalIdentifiers: 'Wikidatassa ei ole muita ulkoisia tunnisteita.',
    loadingAreaFailed: 'Alueen lataaminen epäonnistui',
    areaStatistics: 'Alueen tilastot',
    historicalStatistics: 'Historialliset tilastot',
    statisticsYearNote: 'Luvut ovat historiallisia; viitevuosi näkyy kunkin mittarin yhteydessä.',
    statisticsUnavailable: 'Tälle kartta-alueelle ei ole vielä rakenteisia tilastotietoja.',
    statisticsOverview: 'Tilastojen yhteenveto',
    population: 'Väestö',
    studentsShare: 'Opiskelijat (osuus työvoimasta)',
    employedShare: 'Työlliset (osuus työvoimasta)',
    unemploymentRate: 'Työttömät (osuus työvoimasta)',
    employment: 'Työllisyys',
    employed: 'Työlliset',
    unemployed: 'Työttömät',
    students: 'Opiskelijat',
    populationRank: 'sija',
    rank: 'sija',
    rankOf: '/',
    among: 'joukossa',
    comparedWith: 'verrattuna vuoteen',
    populationHistory: 'Väestökehitys',
    populationHistoryChartAria: 'Väestökehitys käytettävissä olevina mittausvuosina',
    populationHistorySource: 'Väestökehityksen lähde',
    derivedMetric: 'laskettu arvo',
    motherTongue: 'Äidinkieli',
    languageShare: 'Äidinkielten osuudet',
    finnish: 'Suomi',
    swedish: 'Ruotsi',
    otherLanguages: 'Muut kielet',
    statisticsSource: 'Tilastolähde',
    colorMapBy: 'Väritä kartta muuttujan mukaan',
    normalView: 'Perusnäkymä',
    populationView: 'Väestö',
    employmentView: 'Työllisyys',
    studentsView: 'Opiskelijat',
    languageView: 'Kieliosuus',
    politics: 'Politiikka ja vaalit',
    electionStatistics: 'Vaalitilastot',
    electionHistory: 'Puolueiden kannatuksen kehitys',
    vaasaElectionHistory: 'Puolueiden kannatus Vaasassa',
    topParties: 'Kolme suosituinta puoluetta',
    votes: 'ääntä',
    voteShare: 'Ääniosuus',
    voteShareTrend: 'Ääniosuuden kehitys',
    voteCountTrend: 'Äänimäärän kehitys',
    dataScope: 'Aineiston kattavuus',
    electionComparisonNote:
      'Sarja sisältää eri vaalityyppejä; pisteitä tulee verrata vaalityyppi huomioiden.',
    showElectionTable: 'Näytä koko vaalitaulukko',
    election: 'Vaalit',
    party: 'Puolue',
    electionStatisticsUnavailable: 'Tälle alueelle ei ole vielä rakenteista puolueiden äänisarjaa.',
    electionTypeMunicipal: 'Kuntavaalit',
    electionTypeRegional: 'Aluevaalit',
    electionTypeEuropean: 'Europarlamenttivaalit',
    electionTypeParliamentary: 'Eduskuntavaalit',
    electionShortMunicipal: 'Kunta',
    electionShortRegional: 'Alue',
    electionShortEuropean: 'EU',
    electionShortParliamentary: 'Eduskunta',
    electionChartAria: 'Puolueiden kannatus käytettävissä olevissa vaalimittauksissa',
    partyInfo: 'Puolueen linjaukset',
    partyInfoAria: 'Näytä dokumentoidut puolueen linjaukset',
    partyProfileBasis:
      'Tiivistelmä perustuu puolueen omiin julkaistuihin ohjelmiin ja politiikkasivuihin. Se ei ole riippumaton poliittinen arvio.',
    partyProfileUnavailable: 'Tälle puolueelle ei ole vielä dokumentoitua profiilia.',
    partyProfileSources: 'Viralliset lähteet',
    designedBy: 'Suunnittelu: Amir Mojiri',
  },
  fa: {
    appName: 'نقشه مناطق واسا',
    language: 'زبان',
    english: 'English',
    finnishLanguage: 'Suomi',
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
    parentMajorArea: 'منطقه بزرگ',
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
    areaStatistics: 'آمار منطقه',
    historicalStatistics: 'آمار تاریخی',
    statisticsYearNote: 'این ارقام تاریخی هستند؛ سال مرجع هر شاخص کنار آن نمایش داده شده است.',
    statisticsUnavailable: 'هنوز آمار ساختارمند برای این منطقه ثبت نشده است.',
    statisticsOverview: 'نمای کلی آمار',
    population: 'جمعیت',
    studentsShare: 'دانشجویان (سهم از نیروی کار)',
    employedShare: 'شاغلان (سهم از نیروی کار)',
    unemploymentRate: 'بیکاران (سهم از نیروی کار)',
    employment: 'وضعیت اشتغال',
    employed: 'شاغلان',
    unemployed: 'بیکاران',
    students: 'دانشجویان',
    populationRank: 'رتبه',
    rank: 'رتبه',
    rankOf: 'از',
    among: 'در میان',
    comparedWith: 'نسبت به',
    populationHistory: 'روند جمعیت',
    populationHistoryChartAria: 'نمودار روند جمعیت در سال‌های اندازه‌گیری موجود',
    populationHistorySource: 'منبع روند جمعیت',
    derivedMetric: 'مقدار محاسبه‌شده',
    motherTongue: 'زبان مادری',
    languageShare: 'سهم زبان مادری',
    finnish: 'فنلاندی',
    swedish: 'سوئدی',
    otherLanguages: 'سایر زبان‌ها',
    statisticsSource: 'منبع آمار',
    colorMapBy: 'رنگ‌بندی نقشه بر اساس',
    normalView: 'نمای عادی',
    populationView: 'جمعیت',
    employmentView: 'شاغل بودن',
    studentsView: 'دانشجو بودن',
    languageView: 'سهم زبان',
    politics: 'سیاست و انتخابات',
    electionStatistics: 'آمار انتخابات',
    electionHistory: 'تغییرات آرای احزاب',
    vaasaElectionHistory: 'آرای احزاب در کل واسا',
    topParties: 'سه حزب محبوب',
    votes: 'رأی',
    voteShare: 'سهم رأی',
    voteShareTrend: 'روند درصد رأی',
    voteCountTrend: 'روند تعداد رأی',
    dataScope: 'دامنه داده',
    electionComparisonNote:
      'این سری شامل انواع مختلف انتخابات است؛ مقایسه نقاط باید با توجه به نوع انتخابات انجام شود.',
    showElectionTable: 'نمایش جدول کامل انتخابات',
    election: 'انتخابات',
    party: 'حزب',
    electionStatisticsUnavailable: 'هنوز سری ساختارمند آرای حزبی برای این محدوده موجود نیست.',
    electionTypeMunicipal: 'انتخابات شهری',
    electionTypeRegional: 'انتخابات منطقه‌ای',
    electionTypeEuropean: 'انتخابات پارلمان اروپا',
    electionTypeParliamentary: 'انتخابات پارلمانی',
    electionShortMunicipal: 'شهری',
    electionShortRegional: 'منطقه‌ای',
    electionShortEuropean: 'اروپا',
    electionShortParliamentary: 'پارلمان',
    electionChartAria: 'نمودار تغییرات آرای احزاب در اندازه‌گیری‌های انتخاباتی موجود',
    partyInfo: 'دیدگاه‌های حزب',
    partyInfoAria: 'نمایش دیدگاه‌های مستند حزب',
    partyProfileBasis:
      'این خلاصه بر اساس برنامه‌ها و صفحات رسمی منتشرشده خود حزب تهیه شده و ارزیابی سیاسی مستقل نیست.',
    partyProfileUnavailable: 'هنوز پروفایل مستندی برای این حزب ثبت نشده است.',
    partyProfileSources: 'منابع رسمی',
    designedBy: 'طراحی: امیر مجیری',
  },
} as const

export type MessageKey = keyof (typeof messages)['en']

const requestedLanguage = new URLSearchParams(window.location.search).get('lang')
const initialLanguage: AppLanguage =
  requestedLanguage === 'fa' || requestedLanguage === 'fi' ? requestedLanguage : 'en'
const language = ref<AppLanguage>(initialLanguage)

function applyDocumentLanguage(): void {
  document.documentElement.lang = language.value
  document.documentElement.dir = language.value === 'fa' ? 'rtl' : 'ltr'
}

applyDocumentLanguage()

export function localeForLanguage(targetLanguage: AppLanguage = language.value): string {
  if (targetLanguage === 'fa') return 'fa-IR'
  if (targetLanguage === 'fi') return 'fi-FI'
  return 'en-FI'
}

export function localizeText(
  text: LocalizedText | undefined,
  fallback: string,
  targetLanguage: AppLanguage = language.value,
): string {
  if (!text) return fallback
  if (targetLanguage === 'fa') return text.fa || text.en || text.fi || fallback
  if (targetLanguage === 'fi') return text.fi || text.en || text.fa || fallback
  return text.en || text.fi || text.fa || fallback
}

const PERSIAN_MAJOR_AREA_NAMES: Record<string, string> = {
  Keskusta: 'مرکز شهر',
  Vöyrinkaupunki: 'وُیرین‌کاوپونکی',
  Vaskiluoto: 'واسکی‌لوتو',
  Palosaari: 'پالوساری',
  Gerby: 'گربی',
  Kotiranta: 'کوتی‌رانتا',
  Huutoniemi: 'هوتونیمی',
  Ristinummi: 'ریستینومی',
  Höstvesi: 'هوست‌وسی',
  Suvilahti: 'سووی‌لاهتی',
  Sundom: 'سوندوم',
  Vähäkyrö: 'وهاکورو',
}

function toPersianDigits(value: string): string {
  const digits = '۰۱۲۳۴۵۶۷۸۹'
  return value.replace(/\d/g, (digit) => digits[Number(digit)] ?? digit)
}

function persianAreaNameFallback(names: LocalizedAreaNames | undefined, fallback: string): string {
  const finnishName = names?.fi || fallback
  for (const [source, persian] of Object.entries(PERSIAN_MAJOR_AREA_NAMES)) {
    if (finnishName === source) return persian
    if (finnishName.startsWith(`${source} `)) {
      return `${persian} ${toPersianDigits(finnishName.slice(source.length + 1))}`
    }
  }
  return toPersianDigits(finnishName)
}

export function localizeAreaName(
  names: LocalizedAreaNames | undefined,
  fallback: string,
  targetLanguage: AppLanguage = language.value,
): string {
  if (targetLanguage === 'fa') return names?.fa || persianAreaNameFallback(names, fallback)
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
