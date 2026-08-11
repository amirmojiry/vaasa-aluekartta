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
]

export function poiCategoryDefinition(category: PoiCategory): PoiCategoryDefinition {
  return POI_CATEGORY_DEFINITIONS.find((definition) => definition.id === category)!
}
