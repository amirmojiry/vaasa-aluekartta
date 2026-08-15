import { describe, expect, it } from 'vitest'

import { BOUNDARY_LAYERS } from './boundaries'
import { SUURALUE_NAMES } from '@/domain/boundaries'

describe('boundary layer metadata', () => {
  it('contains the expected Vaasa hierarchy counts', () => {
    expect(SUURALUE_NAMES).toHaveLength(12)
    expect(BOUNDARY_LAYERS.find((layer) => layer.id === 'suuralue')?.areaCount).toBe(12)
    expect(BOUNDARY_LAYERS.find((layer) => layer.id === 'pienalue')?.areaCount).toBe(60)
  })

  it('documents a source, author, and licence for every layer', () => {
    for (const layer of BOUNDARY_LAYERS) {
      expect(layer.sourcePageUrl).toMatch(/^https:\/\//)
      expect(layer.author).not.toBe('')
      expect(layer.licence).toMatch(/^CC BY(?:-SA)? 4\.0$/)
    }

    expect(BOUNDARY_LAYERS.find((layer) => layer.id === 'postal')?.licence).toBe('CC BY 4.0')
  })
})
