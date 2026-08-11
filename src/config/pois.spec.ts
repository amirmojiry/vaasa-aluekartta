import { describe, expect, it } from 'vitest'

import { POI_CATEGORY_GROUPS } from '@/config/pois'
import { POI_CATEGORIES } from '@/domain/pois'

describe('POI category groups', () => {
  it('places every category in exactly one group', () => {
    const grouped = POI_CATEGORY_GROUPS.flatMap((group) => group.categories)
    expect(grouped).toHaveLength(POI_CATEGORIES.length)
    expect(new Set(grouped)).toEqual(new Set(POI_CATEGORIES))
  })

  it('keeps universities, schools, day care, and libraries together', () => {
    expect(POI_CATEGORY_GROUPS.find((group) => group.id === 'education')?.categories).toEqual([
      'universities',
      'schools',
      'daycare',
      'libraries',
    ])
  })
})
