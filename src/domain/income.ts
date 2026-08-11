import type { AreaLevel } from '@/domain/areas'

export interface AreaIncomeSource {
  title: string
  author: string
  year: number
  institution: string
  underlyingSource: string
  appendix: string
  thesisPage: number
  pdfPage: number
  itemUrl: string
  pdfUrl: string
}

export interface AreaIncomeDatabase {
  schemaVersion: 1
  description: string
  year: number
  unit: 'eur_per_year'
  populationBasis: 'residents_aged_15_plus'
  cityAverage: number
  source: AreaIncomeSource
  coverage: {
    mappedAreaRecords: number
    values: number
    missing: number
  }
  missingAreas: string[]
  areas: Record<string, number>
}

export interface AreaIncomeRecord {
  level: AreaLevel
  name: string
  value: number
  year: number
  cityAverage: number
  rank: number
  rankTotal: number
  source: AreaIncomeSource
}
