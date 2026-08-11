export interface PopulationObservation {
  year: number
  population: number
}

export interface MajorAreaPopulationHistory {
  name: string
  observations: PopulationObservation[]
}

export interface MajorAreaPopulationHistoryDatabase {
  schemaVersion: number
  latestAvailableYear: number
  source: {
    title: string
    url: string
    accessed: string
    note?: string
  }
  areas: Record<string, [number, number][]>
}

export interface PopulationChange {
  current: PopulationObservation
  previous: PopulationObservation | null
  percent: number | null
}

export interface PopulationRank {
  rank: number
  total: number
  population: number
  year: number
}
