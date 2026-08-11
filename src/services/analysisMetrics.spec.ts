import { describe, expect, it } from 'vitest'

import { isAnalysisMetric, rankAnalysisObservations } from '@/services/analysisMetrics'

describe('analysis metrics', () => {
  it('accepts the supported thematic page identifiers', () => {
    expect(isAnalysisMetric('population')).toBe(true)
    expect(isAnalysisMetric('income')).toBe(true)
    expect(isAnalysisMetric('language-swedish')).toBe(true)
    expect(isAnalysisMetric('unknown')).toBe(false)
    expect(isAnalysisMetric(null)).toBe(false)
  })

  it('ranks observations from the highest value while preserving observations', () => {
    expect(
      rankAnalysisObservations([
        { level: 'suuralue', name: 'B', value: 10, year: 2015 },
        { level: 'suuralue', name: 'A', value: 20, year: 2015 },
      ]),
    ).toEqual([
      { level: 'suuralue', name: 'A', value: 20, year: 2015, rank: 1 },
      { level: 'suuralue', name: 'B', value: 10, year: 2015, rank: 2 },
    ])
  })
})
