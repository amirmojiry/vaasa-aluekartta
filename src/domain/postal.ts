export type PostalMetric = 'population' | 'employed' | 'unemployed' | 'students' | 'income'

export type PostalPosition = [number, number]
export type PostalPolygonCoordinates = PostalPosition[][]
export type PostalMultiPolygonCoordinates = PostalPosition[][][]

export type PostalGeometry =
  | {
      type: 'Polygon'
      coordinates: PostalPolygonCoordinates
    }
  | {
      type: 'MultiPolygon'
      coordinates: PostalMultiPolygonCoordinates
    }

export interface PostalCodeArea {
  code: string
  nameFi: string
  nameSv: string
  releaseYear: number | null
  statisticsYear: number
  population: number | null
  employed: number | null
  unemployed: number | null
  students: number | null
  averageIncome: number | null
  employedShare: number | null
  unemployedShare: number | null
  studentShare: number | null
  geometry: PostalGeometry
}

export interface PostalCodeCollection {
  areas: PostalCodeArea[]
  sourceUrl: string
  statisticsYear: number
  releaseYear: number | null
}

export interface PostalHistoryObservation {
  year: number
  population: number | null
  employed: number | null
  unemployed: number | null
  students: number | null
  averageIncome: number | null
  employedShare: number | null
  unemployedShare: number | null
  studentShare: number | null
}

export interface PostalHistoryDatabase {
  generatedAt: string
  source: string
  sourceUrl: string
  licence: string
  latestReleaseYear: number
  latestStatisticsYear: number
  years: number[]
  areas: Record<string, PostalHistoryObservation[]>
}
