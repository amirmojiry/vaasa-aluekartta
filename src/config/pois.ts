import type { PoiCategory } from '@/domain/pois'
import type { AppLanguage } from '@/i18n'

export interface PoiCategoryDefinition {
  id: PoiCategory
  color: string
  labels: Record<AppLanguage, string>
}

export const POI_CATEGORY_DEFINITIONS: PoiCategoryDefinition[] = [
  { id: 'attractions', color: '#b85b35', labels: { en: 'Sights', fi: 'Nähtävyydet', fa: 'دیدنی‌ها' } },
  { id: 'supermarkets', color: '#2f7a59', labels: { en: 'Supermarkets', fi: 'Supermarketit', fa: 'سوپرمارکت‌ها' } },
  { id: 'police', color: '#2f5f9b', labels: { en: 'Police', fi: 'Poliisi', fa: 'پلیس' } },
  { id: 'healthcare', color: '#a43d4e', labels: { en: 'Healthcare', fi: 'Terveyspalvelut', fa: 'خدمات درمانی' } },
  { id: 'libraries', color: '#72508c', labels: { en: 'Libraries', fi: 'Kirjastot', fa: 'کتابخانه‌ها' } },
  { id: 'universities', color: '#6d4aa2', labels: { en: 'Universities', fi: 'Korkeakoulut', fa: 'دانشگاه‌ها' } },
  { id: 'schools', color: '#c98324', labels: { en: 'Schools', fi: 'Koulut', fa: 'مدرسه‌ها' } },
  { id: 'daycare', color: '#c8507c', labels: { en: 'Day care', fi: 'Päiväkodit', fa: 'مهدکودک‌ها' } },
  { id: 'train-stations', color: '#44546a', labels: { en: 'Train stations', fi: 'Rautatieasemat', fa: 'ایستگاه قطار' } },
  { id: 'airports', color: '#2477a8', labels: { en: 'Airports', fi: 'Lentoasemat', fa: 'فرودگاه' } },
  { id: 'bus-stops', color: '#6a8d32', labels: { en: 'Bus stops', fi: 'Bussipysäkit', fa: 'ایستگاه‌های اتوبوس' } },
  { id: 'restaurants', color: '#9a4f2c', labels: { en: 'Restaurants', fi: 'Ravintolat', fa: 'رستوران‌ها' } },
  { id: 'cafes', color: '#8b6542', labels: { en: 'Cafés', fi: 'Kahvilat', fa: 'کافه‌ها' } },
  { id: 'parks-playgrounds', color: '#4f8f4f', labels: { en: 'Parks & playgrounds', fi: 'Puistot ja leikkipaikat', fa: 'پارک و زمین بازی' } },
  { id: 'sports', color: '#3d7f87', labels: { en: 'Sports facilities', fi: 'Liikuntapaikat', fa: 'امکانات ورزشی' } },
  { id: 'shopping', color: '#9466a8', labels: { en: 'Shopping', fi: 'Kaupat ja ostoskeskukset', fa: 'مراکز خرید و فروشگاه‌ها' } },
  { id: 'banking', color: '#556b8d', labels: { en: 'Banks & ATMs', fi: 'Pankit ja automaatit', fa: 'بانک و خودپرداز' } },
  { id: 'post-services', color: '#bd7b20', labels: { en: 'Post & parcel lockers', fi: 'Posti ja pakettiautomaatit', fa: 'پست و لاکر بسته' } },
  { id: 'fuel-charging', color: '#66737d', labels: { en: 'Fuel & charging', fi: 'Tankkaus ja lataus', fa: 'پمپ‌بنزین و شارژ خودرو' } },
]

export function poiCategoryDefinition(category: PoiCategory): PoiCategoryDefinition {
  return POI_CATEGORY_DEFINITIONS.find((definition) => definition.id === category)!
}
