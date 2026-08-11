import { describe, expect, it } from 'vitest'

import type { ResolvedElectionDataset } from '@/domain/elections'
import { chartParties, featuredElection, topParties } from '@/services/electionStatistics'

const dataset: ResolvedElectionDataset = {
  coverage: 'exact',
  scope: { fi: 'Testi', en: 'Test', fa: 'آزمون' },
  sourceUrl: 'https://example.com',
  featuredLatestId: 'municipal-2025',
  events: [
    {
      id: 'municipal-2021',
      year: 2021,
      type: 'municipal',
      parties: [
        { party: 'A', votes: 100, percent: 40 },
        { party: 'B', votes: 80, percent: 32 },
        { party: 'C', votes: 50, percent: 20 },
      ],
    },
    {
      id: 'municipal-2025',
      year: 2025,
      type: 'municipal',
      parties: [
        { party: 'B', votes: 140, percent: 45 },
        { party: 'A', votes: 110, percent: 35 },
        { party: 'D', votes: 40, percent: 13 },
        { party: 'C', votes: 20, percent: 6 },
      ],
    },
  ],
}

describe('election statistics helpers', () => {
  it('uses the configured featured election and ranks its parties by vote share', () => {
    const election = featuredElection(dataset)
    expect(election?.id).toBe('municipal-2025')
    expect(election ? topParties(election, 3).map((party) => party.party) : []).toEqual([
      'B',
      'A',
      'D',
    ])
  })

  it('chooses chart series from the latest featured election', () => {
    expect(chartParties(dataset, 3)).toEqual(['B', 'A', 'D'])
  })
})
