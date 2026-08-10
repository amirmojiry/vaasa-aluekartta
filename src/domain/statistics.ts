import type { AreaLevel } from '@/domain/areas'

export interface AreaStatisticRecord {
  level: AreaLevel
  name: string
  population2015: number
  studentShare2013: number
  unemployment2013: number
  employedShare2013: number
  language2015: {
    finnish: number
    swedish: number
    other: number
  }
}

interface CompactAreaStatisticRecord {
  p: number
  s: number
  u: number
  e: number
  l: [number, number, number]
}

export interface AreaStatisticsDatabase {
  schemaVersion: number
  description: string
  sources: Record<
    string,
    {
      title: string
      author?: string
      year?: number
      institution?: string
      itemUrl?: string
      pdfUrl?: string
      notes?: string
      sourceNotes?: Record<string, string>
    }
  >
  datasets: Record<string, Record<string, unknown>>
  plannedDatasets?: Record<string, Record<string, unknown>>
  coverage: Record<string, number>
  areas: Record<string, CompactAreaStatisticRecord>
}
