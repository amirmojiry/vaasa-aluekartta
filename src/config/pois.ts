import type { PoiCategory } from '@/domain/pois'
import type { AppLanguage } from '@/i18n'

export interface PoiCategoryDefinition {
  id: PoiCategory
  color: string
  labels: Record<AppLanguage, string>
}

export const POI_CATEGORY_DEFINITIONS: PoiCategoryDefinition[] = [
  {
    id: 'attractions',
    color: '#b85b35',
    labels: { en: 'Sights', fi: 'Nähtävyydet', fa: 'دیدنی‌ها' },
  },
  {
    id: 'supermarkets',
    color: '#2f7a59',
    labels: { en: 'Supermarkets', fi: 'Supermarketit', fa: 'سوپرمارکت‌ها' },
  },
  {
    id: 'police',
    color: '#2f5f9b',
    labels: { en: 'Police', fi: 'Poliisi', fa: 'پلیس' },
  },
  {
    id: 'healthcare',
    color: '#a43d4e',
    labels: { en: 'Healthcare', fi: 'Terveyspalvelut', fa: 'خدمات درمانی' },
  },
  {
    id: 'libraries',
    color: '#72508c',
    labels: { en: 'Libraries', fi: 'Kirjastot', fa: 'کتابخانه‌ها' },
  },
  {
    id: 'universities',
    color: '#6d4aa2',
    labels: { en: 'Universities', fi: 'Korkeakoulut', fa: 'دانشگاه‌ها' },
  },
  {
    id: 'schools',
    color: '#c98324',
    labels: { en: 'Schools', fi: 'Koulut', fa: 'مدرسه‌ها' },
  },
  {
    id: 'daycare',
    color: '#c8507c',
    labels: { en: 'Day care', fi: 'Päiväkodit', fa: 'مهدکودک‌ها' },
  },
  {
    id: 'train-stations',
    color: '#44546a',
    labels: { en: 'Train stations', fi: 'Rautatieasemat', fa: 'ایستگاه‌های قطار' },
  },
  {
    id: 'airports',
    color: '#2477a8',
    labels: { en: 'Airports', fi: 'Lentoasemat', fa: 'فرودگاه‌ها' },
  },
  {
    id: 'bus-stops',
    color: '#6a8d32',
    labels: { en: 'Bus stops', fi: 'Bussipysäkit', fa: 'ایستگاه‌های اتوبوس' },
  },
]

export function poiCategoryDefinition(category: PoiCategory): PoiCategoryDefinition {
  return POI_CATEGORY_DEFINITIONS.find((definition) => definition.id === category)!
}
