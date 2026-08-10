import type { AreaDefinition } from '@/domain/areas'

export const GERBY_AREA: AreaDefinition = {
  slug: 'gerby',
  name: 'Gerby',
  ref: '05',
  level: 'suuralue',
  relationId: 11931679,
  outerWayIds: [
    876283921,
    876260541,
    876260547,
    876265316,
    876315747,
    876315774,
    876265313,
    876315750,
    1540323462,
    876315752,
    1540323464,
    876315773,
    876315751,
    876315756,
    1484822135,
    876315748,
    1540323458,
    1484822081,
    1484822082,
    137751397,
    1484822084,
    1484822151,
    1484822150,
  ],
  subareaRelationIds: [
    11931680,
    11931690,
    11931678,
    11931689,
    11931684,
    11931683,
    11931686,
    11931687,
    11931682,
    11931685,
    11931681,
    11931688,
  ],
  source: 'OpenStreetMap relation 11931679; source tag: Vaasan kaupungin paikkatietopalvelut 2016',
}

export const AREAS: AreaDefinition[] = [GERBY_AREA]

export const AREA_BY_SLUG = new Map(AREAS.map((area) => [area.slug, area]))
