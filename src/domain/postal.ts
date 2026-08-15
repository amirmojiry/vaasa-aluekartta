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
  municipalityCode: string | null
  releaseYear: number | null
  statisticsYear: number
  population: number | null
  employed: number | null
  unemployed: number | null
  students: number | null
  averageIncome: number | null
  geometry: PostalGeometry
}

export interface PostalCodeCollection {
  areas: PostalCodeArea[]
  sourceUrl: string
  statisticsYear: number
}
