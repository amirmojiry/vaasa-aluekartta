import type { AreaDefinition } from '@/domain/areas'

const MUNICIPAL_SOURCE = 'Vaasan kaupungin paikkatietopalvelut 2016'

function osmSource(relationId: number, hasMunicipalSource = true): string {
  return hasMunicipalSource
    ? `OpenStreetMap relation ${relationId}; source tag: ${MUNICIPAL_SOURCE}`
    : `OpenStreetMap relation ${relationId}`
}

export const KESKUSTA_AREA: AreaDefinition = {
  slug: 'keskusta',
  name: 'Keskusta',
  ref: '01',
  level: 'suuralue',
  relationId: 11930886,
  outerWayIds: [
    876249656, 876249658, 876249660, 876249648, 876249649, 876260542, 876249651, 876260545,
    876249637, 876255162, 876249639, 876249631, 876255163, 876249642, 876249653, 876255168,
    1540323469, 876273527, 876249652, 876273526,
  ],
  subareaRelationIds: [
    11930883, 11930884, 11930876, 11930879, 11930878, 11930877, 11930882, 11930881, 11930880,
    11930885,
  ],
  source: osmSource(11930886),
}

export const VOYRINKAUPUNKI_AREA: AreaDefinition = {
  slug: 'voyrinkaupunki',
  name: 'Vöyrinkaupunki',
  ref: '02',
  level: 'suuralue',
  relationId: 11930928,
  outerWayIds: [
    876249653, 876249642, 876255163, 876249631, 876249639, 876255162, 876255165, 1540323447,
    876265314, 876265317, 876315750, 876326918, 876255164, 876255169, 876332284, 876255167,
    1540323469, 876255168,
  ],
  subareaRelationIds: [11930927, 11930925, 11930926],
  source: osmSource(11930928),
}

export const VASKILUOTO_AREA: AreaDefinition = {
  slug: 'vaskiluoto',
  name: 'Vaskiluoto',
  ref: '03',
  level: 'suuralue',
  relationId: 11931015,
  outerWayIds: [
    876260547, 876260543, 876265320, 876260545, 876249651, 876260542, 876249649, 876249648,
    876249647, 876283919, 876260541,
  ],
  subareaRelationIds: [11931013, 11931012, 11931014],
  source: osmSource(11931015),
}

export const PALOSAARI_AREA: AreaDefinition = {
  slug: 'palosaari',
  name: 'Palosaari',
  ref: '04',
  level: 'suuralue',
  relationId: 11931113,
  outerWayIds: [
    1540323447, 876265314, 876265317, 876265313, 876315774, 876315747, 876265316, 876260543,
    876265320, 876249637, 876255165,
  ],
  subareaRelationIds: [11931111, 11931110, 11931109, 11931108, 11931112],
  source: osmSource(11931113),
}

export const GERBY_AREA: AreaDefinition = {
  slug: 'gerby',
  name: 'Gerby',
  ref: '05',
  level: 'suuralue',
  relationId: 11931679,
  outerWayIds: [
    876283921, 876260541, 876260547, 876265316, 876315747, 876315774, 876265313, 876315750,
    1540323462, 876315752, 1540323464, 876315773, 876315751, 876315756, 1484822135, 876315748,
    1540323458, 1484822081, 1484822082, 137751397, 1484822084, 1484822151, 1484822150,
  ],
  subareaRelationIds: [
    11931680, 11931690, 11931678, 11931689, 11931684, 11931683, 11931686, 11931687, 11931682,
    11931685, 11931681, 11931688,
  ],
  source: osmSource(11931679),
}

export const KOTIRANTA_AREA: AreaDefinition = {
  slug: 'kotiranta',
  name: 'Kotiranta',
  ref: '06',
  level: 'suuralue',
  relationId: 11931725,
  outerWayIds: [
    876255169, 876326920, 876326921, 876326922, 876326924, 876315753, 1484822128, 876315751,
    876315773, 1540323464, 876315752, 1540323462, 876326918, 876255164,
  ],
  subareaRelationIds: [11931728, 11931726, 11931724, 11931727],
  source: osmSource(11931725, false),
}

export const HUUTONIEMI_AREA: AreaDefinition = {
  slug: 'huutoniemi',
  name: 'Huutoniemi',
  ref: '07',
  level: 'suuralue',
  relationId: 11931778,
  outerWayIds: [
    876273527, 876273531, 876332292, 1540722532, 876332282, 876332281, 876332293, 876338129,
    1540722538, 876332290, 876332286, 876332283, 876332280, 876326921, 876326920, 876332284,
    876255167,
  ],
  subareaRelationIds: [11931777, 11931782, 11931781, 11931779, 11931780],
  source: osmSource(11931778),
}

export const RISTINUMMI_AREA: AreaDefinition = {
  slug: 'ristinummi',
  name: 'Ristinummi',
  ref: '08',
  level: 'suuralue',
  relationId: 11931939,
  outerWayIds: [
    876338133, 876338130, 876338131, 876338132, 876338125, 876338127, 1540722536, 876338122,
    1484184446, 876273528, 876338121, 876338124, 876332281, 876332293, 876338129, 1540722538,
    876332290,
  ],
  subareaRelationIds: [11931941, 11931943, 11931942, 11931938, 11931940],
  source: osmSource(11931939),
}

export const HOSTVESI_AREA: AreaDefinition = {
  slug: 'hostvesi',
  name: 'Höstvesi',
  ref: '09',
  level: 'suuralue',
  relationId: 11932028,
  outerWayIds: [
    876343895, 876343893, 1540722541, 1484184447, 876343891, 1484184448, 876338130, 876338131,
    876338132, 876338125, 876338127, 628848524,
  ],
  subareaRelationIds: [11932030, 11932027, 11932029],
  source: osmSource(11932028),
}

export const SUVILAHTI_AREA: AreaDefinition = {
  slug: 'suvilahti',
  name: 'Suvilahti',
  ref: '10',
  level: 'suuralue',
  relationId: 11931139,
  outerWayIds: [
    876249659, 876249658, 876249656, 876273526, 876249652, 876273531, 876332292, 1540722532,
    876332282, 876338124, 876338121, 876273528, 876273530,
  ],
  subareaRelationIds: [11931137, 11931138],
  source: osmSource(11931139),
}

export const SUNDOM_AREA: AreaDefinition = {
  slug: 'sundom',
  name: 'Sundom',
  ref: '11',
  level: 'suuralue',
  relationId: 11931249,
  outerWayIds: [
    876283921, 876283919, 876249647, 876249660, 876249659, 876283920, 876273529, 137751605,
    876283916, 1484184443, 1484184445, 137751341, 137751428, 876283922,
  ],
  subareaRelationIds: [11931246, 11931247, 11931248],
  source: osmSource(11931249),
}

export const VAHAKYRO_AREA: AreaDefinition = {
  slug: 'vahakyro',
  name: 'Vähäkyrö',
  ref: '12',
  level: 'suuralue',
  relationId: 2249140,
  outerWayIds: [
    1540722544, 168892186, 1484822104, 137751340, 1484822105, 1540722547, 1484822116, 1484184451,
    137751617, 1540722545, 165724520, 168901458, 168901461, 168901448, 168901460, 168901443,
    168901456, 168901441, 168901451, 168901440, 168901447, 168901450, 168901462, 168901449,
    168901439, 168901446, 168901442, 168901457, 168901459, 168901444, 168901445, 1484822095,
    1484822094,
  ],
  subareaRelationIds: [],
  source: osmSource(2249140, false),
}

export const AREAS: AreaDefinition[] = [
  KESKUSTA_AREA,
  VOYRINKAUPUNKI_AREA,
  VASKILUOTO_AREA,
  PALOSAARI_AREA,
  GERBY_AREA,
  KOTIRANTA_AREA,
  HUUTONIEMI_AREA,
  RISTINUMMI_AREA,
  HOSTVESI_AREA,
  SUVILAHTI_AREA,
  SUNDOM_AREA,
  VAHAKYRO_AREA,
]

export const AREA_BY_SLUG = new Map(AREAS.map((area) => [area.slug, area]))

export const CONFIGURED_SUBAREA_RELATION_COUNT = AREAS.reduce(
  (total, area) => total + area.subareaRelationIds.length,
  0,
)
