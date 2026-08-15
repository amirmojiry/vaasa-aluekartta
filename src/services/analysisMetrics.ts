import type { AreaLevel } from '@/domain/areas'
import type { PostalMetric } from '@/domain/postal'
import type { CompactAreaStatisticRecord } from '@/domain/statistics'
import { fetchAreaIncomeDatabase } from '@/services/areaIncome'
import { fetchStatisticsDatabase } from '@/services/areaStatistics'
import { fetchMajorAreaPopulationHistoryDatabase } from '@/services/populationHistory'
import { fetchPostalCodeCollection, postalMetricValue } from '@/services/postalData'

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
export type AnalysisLevel = AreaLevel | 'postal'
export type AnalysisUnit = 'people' | 'percent' | 'eur_per_year'

export interface AnalysisObservation {
  level: AnalysisLevel
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

function postalMetric(metric: AnalysisMetric): PostalMetric | null {
  switch (metric) {
    case 'population':
      return 'population'
    case 'employed':
      return 'employed'
    case 'unemployed':
      return 'unemployed'
    case 'students':
      return 'students'
    case 'income':
      return 'income'
    default:
      return null
  }
}

async function fetchPostalMetricDataset(metric: AnalysisMetric): Promise<AnalysisMetricDataset> {
  const collection = await fetchPostalCodeCollection()
  const mappedMetric = postalMetric(metric)
  if (!mappedMetric) {
    return {
      metric,
      unit: 'percent',
      observations: [],
      sourceUrl: collection.sourceUrl,
      sourceLabel: 'Statistics Finland · Paavo',
      note: 'This Paavo snapshot does not expose mother-tongue shares.',
    }
  }

  const unit: AnalysisUnit =
    mappedMetric === 'population'
      ? 'people'
      : mappedMetric === 'income'
        ? 'eur_per_year'
        : 'percent'
  return {
    metric,
    unit,
    observations: collection.areas.flatMap((area): AnalysisObservation[] => {
      const value = postalMetricValue(area, mappedMetric)
      return value === null
        ? []
        : [{ level: 'postal', name: area.code, value, year: area.statisticsYear }]
    }),
    sourceUrl: collection.sourceUrl,
    sourceLabel: `Statistics Finland · Paavo ${collection.releaseYear ?? ''}`.trim(),
    note:
      unit === 'percent'
        ? 'Employment, unemployment and student values are shown as shares of the postal-area population.'
        : undefined,
  }
}

export async function fetchAnalysisMetricDataset(
  metric: AnalysisMetric,
  level: AnalysisLevel,
): Promise<AnalysisMetricDataset> {
  if (level === 'postal') return fetchPostalMetricDataset(metric)

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
      observations: Object.entries(database.areas).flatMap(
        ([name, values]): AnalysisObservation[] => {
          const latest = values.at(-1)
          return latest ? [{ level, name, year: latest[0], value: latest[1] }] : []
        },
      ),
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
