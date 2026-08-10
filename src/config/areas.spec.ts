import { AREAS, CONFIGURED_SUBAREA_RELATION_COUNT } from './areas'

describe('Vaasa suuralue configuration', () => {
  it('contains all 12 major districts in reference order', () => {
    expect(AREAS).toHaveLength(12)
    expect(AREAS.map((area) => area.ref)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
    ])
    expect(new Set(AREAS.map((area) => area.relationId)).size).toBe(12)
    expect(new Set(AREAS.map((area) => area.slug)).size).toBe(12)
  })

  it('captures the 55 supplied pienalue child relations', () => {
    expect(CONFIGURED_SUBAREA_RELATION_COUNT).toBe(55)
    expect(AREAS.find((area) => area.slug === 'vahakyro')?.subareaRelationIds).toEqual([])
  })
})
