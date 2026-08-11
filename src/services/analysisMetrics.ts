import type { AreaLevel } from '@/domain/areas'
import type { CompactAreaStatisticRecord } from '@/domain/statistics'
import { fetchAreaIncomeDatabase } from '@/services/areaIncome'
import { fetchStatisticsDatabase } from '@/services/areaStatistics'
import { fetchMajorAreaPopulationHistoryDatabase } from '@/services/populationHistory'

export const ANALYSIS_METRICS = [
  'population',
  'employed',
  'unemployed',
  'students',
  'language-finnish',
  'language-swedish',
  'language-other',
  'income',
] as const

export type AnalysisMetric = (typeof ANALYSIS_METRICS)[number]
export type AnalysisUnit = 'people' | 'percent' | 'eur_per_year'

export interface AnalysisObservation {
  level: AreaLevel
  name: string
  value: number
  year: number
}

export interface AnalysisMetricDataset {
  metric: AnalysisMetric
  unit: AnalysisUnit
  observations: AnalysisObservation[]
  sourceUrl: string
  sourceLabel: string
  note?: string
}

export function isAnalysisMetric(value: string | null): value is AnalysisMetric {
  return value !== null && ANALYSIS_METRICS.includes(value as AnalysisMetric)
}

function statisticsMetricValue(
  metric: Exclude<AnalysisMetric, 'population' | 'income'>,
  record: CompactAreaStatisticRecord,
): number {
  switch (metric) {
    case 'employed':
      return record.e
    case 'unemployed':
      return record.u
    case 'students':
      return record.s
    case 'language-finnish':
      return record.l[0]
    case 'language-swedish':
      return record.l[1]
    case 'language-other':
      return record.l[2]
  }
}

function observationsFromStatistics(
  metric: Exclude<AnalysisMetric, 'population' | 'income'>,
  level: AreaLevel,
  areas: Record<string, CompactAreaStatisticRecord>,
): AnalysisObservation[] {
  const prefix = `${level}:`
  return Object.entries(areas)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, record]) => ({
      level,
      name: key.slice(prefix.length),
      value: statisticsMetricValue(metric, record),
      year: metric.startsWith('language-') ? 2015 : 2013,
    }))
}

export async function fetchAnalysisMetricDataset(
  metric: AnalysisMetric,
  level: AreaLevel,
): Promise<AnalysisMetricDataset> {
  if (metric === 'income') {
    const database = await fetchAreaIncomeDatabase()
    const prefix = `${level}:`
    return {
      metric,
      unit: 'eur_per_year',
      observations: Object.entries(database.areas)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({
          level,
          name: key.slice(prefix.length),
          value,
          year: database.year,
        })),
      sourceUrl: database.source.pdfUrl,
      sourceLabel: `${database.source.underlyingSource} · ${database.source.author} (${database.source.year}), ${database.source.appendix}`,
      note: database.description,
    }
  }

  if (metric === 'population' && level === 'suuralue') {
    const database = await fetchMajorAreaPopulationHistoryDatabase()
    return {
      metric,
      unit: 'people',
      observations: Object.entries(database.areas)
        .map(([name, values]) => {
          const latest = values.at(-1)
          if (!latest) return null
          return { level, name, year: latest[0], value: latest[1] }
        })
        .filter((value): value is AnalysisObservation => value !== null),
      sourceUrl: database.source.url,
      sourceLabel: database.source.title,
      note: database.source.note,
    }
  }

  const database = await fetchStatisticsDatabase()
  const source = database.sources.komsi2016
  const sourceUrl = source?.itemUrl || source?.pdfUrl || ''
  const sourceLabel = source
    ? `${source.author ?? 'Sanna Komsi'} (${source.year ?? 2016}) · ${source.institution ?? 'University of Vaasa'}`
    : 'Historical Vaasa area statistics'

  if (metric === 'population') {
    const prefix = `${level}:`
    return {
      metric,
      unit: 'people',
      observations: Object.entries(database.areas)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, record]) => ({
          level,
          name: key.slice(prefix.length),
          value: record.p,
          year: 2015,
        })),
      sourceUrl,
      sourceLabel,
    }
  }

  return {
    metric,
    unit: 'percent',
    observations: observationsFromStatistics(metric, level, database.areas),
    sourceUrl,
    sourceLabel,
  }
}

export function rankAnalysisObservations(
  observations: AnalysisObservation[],
): Array<AnalysisObservation & { rank: number }> {
  return [...observations]
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name))
    .map((observation, index) => ({ ...observation, rank: index + 1 }))
}
